import { Variable } from "lucide-react";
import { BusinessRule } from "@/lib/types";
import { formatVariableValue } from "@/lib/variable-format";

// A distinctly-labeled "Calculated Variables" section — every Calculate/
// Assign Value/Bracket Lookup output a run produced, formatted per its
// declared Return Type (percentage/currency get their unit, see
// variable-format.ts). Shared by the single-record Simulator and the full
// audit view so calculated variables always read the same way wherever a
// decision result is shown.
export function CalculatedVariablesCard({
  calculatedValues,
  rules,
}: {
  calculatedValues: Record<string, string | number>;
  rules: BusinessRule[];
}) {
  const entries = Object.entries(calculatedValues);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Variable className="size-3.5 text-primary" /> Calculated Variables
      </p>
      <div className="flex flex-wrap gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-sm">
            <span className="font-mono text-muted-foreground">{key}</span>
            <span className="font-semibold">=</span>
            <span className="font-mono font-medium text-primary">{formatVariableValue(rules, key, value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
