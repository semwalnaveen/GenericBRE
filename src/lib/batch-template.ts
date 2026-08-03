import { BusinessField, BusinessRule, FieldDataType, Product, ProductRuleMapping } from "./types";
import { getMappedRules } from "./product-rule-engine";
import { collectFieldKeys } from "./condition-tree";
import { extractVariableKeys } from "./expression";
import { getField } from "./fields";
import { CellScalar } from "./xlsx-io";

// A single input column for a product's Batch Testing template — one row of
// this per real, enterable field the product's mapped rules require. Shares
// its field-resolution logic with buildTemplateJson (simulator-json.ts) so
// the Excel template and the single-record Simulator's sample JSON can never
// drift apart: same product, same rules, same field set.
export interface BatchColumn {
  key: string;
  label: string;
  type: FieldDataType;
  options?: string[];
  unit?: string;
  required: boolean;
}

// Every non-computed field referenced by a product's mapped rules' conditions
// (plus any {{field}} a Calculate action reads) — identical derivation to
// buildTemplateJson, just resolved into typed column metadata instead of a
// sample JSON payload.
export function getBatchColumns(
  product: Product,
  rules: BusinessRule[],
  mappings: ProductRuleMapping[],
  fieldCatalog: BusinessField[]
): BatchColumn[] {
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

  const columns: BatchColumn[] = [];
  for (const key of keys) {
    const field = getField(fieldCatalog, key);
    if (!field || field.computed) continue;
    columns.push({
      key: field.key,
      label: field.label,
      type: field.type,
      options: field.options,
      unit: field.unit,
      // Every field a mapped rule's condition tree references is required —
      // there's no per-field "optional" concept in this engine (a missing
      // value simply fails that condition, see engine.ts's evaluateConditionLeaf).
      required: true,
    });
  }
  return columns.sort((a, b) => a.label.localeCompare(b.label));
}

function exampleValueFor(column: BatchColumn): CellScalar {
  switch (column.type) {
    case "number":
    case "currency":
    case "percentage":
      return 0;
    case "boolean":
      return true;
    case "enum":
      return column.options?.[0] ?? "";
    case "date":
      return new Date().toISOString().slice(0, 10);
    default:
      return "";
  }
}

export function buildSampleRow(columns: BatchColumn[]): CellScalar[] {
  return columns.map(exampleValueFor);
}

// "Customer ID" is always the first template column — Batch Testing needs a
// stable per-row identifier for the Results Grid/report even though the
// execution engine itself never reads it (see product-rule-engine.ts).
export const CUSTOMER_ID_COLUMN: BatchColumn = {
  key: "customer_id",
  label: "Customer ID",
  type: "string",
  required: false,
};

export function getTemplateColumns(
  product: Product,
  rules: BusinessRule[],
  mappings: ProductRuleMapping[],
  fieldCatalog: BusinessField[]
): BatchColumn[] {
  return [CUSTOMER_ID_COLUMN, ...getBatchColumns(product, rules, mappings, fieldCatalog)];
}
