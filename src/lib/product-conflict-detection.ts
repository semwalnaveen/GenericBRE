import { BusinessRule, ProductRuleMapping } from "./types";
import { flattenConditions } from "./conflict-detection";

export type ProductConflictSeverity = "Critical" | "Medium";
export type ProductConflictKind = "contradictory-decision" | "duplicate-logic" | "duplicate-mapping";

export type DuplicateKind = "duplicate-mapping" | "duplicate-logic";

export interface DuplicateFinding {
  kind: string;
  ruleIds: string[];
  reason: string;
  recommendation: string;
}

export interface ProductConflictFinding {
  severity: ProductConflictSeverity;
  kind: ProductConflictKind;
  ruleAId: string;
  ruleBId: string;
  ruleAName?: string;
  ruleBName?: string;
  field?: string;
  conditionA?: string;
  conditionB?: string;
  decisionA?: string;
  decisionB?: string;
  reason: string;
  recommendation: string;
}

function coerceNumber(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}

const RANGE_OPERATORS = new Set([">", "<", ">=", "<=", "between"]);

function rangeOf(cond: { operator: string; value: string; value2?: string }): [number, number] | null {
  if (!RANGE_OPERATORS.has(cond.operator)) return null;
  const v = coerceNumber(cond.value);
  if (Number.isNaN(v)) return null;
  switch (cond.operator) {
    case ">":
    case ">=":
      return [v, Infinity];
    case "<":
    case "<=":
      return [-Infinity, v];
    case "between": {
      const v2 = coerceNumber(cond.value2 ?? "");
      return Number.isNaN(v2) ? null : [Math.min(v, v2), Math.max(v, v2)];
    }
    default:
      return null;
  }
}

function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] <= b[1] && b[0] <= a[1];
}

function hasActionType(rule: BusinessRule, type: "Approve" | "Reject"): boolean {
  return rule.actions.some((a) => a.type === type);
}

function logicSignature(rule: BusinessRule): string | null {
  if (rule.caseWhens && rule.caseWhens.length > 0) return null;
  const conds = flattenConditions(rule.rootGroup)
    .map((c) => `${c.field}|${c.operator}|${c.value}|${c.value2 ?? ""}`)
    .sort();
  const act = (a: BusinessRule["actions"][number]) =>
    `${a.type}|${a.outputField ?? ""}|${a.outputValue ?? ""}|${a.reasonCode ?? ""}`;
  const actions = rule.actions.map(act).sort();
  const elseActions = (rule.elseActions ?? []).map(act).sort();
  return JSON.stringify({ conds, actions, elseActions });
}

/**
 * Product-scoped Conflict Detection:
 * Analyzes only the rules mapped to a specific product for:
 * 1. CRITICAL CONFLICTS (Contradictory Decisions): Opposing terminal outcomes (Approve vs Reject) on overlapping input conditions.
 * 2. MEDIUM WARNINGS (Duplicate Rules): Identical condition and action signatures across distinct mapped rules.
 */
export function detectProductRuleConflicts(
  productId: string,
  rules: BusinessRule[],
  mappings: ProductRuleMapping[]
): ProductConflictFinding[] {
  const findings: ProductConflictFinding[] = [];
  const ruleById = new Map(rules.map((r) => [r.id, r]));
  const activeMappedRuleIds = Array.from(
    new Set(mappings.filter((m) => m.productId === productId && m.active !== false).map((m) => m.ruleId))
  );
  const mappedRules = activeMappedRuleIds.map((id) => ruleById.get(id)).filter((r): r is BusinessRule => !!r);

  // 1. Detect CRITICAL CONFLICTS (Contradictory Decisions on same/overlapping conditions)
  for (let i = 0; i < mappedRules.length; i++) {
    for (let j = i + 1; j < mappedRules.length; j++) {
      const a = mappedRules[i];
      const b = mappedRules[j];

      const aConds = flattenConditions(a.rootGroup);
      const bConds = flattenConditions(b.rootGroup);

      const sharedFieldMatches = [];
      for (const ac of aConds) {
        for (const bc of bConds) {
          if (!ac.field || ac.field !== bc.field) continue;
          if (ac.operator === "=" && bc.operator === "=" && ac.value === bc.value) {
            sharedFieldMatches.push({ field: ac.field, ac, bc });
            continue;
          }
          const aRange = rangeOf(ac);
          const bRange = rangeOf(bc);
          if (aRange && bRange && rangesOverlap(aRange, bRange)) {
            sharedFieldMatches.push({ field: ac.field, ac, bc });
          }
        }
      }

      if (sharedFieldMatches.length === 0) continue;

      const aApprove = hasActionType(a, "Approve");
      const aReject = hasActionType(a, "Reject");
      const bApprove = hasActionType(b, "Approve");
      const bReject = hasActionType(b, "Reject");
      const opposedPolarity = (aApprove && bReject) || (aReject && bApprove);

      if (opposedPolarity) {
        for (const { field, ac, bc } of sharedFieldMatches) {
          const decisionA = aApprove ? "Eligible / Approve" : "Reject";
          const decisionB = bApprove ? "Eligible / Approve" : "Reject";
          const conditionStr = `${field} ${ac.operator} ${ac.value}`;

          findings.push({
            severity: "Critical",
            kind: "contradictory-decision",
            ruleAId: a.id,
            ruleBId: b.id,
            ruleAName: a.name,
            ruleBName: b.name,
            field,
            conditionA: `${ac.field} ${ac.operator} ${ac.value}`,
            conditionB: `${bc.field} ${bc.operator} ${bc.value}`,
            decisionA,
            decisionB,
            reason: `Same/overlapping condition (${conditionStr}) produces opposite outcomes (${decisionA} vs ${decisionB}).`,
            recommendation: "Modify condition thresholds or remove/disable one of the conflicting rules.",
          });
        }
      }
    }
  }

  // 2. Detect MEDIUM WARNINGS (Duplicate Rules - Identical Logic)
  const bySignature = new Map<string, string[]>();
  for (const rule of mappedRules) {
    const sig = logicSignature(rule);
    if (!sig) continue;
    const bucket = bySignature.get(sig);
    if (bucket) bucket.push(rule.id);
    else bySignature.set(sig, [rule.id]);
  }

  for (const ids of bySignature.values()) {
    if (ids.length > 1) {
      const ruleA = ruleById.get(ids[0]);
      const ruleB = ruleById.get(ids[1]);
      findings.push({
        severity: "Medium",
        kind: "duplicate-logic",
        ruleAId: ids[0],
        ruleBId: ids[1],
        ruleAName: ruleA?.name,
        ruleBName: ruleB?.name,
        reason: `Rules ${ids.join(" and ")} have identical conditions and actions (Duplicate Rule).`,
        recommendation: "Merge these duplicate rules into a single rule to avoid redundant evaluations.",
      });
    }
  }

  return findings;
}

/**
 * Legacy compatibility export — maps findings to duplicate findings format
 */
export function findDuplicateRules(
  productId: string,
  rules: BusinessRule[],
  mappings: ProductRuleMapping[]
) {
  const conflicts = detectProductRuleConflicts(productId, rules, mappings);
  return conflicts
    .filter((c) => c.kind === "duplicate-logic" || c.kind === "duplicate-mapping")
    .map((c) => ({
      kind: c.kind,
      ruleIds: [c.ruleAId, c.ruleBId],
      reason: c.reason,
      recommendation: c.recommendation,
    }));
}
