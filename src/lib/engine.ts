import { getField } from "./fields";
import { evaluateExpression, ExpressionResult } from "./expression";
import { effectiveConnector } from "./condition-tree";
import {
  BusinessField,
  BusinessRule,
  Condition,
  ConditionGroup,
  DecisionOutcome,
  Domain,
  ExecutionSettings,
  Operator,
  RuleAction,
  SimulationResult,
  TraceStep,
} from "./types";

export const DEFAULT_EXECUTION_SETTINGS: ExecutionSettings = { conflictResolution: "execute-all" };

export type ScalarValue = string | number | boolean;
export type InputMap = Record<string, ScalarValue | ScalarValue[]>;

// Promotion order — a rule "reaches" Prod by first passing through Dev and
// UAT, so anything already at Prod is also valid to see in a Dev or UAT
// simulation; a Dev-only rule is invisible once you simulate at a higher tier.
// FUTURE: ENV_RANK and isPromotedTo are removed for the demo.
// Restore when environment promotion (Dev → UAT → Prod) is reintroduced.
// const ENV_RANK: Record<RuleEnvironment, number> = { Dev: 0, UAT: 1, Prod: 2 };
// function isPromotedTo(ruleEnv: RuleEnvironment, simulationTier: RuleEnvironment): boolean {
//   return ENV_RANK[ruleEnv] >= ENV_RANK[simulationTier];
// }

function coerceNumber(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

// Ordering-comparison coercion — an ISO-date-shaped string (e.g. from a
// FieldDataType "date" field) is compared as a timestamp instead of falling
// through to coerceNumber, which would truncate "2026-03-01" to just 2026
// and compare wrong for two dates in the same year.
function coerceComparable(v: unknown): number {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const t = Date.parse(v);
    if (!Number.isNaN(t)) return t;
  }
  return coerceNumber(v);
}

function evaluateOperator(
  operator: Operator,
  actual: ScalarValue | undefined,
  expected: string,
  expected2?: string
): boolean {
  if (actual === undefined) return false;
  switch (operator) {
    case "=":
      return String(actual).toLowerCase() === String(expected).toLowerCase();
    case "!=":
      return String(actual).toLowerCase() !== String(expected).toLowerCase();
    case ">":
      return coerceComparable(actual) > coerceComparable(expected);
    case "<":
      return coerceComparable(actual) < coerceComparable(expected);
    case ">=":
      return coerceComparable(actual) >= coerceComparable(expected);
    case "<=":
      return coerceComparable(actual) <= coerceComparable(expected);
    case "contains":
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    case "starts_with":
      return String(actual).toLowerCase().startsWith(String(expected).toLowerCase());
    case "in":
      return expected
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .includes(String(actual).toLowerCase());
    case "between": {
      const n = coerceComparable(actual);
      return n >= coerceComparable(expected) && n <= coerceComparable(expected2 ?? expected);
    }
    default:
      return false;
  }
}

export interface ConditionEvalDetail {
  field: string;
  operator: Operator;
  expected: string;
  actual: string;
  passed: boolean;
}

// Each child joins the accumulated result of its earlier siblings via its own
// `effectiveConnector` (per-child AND/OR/N.A, falling back to the group's
// legacy `logic` when unset) — a strict left-to-right fold, no AND-before-OR
// precedence. N.A. children are still evaluated (so their trace/preview
// details are accurate) but excluded from the fold entirely. When every
// child in a group shares one connector (every rule saved before per-child
// connectors existed), this reduces to exactly the old every()/some() result.
export function evaluateGroup(
  group: ConditionGroup,
  input: InputMap,
  details: ConditionEvalDetail[],
  catalog: BusinessField[] = []
): boolean {
  if (group.children.length === 0) return true;
  let acc: boolean | null = null;
  group.children.forEach((child, i) => {
    const value =
      child.type === "condition"
        ? evaluateConditionLeaf(child, input, details, catalog)
        : evaluateGroup(child, input, details, catalog);
    const connector = effectiveConnector(group, i);
    if (connector === "N.A.") return;
    acc = acc === null ? value : connector === "OR" ? acc || value : acc && value;
  });
  return acc ?? true;
}

