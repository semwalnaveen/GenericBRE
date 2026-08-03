import { BusinessField, BusinessRule, ConditionGroup, Domain, RuleAction } from "./types";
import { fieldsForDomain, getField } from "./fields";
import { collectFieldKeys } from "./condition-tree";
import { getGeneratedVariables } from "./rule-chaining";

export type VariableSource = "condition" | "field" | "generated" | "same-rule";

export interface AvailableVariable {
  key: string;
  label: string;
  source: VariableSource;
  /** e.g. rule name for generated variables, or "earlier in this branch" */
  sourceDetail?: string;
}

/** Numeric/string literals from condition leaves — useful as live-preview sample values. */
export function extractSampleValuesFromConditions(group: ConditionGroup): Record<string, string | number> {
  const samples: Record<string, string | number> = {};

  function walk(g: ConditionGroup) {
    for (const c of g.children) {
      if (c.type === "group") {
        walk(c);
        continue;
      }
      if (!c.field || !c.value.trim()) continue;
      if (c.operator === "=" || c.operator === ">=" || c.operator === "<=" || c.operator === ">" || c.operator === "<") {
        const n = parseFloat(c.value);
        samples[c.field] = Number.isNaN(n) ? c.value : n;
      } else if (c.operator === "between" && c.value.trim()) {
        const n = parseFloat(c.value);
        if (!Number.isNaN(n)) samples[c.field] = n;
      }
    }
  }

  walk(group);
  return samples;
}

function defaultSampleForField(field: BusinessField): string | number | boolean {
  switch (field.type) {
    case "number":
    case "currency":
    case "percentage":
      return field.type === "currency" ? 500000 : field.type === "percentage" ? 50 : 100;
    case "boolean":
      return true;
    case "enum":
      return field.options?.[0] ?? "";
    default:
      return "";
  }
}

/** All variables a Calculate expression may reference in the Action Builder. */
export function getAvailableVariables({
  fieldCatalog,
  domain,
  rules,
  currentRuleId,
  rootGroup,
  priorActions = [],
}: {
  fieldCatalog: BusinessField[];
  domain: Domain;
  rules: BusinessRule[];
  currentRuleId?: string;
  rootGroup?: ConditionGroup;
  priorActions?: RuleAction[];
}): AvailableVariable[] {
  const seen = new Set<string>();
  const out: AvailableVariable[] = [];

  const add = (v: AvailableVariable) => {
    if (seen.has(v.key)) return;
    seen.add(v.key);
    out.push(v);
  };

  const conditionKeys = rootGroup ? collectFieldKeys(rootGroup) : new Set<string>();
  for (const key of conditionKeys) {
    const field = getField(fieldCatalog, key);
    add({
      key,
      label: field?.label ?? key,
      source: "condition",
      sourceDetail: "used in IF conditions",
    });
  }

  for (const f of fieldsForDomain(fieldCatalog, domain)) {
    add({ key: f.key, label: f.label, source: "field" });
  }

  for (const v of getGeneratedVariables(rules, currentRuleId)) {
    const field = getField(fieldCatalog, v.key);
    add({
      key: v.key,
      label: field?.label ?? v.key,
      source: "generated",
      sourceDetail: v.sourceRuleName,
    });
  }

  for (const action of priorActions) {
    if ((action.type === "Calculate" || action.type === "Assign Value") && action.outputField) {
      const field = getField(fieldCatalog, action.outputField);
      add({
        key: action.outputField,
        label: field?.label ?? action.outputField,
        source: "same-rule",
        sourceDetail: "earlier in this branch",
      });
    }
  }

  return out;
}

export function availableVariableKeys(variables: AvailableVariable[]): Set<string> {
  return new Set(variables.map((v) => v.key));
}

/** Default preview context: condition literals, then field-type defaults. */
export function buildDefaultPreviewContext(
  fieldCatalog: BusinessField[],
  variables: AvailableVariable[],
  rootGroup?: ConditionGroup
): Record<string, string | number | boolean> {
  const context: Record<string, string | number | boolean> = {};
  if (rootGroup) Object.assign(context, extractSampleValuesFromConditions(rootGroup));
  for (const v of variables) {
    if (context[v.key] !== undefined) continue;
    const field = getField(fieldCatalog, v.key);
    if (field) context[v.key] = defaultSampleForField(field);
    else if (v.source === "same-rule" || v.source === "generated") context[v.key] = 0;
  }
  return context;
}
