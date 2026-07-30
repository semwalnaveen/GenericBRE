import { BusinessField, BusinessRule, DecisionResult, Product, ProductRuleMapping, TraceStep } from "./types";
import { getMappedRules } from "./product-rule-engine";
import { collectFieldKeys } from "./condition-tree";
import { buildSampleRequestJson } from "./sample-json";
import { extractVariableKeys } from "./expression";

// Single source of truth for "what does this product's request/response
// shape look like" — used by both the Rule Simulator and the JSON Mapping
// manager so the two surfaces can never drift out of sync, and so neither
// one needs a completed simulation run just to show the contract shape.

// Panel 1 — Template JSON, also reused by JSON Mapping's request-mapping
// auto-generation. Every non-computed field referenced by the product's
// mapped rules' conditions, PLUS any `{{field}}` a Calculate action reads
// (e.g. Rule 4's approved_amount = {{loan_amount}} — a real request input
// even though it never appears in a condition) — computed/intermediate
// fields like applicant_eligible are correctly excluded either way by
// buildSampleRequestJson.
export function buildTemplateJson(
  product: Product,
  rules: BusinessRule[],
  mappings: ProductRuleMapping[],
  fieldCatalog: BusinessField[]
): Record<string, string | number | boolean> {
  const mappedRules = getMappedRules(product.id, rules, mappings);
  const keys = new Set<string>();
  for (const r of mappedRules) {
    collectFieldKeys(r.rootGroup).forEach((k) => keys.add(k));
    for (const action of [...r.actions, ...(r.elseActions ?? [])]) {
      if (action.type === "Calculate" && action.outputValue) {
        extractVariableKeys(action.outputValue).forEach((k) => keys.add(k));
      }
    }
  }
  return {
    productCode: product.code,
    ...buildSampleRequestJson(fieldCatalog, Array.from(keys))
  };
}

// Panel 2 — API Request envelope, a pure wrap of whatever Template JSON
// currently contains (edited or not) — never independently editable.
export function buildApiRequestEnvelope(
  product: Product,
  templateJson: Record<string, unknown>,
  executionMode: string = "Simulation"
): Record<string, unknown> {
  return {
    requestId: `REQ-${product.code}-${Date.now()}`,
    product: product.name,
    ruleGroup: product.id,
    executionMode,
    payload: templateJson,
  };
}

export interface RuleExecutionEntry {
  sequence: number;
  ruleId: string;
  ruleName: string;
  ruleType: string;
  status: "" | "PASS" | "FAIL" | "SKIPPED" | "N/A";
  output: Record<string, string | number | boolean>;
}

export interface SimulatorResponseShape {
  status: string;
  product: string;
  decision: string;
  approvedAmount: number | null;
  interestRate: number | null;
  ruleExecution: RuleExecutionEntry[];
}

// Panel 3, pre-run — the full contract shape with every mapped rule present
// but empty, generated the instant a product is selected (no Run required).
export function buildResponseShapePreview(
  product: Product,
  rules: BusinessRule[],
  mappings: ProductRuleMapping[]
): SimulatorResponseShape {
  const mappedRules = getMappedRules(product.id, rules, mappings);
  return {
    status: "",
    product: product.name,
    decision: "",
    approvedAmount: null,
    interestRate: null,
    ruleExecution: mappedRules.map((r, i) => ({
      sequence: i + 1,
      ruleId: r.id,
      ruleName: r.name,
      ruleType: r.ruleType ?? "IF",
      status: "",
      output: {},
    })),
  };
}

const STEP_STATUS_MAP: Record<TraceStep["status"], RuleExecutionEntry["status"]> = {
  Passed: "PASS",
  Failed: "FAIL",
  Skipped: "SKIPPED",
  "Not Applicable": "N/A",
};

// Panel 3, post-run — the SAME shape, populated in place from a real
// DecisionResult.
export function buildResponseShapeFromResult(
  product: Product,
  rules: BusinessRule[],
  mappings: ProductRuleMapping[],
  result: DecisionResult
): SimulatorResponseShape {
  const mappedRules = getMappedRules(product.id, rules, mappings);
  const traceByRuleId = new Map(result.flatTrace.map((t) => [t.ruleId, t]));
  const interestRateRaw = result.calculatedValues.interest_rate;
  const approvedAmountRaw = result.calculatedValues.approved_amount;
  return {
    status: "SUCCESS",
    product: product.name,
    decision: String(result.calculatedValues.loan_decision ?? result.outcome.toUpperCase()),
    approvedAmount: approvedAmountRaw !== undefined ? Number(approvedAmountRaw) : null,
    interestRate: interestRateRaw !== undefined ? Number(interestRateRaw) : null,
    ruleExecution: mappedRules.map((r, i) => {
      const step = traceByRuleId.get(r.id);
      return {
        sequence: i + 1,
        ruleId: r.id,
        ruleName: r.name,
        ruleType: r.ruleType ?? "IF",
        status: step ? STEP_STATUS_MAP[step.status] : "",
        output: { ...(step?.producedValues ?? {}) },
      };
    }),
  };
}