function evaluateConditionLeaf(
  cond: Condition,
  input: InputMap,
  details: ConditionEvalDetail[],
  catalog: BusinessField[]
): boolean {
  const raw = input[cond.field];
  // A plain Condition should only ever point at a scalar field — the UI
  // filters field pickers by type — but stay defensive rather than crash if
  // one somehow references a list field.
  const actual = Array.isArray(raw) ? undefined : raw;
  const passed = evaluateOperator(cond.operator, actual, cond.value, cond.value2);
  const field = getField(catalog, cond.field);
  const expectedLabel =
    cond.operator === "between"
      ? `${cond.value} – ${cond.value2}`
      : cond.value;
  details.push({
    field: field?.label ?? cond.field,
    operator: cond.operator,
    expected: expectedLabel,
    actual: actual === undefined ? "—" : String(actual),
    passed,
  });
  return passed;
}

export function evaluateRule(
  rule: BusinessRule,
  input: InputMap,
  catalog: BusinessField[] = [],
  opts: { forceEvaluate?: boolean } = {}
): TraceStep {
  const start = performance.now();
  const details: ConditionEvalDetail[] = [];

  if (rule.status !== "Published" && !opts.forceEvaluate) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      status: "Skipped",
      conditionSummaries: [],
      actionsApplied: [],
      durationMs: 0,
    };
  }

  // A rule's whole condition tree is one unified AND/OR boolean expression —
  // same as a SQL WHERE clause — evaluated in a single pass. (Previously an
  // IF/WHERE split evaluated a subset of top-level conditions as a separate
  // "scope gate" first; that only ever inspected direct children of the root
  // group — nested groups were silently exempt — and it evaluated WHERE and
  // IF as two independent gates ANDed together regardless of the group's own
  // AND/OR toggle, so selecting OR at the top didn't actually mean OR once a
  // condition was tagged WHERE. No seed or template rule used it. Removed.)
  const passed = evaluateGroup(rule.rootGroup, input, details, catalog);
  const durationMs = Math.max(0.1, performance.now() - start);
  const hasElse = !!rule.elseActions?.length;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    priority: rule.priority,
    status: passed ? "Passed" : "Failed",
    conditionSummaries: details.map((d) => ({
      field: d.field,
      operator: d.operator,
      expected: d.expected,
      actual: d.actual,
      passed: d.passed,
    })),
    actionsApplied: passed ? rule.actions : hasElse ? rule.elseActions! : [],
    branch: passed ? "then" : hasElse ? "else" : undefined,
    durationMs,
    sandbox: rule.status !== "Published" && opts.forceEvaluate ? true : undefined,
  };
}

export function outcomeRank(outcome: DecisionOutcome): number {
  if (outcome === "Rejected") return 2;
  if (outcome === "Review Required") return 1;
  return 0;
}

export interface RulesForCaseResult {
  outcome: DecisionOutcome;
  reasonCode: string;
  summary: string;
  calculatedValues: Record<string, string | number>;
  triggeredRules: string[];
  decidingRuleId: string | null;
  trace: TraceStep[];
}

