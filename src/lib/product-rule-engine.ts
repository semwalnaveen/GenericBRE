import { BusinessField, BusinessRule, ExecutionSettings, Product, ProductRuleMapping, SimulationResult } from "./types";
import { DEFAULT_EXECUTION_SETTINGS, InputMap, runRulesForCase } from "./engine";
import { topologicalSortRules } from "./topological-sort";

// Every rule currently mapped to a product (mapping.active only), ordered by
// the mapping's `order` (the Rule Sequencer for product execution — see
// product-rule-mapping-manager.tsx's drag-reorder) with rule priority as a
// tiebreaker/fallback for any legacy mapping predating `order`. Used for
// display (mapping manager counts, Simulator's KPI cards/matched-rules chip)
// as well as the execution path below, which narrows further.
export function getMappedRules(
  productId: string,
  allRules: BusinessRule[],
  mappings: ProductRuleMapping[]
): BusinessRule[] {
  const relevant = mappings.filter((m) => m.productId === productId && m.active);
  const orderByRuleId = new Map(relevant.map((m) => [m.ruleId, m.order]));
  const ruleIds = new Set(relevant.map((m) => m.ruleId));
  // Dedupe by rule id — persisted stores can accumulate a duplicate rule
  // object with the same id (e.g. from an older import/migration), and without
  // this guard the same rule would render twice (duplicate React key) and be
  // evaluated twice by the engine. Keep the first occurrence only.
  const seen = new Set<string>();
  const sortedByPriority = allRules
    .filter((r) => {
      if (!ruleIds.has(r.id) || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .sort((a, b) => {
      const oa = orderByRuleId.get(a.id);
      const ob = orderByRuleId.get(b.id);
      if (oa !== undefined && ob !== undefined) return oa - ob;
      if (oa !== undefined) return -1;
      if (ob !== undefined) return 1;
      return a.priority - b.priority;
    });

  return topologicalSortRules(sortedByPriority);
}

export interface ProductExecutionResult {
  ok: boolean;
  reason?: string;
  result?: SimulationResult;
}

// The single execution entry point Product-Rule Mapping replaces Execution
// Manager with: identify the product, fetch only its mapped rules, run them.
// Any payload field a mapped rule doesn't reference is simply never read —
// no special null/unused-field handling needed (see evaluateConditionLeaf in
// engine.ts, which already treats a missing input key as `undefined` and
// fails that condition rather than throwing).
export function executeRulesByProduct(
  product: Product | undefined,
  allRules: BusinessRule[],
  mappings: ProductRuleMapping[],
  payload: InputMap,
  catalog: BusinessField[] = [],
  sandboxRuleIds: string[] = [],
  executionSettings: ExecutionSettings = DEFAULT_EXECUTION_SETTINGS
): ProductExecutionResult {
  if (!product) return { ok: false, reason: "Unknown product." };
  if (product.status !== "Active") return { ok: false, reason: `Product "${product.name}" is inactive.` };

  const start = performance.now();
  // Already ordered by the Rule Sequencer (ProductRuleMapping.order, falling
  // back to priority) — deliberately NOT re-sorted by priority here, since
  // that would silently discard the configured execution sequence.
  const mappedRules = getMappedRules(product.id, allRules, mappings).filter((r) => r.simulatable);

  if (mappedRules.length === 0) {
    return {
      ok: true,
      result: {
        id: `SIM-${Date.now()}`,
        domain: product.domain,
        productId: product.id,
        outcome: "Approved",
        reasonCode: "NO_RULES_MAPPED",
        summary: `No rules are currently mapped to "${product.name}" — nothing to evaluate.`,
        calculatedValues: {},
        triggeredRules: [],
        decidingRuleId: null,
        trace: [],
        input: payload,
        timestamp: new Date().toISOString(),
        totalDurationMs: Math.max(1, performance.now() - start),
      },
    };
  }

  const core = runRulesForCase(mappedRules, payload, catalog, sandboxRuleIds, executionSettings, true);
  const totalDurationMs = Math.max(1, performance.now() - start);
  const sandbox = core.trace.some((t) => t.sandbox);

  return {
    ok: true,
    result: {
      id: `SIM-${Date.now()}`,
      domain: product.domain,
      productId: product.id,
      ...core,
      input: payload,
      timestamp: new Date().toISOString(),
      totalDurationMs,
      sandbox: sandbox || undefined,
    },
  };
}
