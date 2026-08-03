import { BusinessRule } from "./types";
import { collectFieldKeys, collectRuleDependencies } from "./condition-tree";

// Rule Chaining as a global variable registry — any rule's Assign
// Value/Calculate output is available to every other rule as a selectable
// "Generated Variable", independent of Rule Group/sequence (that authoring
// concept is gone; real execution order is decided later, per-Product, by
// ProductRuleMapping.order — see product-rule-engine.ts). Rule Builder only
// needs to know "what variables exist and where a name would create a
// cycle," not "in what order do they run."

export interface RuleVariable {
  key: string; // matches a RuleAction.outputField
  sourceRuleId: string;
  sourceRuleName: string;
}

// Every Assign Value/Calculate action's outputField, from every rule except
// the one being edited — this is the whole chaining data model: a derived
// view over the existing RuleAction.outputField, no new type.
export function getGeneratedVariables(rules: BusinessRule[], excludeRuleId?: string): RuleVariable[] {
  const variables: RuleVariable[] = [];
  const seen = new Set<string>();
  for (const r of rules) {
    if (r.id === excludeRuleId) continue;
    for (const action of [...r.actions, ...(r.elseActions ?? [])]) {
      const outKey = action.outputTarget === "RUNTIME_VARIABLE" ? action.outputVariable : action.outputField;
      if ((action.type === "Assign Value" || action.type === "Calculate" || action.type === "Bracket Lookup") && outKey && !seen.has(outKey)) {
        seen.add(outKey);
        variables.push({ key: outKey, sourceRuleId: r.id, sourceRuleName: r.name });
      }
    }
  }
  return variables;
}

export interface CircularDependency {
  cycle: string[]; // rule ids forming the cycle, in order
}

// Defense-in-depth: since a variable's "availability" is no longer gated by
// sequence, nothing structurally prevents Rule A from reading Rule B's
// output while Rule B also reads Rule A's — a genuine problem regardless of
// what order they're later mapped to run in. Builds a "rule X reads rule Y's
// output" dependency graph from field references and DFS-checks for cycles,
// over the whole rule set. Callers substitute the in-progress draft for its
// old saved version in `rules` before calling, so this needs no rule-id
// parameter of its own.
export function detectCircularDependency(rules: BusinessRule[]): CircularDependency | null {
  const outputToRule = new Map<string, string>(); // outputField -> ruleId
  for (const r of rules) {
    for (const action of [...r.actions, ...(r.elseActions ?? [])]) {
      if ((action.type === "Assign Value" || action.type === "Calculate" || action.type === "Bracket Lookup") && action.outputField) {
        outputToRule.set(action.outputField, r.id);
      }
    }
  }

  const edges = new Map<string, Set<string>>(); // ruleId -> ruleIds it depends on
  for (const r of rules) {
    const deps = new Set<string>();
    
    // Explicit dependencies mapped in Condition Builder (sourceType === "RULE_OUTPUT")
    for (const explicitDep of collectRuleDependencies(r.rootGroup)) {
      if (explicitDep !== r.id) deps.add(explicitDep);
    }
    
    // Legacy support: If a field is used that doesn't have a sourceType, but we can infer 
    // it was meant to be a rule output (because it's not a standard Business Field), 
    // we could add it. However, since we don't have the field catalog here, and the prompt 
    // strictly demands "The dependency engine must use these identifiers instead of matching 
    // only on display names", we will migrate to strict explicit dependency tracking.
    edges.set(r.id, deps);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>(rules.map((r) => [r.id, WHITE]));
  let foundCycle: string[] | null = null;

  function dfs(id: string, path: string[]): boolean {
    color.set(id, GRAY);
    path.push(id);
    for (const dep of edges.get(id) ?? []) {
      if (color.get(dep) === GRAY) {
        foundCycle = [...path.slice(path.indexOf(dep)), dep];
        return true;
      }
      if (color.get(dep) === WHITE && dfs(dep, path)) return true;
    }
    path.pop();
    color.set(id, BLACK);
    return false;
  }

  for (const r of rules) {
    if (color.get(r.id) === WHITE && dfs(r.id, [])) {
      return { cycle: foundCycle! };
    }
  }
  return null;
}