// Shared evaluation core — walks an already-filtered-and-ordered rule list
// applying conflict-resolution + sandbox semantics. Used by runSimulation
// (industry-wide) below and by product-rule-engine.ts's executeRulesByProduct
// (product-mapped subset), so both flows share one source of truth for how a
// case is decided rather than two divergent implementations.
//
// `chainInputs` (default false — runSimulation's call site never passes it,
// so its behavior is byte-for-byte unchanged) makes each rule's Assign
// Value/Calculate outputs visible to every later rule in this same call —
// product-rule-engine.ts's executeRulesByProduct is the only caller that
// opts in, since chaining is scoped to a product's sequenced rule list.
export function runRulesForCase(
  rules: BusinessRule[],
  input: InputMap,
  catalog: BusinessField[] = [],
  sandboxRuleIds: string[] = [],
  executionSettings: ExecutionSettings = DEFAULT_EXECUTION_SETTINGS,
  chainInputs = false
): RulesForCaseResult {
  const trace: TraceStep[] = [];
  let outcome: DecisionOutcome = "Approved";
  let reasonCode = "ELIGIBLE_CUSTOMER";
  let summary = "All applicable rules passed. Application meets policy criteria.";
  const calculatedValues: Record<string, string | number> = {};
  const triggeredRules: string[] = [];
  let decidingRuleId: string | null = null;
  let halted = false;
  let workingInput = input;

  for (const rule of rules) {
    if (halted) {
      trace.push({
        ruleId: rule.id,
        ruleName: rule.name,
        priority: rule.priority,
        status: "Skipped",
        conditionSummaries: [],
        actionsApplied: [],
        durationMs: 0,
      });
      continue;
    }

    // A sandboxed rule under test bypasses both the status gate and the
    // environment gate — the whole point is previewing it regardless of
    // where it's been promoted to. Otherwise a rule only fires once it's
    // Active AND has reached this simulation's environment tier.
    const sandboxed = sandboxRuleIds.includes(rule.id);
    // FUTURE: restore environment gate: sandboxed || (rule.status === "Published" && isPromotedTo(rule.environment, environment))
    const eligible = sandboxed || rule.status === "Published";
    if (!eligible) {
      trace.push({
        ruleId: rule.id,
        ruleName: rule.name,
        priority: rule.priority,
        status: "Not Applicable",
        conditionSummaries: [],
        actionsApplied: [],
        durationMs: 0,
      });
      continue;
    }

    const step = evaluateRule(rule, workingInput, catalog, { forceEvaluate: sandboxed });
    trace.push(step);

    // A rule "fires" if either its THEN or ELSE branch actually ran —
    // step.actionsApplied already holds whichever one applies (see
    // evaluateRule), so this uniformly covers both without branching on status.
    if (step.actionsApplied.length > 0) {
      triggeredRules.push(rule.id);
      const producedValues: Record<string, string | number> = {};
      for (const action of step.actionsApplied) {
        // Calculate's {{field}} expressions resolve against the case's
        // current field values plus every value computed so far in this run
        // (this rule's earlier actions and, when chainInputs is on, earlier
        // rules' outputs already folded into workingInput above).
        const context = { ...workingInput, ...calculatedValues };
        applyAction(action, calculatedValues, context);
        applyAction(action, producedValues, context);
        if (action.type === "Reject") {
          // Reject always wins and halts further evaluation.
          outcome = "Rejected";
          reasonCode = action.reasonCode ?? "POLICY_BREACH";
          summary = action.message ?? `${rule.name} triggered a rejection.`;
          decidingRuleId = rule.id;
          halted = true;
        } else if (action.type === "Approve" && outcomeRank(outcome) === 0) {
          // A later baseline Approve must never downgrade an earlier Review flag.
          outcome = "Approved";
          reasonCode = action.reasonCode ?? "ELIGIBLE_CUSTOMER";
          summary = action.message ?? `${rule.name} confirmed approval eligibility.`;
          decidingRuleId = rule.id;
        } else if (action.type === "Flag for Review") {
          if (outcomeRank(outcome) <= 1) {
            outcome = "Review Required";
            reasonCode = action.reasonCode ?? "MANUAL_REVIEW";
            summary = action.message ?? `${rule.name} flagged this case for manual review.`;
            decidingRuleId = rule.id;
          }
        }
      }
      // "first-match" stops evaluation at the first rule whose IF/ELSE
      // actually fired — the declarative equivalent of a switch/case's break.
      if (executionSettings.conflictResolution === "first-match") {
        halted = true;
      }
      if (Object.keys(producedValues).length > 0) {
        step.producedValues = producedValues;
        if (chainInputs) workingInput = { ...workingInput, ...producedValues };
      }
    }
  }

  return { outcome, reasonCode, summary, calculatedValues, triggeredRules, decidingRuleId, trace };
}

