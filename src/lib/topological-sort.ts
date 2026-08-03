import { BusinessRule } from "./types";
import { collectRuleDependencies } from "./condition-tree";

/**
 * Performs a topological sort of Business Rules based on their data dependencies.
 * If Rule B reads a variable produced by Rule A, Rule A is guaranteed to appear
 * before Rule B in the returned array.
 * 
 * In the event of a circular dependency (which should be blocked by the UI),
 * the algorithm breaks the cycle gracefully and relies on the original ordering.
 */
export function topologicalSortRules(rules: BusinessRule[]): BusinessRule[] {
  if (rules.length <= 1) return rules;

  const ruleMap = new Map<string, BusinessRule>();
  const edges = new Map<string, Set<string>>(); // ruleId -> depends on these ruleIds

  for (const r of rules) {
    ruleMap.set(r.id, r);
    const deps = new Set<string>();
    for (const explicitDep of collectRuleDependencies(r.rootGroup)) {
      if (explicitDep !== r.id) deps.add(explicitDep);
    }
    edges.set(r.id, deps);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>(rules.map((r) => [r.id, WHITE]));
  const result: BusinessRule[] = [];

  function dfs(id: string) {
    const c = color.get(id) ?? WHITE;
    if (c === BLACK) return;
    if (c === GRAY) return; // Cycle detected, ignore and break cycle gracefully

    color.set(id, GRAY);
    const deps = edges.get(id);
    if (deps) {
      for (const dep of deps) {
        // Only consider dependencies that are actually in this specific rule set
        if (ruleMap.has(dep)) {
          dfs(dep);
        }
      }
    }
    color.set(id, BLACK);
    const rule = ruleMap.get(id);
    if (rule) {
      result.push(rule);
    }
  }

  // We iterate through the original array to preserve the original sorting order
  // as much as possible for rules that do not have inter-dependencies.
  for (const r of rules) {
    if (color.get(r.id) === WHITE) {
      dfs(r.id);
    }
  }

  return result;
}
