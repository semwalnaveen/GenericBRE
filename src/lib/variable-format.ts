import { BusinessRule, FieldDataType } from "./types";

// Resolves a calculated/generated variable's declared Return Type by finding
// the Calculate/Assign Value/Bracket Lookup action that produces it (see
// rule-chaining.ts's getGeneratedVariables, which this mirrors) — lets the
// Simulator/trace views format a value the same way its authoring Return
// Type dropdown (action-editor.tsx's OUTPUT_TYPES) describes it, without
// threading type info through TraceStep/SimulationResult themselves.
export function getOutputTypeForKey(rules: BusinessRule[], key: string): FieldDataType | undefined {
  for (const r of rules) {
    for (const action of [...r.actions, ...(r.elseActions ?? [])]) {
      if (
        (action.type === "Calculate" || action.type === "Assign Value" || action.type === "Bracket Lookup") &&
        action.outputField === key
      ) {
        return action.outputType;
      }
    }
  }
  return undefined;
}

// Formats a calculated variable's value per its declared Return Type —
// percentage/currency get the same display convention as the rest of the app
// (see matrix/editable-cell.tsx's formatDisplay), everything else falls back
// to plain string/number display.
export function formatVariableValue(rules: BusinessRule[], key: string, value: unknown): string {
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  
  const type = getOutputTypeForKey(rules, key);
  if (typeof value === "number") {
    if (type === "percentage") return `${value}%`;
    if (type === "currency") return `₹${value.toLocaleString("en-IN")}`;
    return value.toLocaleString();
  }
  if (type === "boolean") return value === "true" ? "Yes" : value === "false" ? "No" : String(value);
  return String(value);
}