export function runSimulation(
  domain: Domain,
  rules: BusinessRule[],
  input: InputMap,
  catalog: BusinessField[] = [],
  sandboxRuleIds: string[] = [],
  executionSettings: ExecutionSettings = DEFAULT_EXECUTION_SETTINGS
): SimulationResult {
  const start = performance.now();
  const sortDirection = executionSettings.conflictResolution === "lowest-priority" ? -1 : 1;
  const domainRules = rules
    .filter((r) => r.domain === domain && r.simulatable)
    .sort((a, b) => sortDirection * (a.priority - b.priority));

  const core = runRulesForCase(domainRules, input, catalog, sandboxRuleIds, executionSettings);
  const totalDurationMs = Math.max(1, performance.now() - start);
  const sandbox = core.trace.some((t) => t.sandbox);

  return {
    id: `SIM-${Date.now()}`,
    domain,
    ...core,
    input,
    timestamp: new Date().toISOString(),
    totalDurationMs,
    sandbox: sandbox || undefined,
  };
}

// What a Calculate/Assign Value action would set its Output Field to, given
// a resolution context (case fields + values computed so far). Calculate
// treats outputValue as a `{{field}} * 1.05`-style expression (see
// src/lib/expression.ts); Assign Value stays a literal (numeric-coerced only
// when the whole string is a bare number, same as before expressions existed).
export function resolveActionValue(
  action: RuleAction,
  context: InputMap
): ExpressionResult {
  const raw = action.outputValue ?? "";
  if (action.type === "Calculate") return evaluateExpression(raw, context);
  let value: string | number = raw;
  const numeric = coerceNumber(raw);
  if (!Number.isNaN(numeric) && /^[0-9.\-]+$/.test(raw.trim())) {
    value = numeric;
  }
  return { value };
}

// What a "Bracket Lookup" action would set its Output Field to — resolves one
// of several range-based outputs (e.g. credit score bracket → interest rate),
// the branching Calculate's arithmetic-only expression language deliberately
// can't do (no eval, see expression.ts). Returns an empty-value result when
// the bracket field is missing/non-numeric or no bracket matches.
export function resolveBracketValue(action: RuleAction, context: InputMap): ExpressionResult {
  if (!action.bracketField || !action.brackets?.length) return { value: "" };
  const raw = context[action.bracketField];
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (Number.isNaN(n)) return { value: "", error: `Unknown or non-numeric field "${action.bracketField}"` };
  const match = action.brackets.find((b) => n >= b.min && n <= b.max);
  if (!match) return { value: "", error: `No bracket matched ${action.bracketField}=${n}` };
  const numeric = coerceNumber(match.outputValue);
  const value = !Number.isNaN(numeric) && /^[0-9.\-]+$/.test(match.outputValue.trim()) ? numeric : match.outputValue;
  return { value };
}

export function applyAction(
  action: RuleAction,
  calculatedValues: Record<string, string | number>,
  context: InputMap = calculatedValues
) {
  if (action.type === "Calculate" || action.type === "Assign Value") {
    if (action.outputField && action.outputValue !== undefined) {
      calculatedValues[action.outputField] = resolveActionValue(action, context).value;
    }
  } else if (action.type === "Bracket Lookup") {
    if (action.outputField) {
      const resolved = resolveBracketValue(action, context);
      if (!resolved.error && resolved.value !== "") calculatedValues[action.outputField] = resolved.value;
    }
  }
}

// runRuleSetExecution removed — Execution Manager deleted.
// RuleSetStepResult, RuleSetExecutionResult interfaces also removed.
// FUTURE: restore if multi-step Rule Set orchestration is reintroduced.
