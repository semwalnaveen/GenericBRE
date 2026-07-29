import { BusinessRule, Condition, ConditionGroup } from "./types";

export function flattenConditions(node: ConditionGroup, out: Condition[] = []): Condition[] {
  for (const child of node.children) {
    if (child.type === "condition") out.push(child);
    else if (child.type === "group") flattenConditions(child, out);
  }
  return out;
}

function coerceNumber(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}

const RANGE_OPERATORS = new Set([">", "<", ">=", "<=", "between"]);

function rangeOf(cond: Condition): [number, number] | null {
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

// outputField -> outputValue pairs from a rule's Calculate/Assign Value
// actions — the "who last wrote this variable" side of Rule Chaining that
// pairConflicts didn't check at all (only Approve/Reject opposition).
function writtenFields(rule: BusinessRule): Map<string, string> {
  const out = new Map<string, string>();
  for (const a of rule.actions) {
    if ((a.type === "Calculate" || a.type === "Assign Value") && a.outputField) {
      out.set(a.outputField, a.outputValue ?? "");
    }
  }
  return out;
}

export interface RuleConflict {
  ruleAId: string;
  ruleBId: string;
  field: string;
  reason: string;
}

// Shared by both detectRuleConflicts (Active-vs-Active sweep) and
// detectConflictsForCandidate (candidate-vs-Active, run before approval) —
// same conservative "opposed outcome on an overlapping field" logic either way.
function pairConflicts(a: BusinessRule, b: BusinessRule): RuleConflict[] {
  const out: RuleConflict[] = [];
  if (a.domain !== b.domain) return out;

  const aConds = flattenConditions(a.rootGroup);
  const bConds = flattenConditions(b.rootGroup);
  // A field two rules both condition on, with equal or overlapping values —
  // the shared prerequisite both the Approve/Reject check and the output-
  // field-collision check below need before flagging anything, so an input
  // that plausibly triggers both rules is what's actually being compared.
  const sharedFieldMatches: { field: string; ac: Condition; bc: Condition }[] = [];
  for (const ac of aConds) {
    for (const bc of bConds) {
      if (ac.field !== bc.field || !ac.field) continue;
      if (ac.operator === "=" && bc.operator === "=" && ac.value === bc.value) {
        sharedFieldMatches.push({ field: ac.field, ac, bc });
        continue;
      }
      const aRange = rangeOf(ac);
      const bRange = rangeOf(bc);
      if (aRange && bRange && rangesOverlap(aRange, bRange)) sharedFieldMatches.push({ field: ac.field, ac, bc });
    }
  }
  if (sharedFieldMatches.length === 0) return out;

  const aApprove = hasActionType(a, "Approve");
  const aReject = hasActionType(a, "Reject");
  const bApprove = hasActionType(b, "Approve");
  const bReject = hasActionType(b, "Reject");
  const opposedPolarity = (aApprove && bReject) || (aReject && bApprove);

  if (opposedPolarity) {
    for (const { field, ac, bc } of sharedFieldMatches) {
      if (ac.operator === "=" && bc.operator === "=") {
        out.push({
          ruleAId: a.id,
          ruleBId: b.id,
          field,
          reason: `Both rules match ${field} = "${ac.value}" but drive opposite outcomes (Approve vs Reject).`,
        });
      } else {
        out.push({
          ruleAId: a.id,
          ruleBId: b.id,
          field,
          reason: `Overlapping thresholds on ${field} (${ac.operator} ${ac.value} vs ${bc.operator} ${bc.value}) drive opposite outcomes.`,
        });
      }
    }
  }

  // Rule Chaining hazard: two rules that can both fire for the same input
  // (they share an overlapping condition, just proven above) and both write
  // the same outputField with a different value — a silent last-write-wins
  // that execution order alone decides, invisible to maker-checker review
  // without this (audit finding B28).
  const aWrites = writtenFields(a);
  const bWrites = writtenFields(b);
  for (const [field, aValue] of aWrites) {
    const bValue = bWrites.get(field);
    if (bValue !== undefined && bValue !== aValue) {
      out.push({
        ruleAId: a.id,
        ruleBId: b.id,
        field,
        reason: `Both rules can fire for the same input and both write "${field}" — ${a.id} sets it to "${aValue}", ${b.id} sets it to "${bValue}". Execution order decides which one wins.`,
      });
    }
  }

  return out;
}

// Only rule pairs that share a domain AND at least one conditioned field can
// ever produce a conflict (pairConflicts requires both) — bucketing by
// "domain::field" first turns the blind O(n^2) sweep over every Active rule
// into one over just the rules that could plausibly collide, which is the
// overwhelming majority-skip case once the rule catalog reaches the
// thousands-of-rules scale this was auditing for (finding B27).
function candidatePairs(active: BusinessRule[]): [BusinessRule, BusinessRule][] {
  const byBucket = new Map<string, BusinessRule[]>();
  for (const rule of active) {
    const fields = new Set(flattenConditions(rule.rootGroup).map((c) => c.field).filter(Boolean));
    for (const field of fields) {
      const key = `${rule.domain}::${field}`;
      const bucket = byBucket.get(key);
      if (bucket) bucket.push(rule);
      else byBucket.set(key, [rule]);
    }
  }

  const seenPairs = new Set<string>();
  const pairs: [BusinessRule, BusinessRule][] = [];
  for (const bucket of byBucket.values()) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const key = bucket[i].id < bucket[j].id ? `${bucket[i].id}|${bucket[j].id}` : `${bucket[j].id}|${bucket[i].id}`;
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        pairs.push([bucket[i], bucket[j]]);
      }
    }
  }
  return pairs;
}

// A deliberately conservative, explainable check: flags pairs of Active rules
// in the same industry that both evaluate the same field and would drive
// opposite terminal actions (Approve vs Reject) for an overlapping — or
// identical — input value. This is advisory ("possible conflict, please
// review"), not a hard validation error, since two rules can legitimately
// reference the same field without truly conflicting.
export function detectRuleConflicts(rules: BusinessRule[]): RuleConflict[] {
  const active = rules.filter((r) => r.status === "Published" && r.simulatable !== false);
  const conflicts: RuleConflict[] = [];

  for (const [a, b] of candidatePairs(active)) {
    conflicts.push(...pairConflicts(a, b));
  }

  return conflicts;
}

// Checks a single candidate rule (typically still Testing, about to be
// approved) against the current Active set, as if it were already live —
// so a reviewer sees the same signal before publishing, not only afterward
// on the Repository's reactive banner.
export function detectConflictsForCandidate(candidate: BusinessRule, rules: BusinessRule[]): RuleConflict[] {
  if (candidate.simulatable === false) return [];
  const active = rules.filter((r) => r.status === "Published" && r.simulatable !== false && r.id !== candidate.id);
  const conflicts: RuleConflict[] = [];
  for (const other of active) {
    conflicts.push(...pairConflicts(candidate, other));
  }
  return conflicts;
}
