import { BusinessField } from "./types";
import { getField } from "./fields";

// A realistic-shaped placeholder per field type — good enough to show the
// payload's shape, not a valid business scenario.
function sampleValueFor(field: BusinessField): string | number | boolean {
  switch (field.type) {
    case "number":
    case "currency":
    case "percentage":
      return "";
    case "boolean":
      return false;
    case "enum":
      return field.options?.[0] ?? "";
    default:
      return "";
  }
}

// Builds a sample request JSON payload from every BusinessField referenced by
// `fieldKeys` (gathered via condition-tree.ts's collectFieldKeys, unioned
// across a Rule Group's rules) — the fields an incoming API request would
// actually need for this group's rules to evaluate. Computed fields (derived,
// never entered directly) are excluded, same convention DynamicForm follows.
export function buildSampleRequestJson(fieldCatalog: BusinessField[], fieldKeys: string[]): Record<string, string | number | boolean> {
  const payload: Record<string, string | number | boolean> = {};
  for (const key of fieldKeys) {
    const field = getField(fieldCatalog, key);
    if (!field || field.computed) continue;
    payload[key] = sampleValueFor(field);
  }
  return payload;
}
