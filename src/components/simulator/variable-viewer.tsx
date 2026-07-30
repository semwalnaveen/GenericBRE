"use client";

import { useMemo } from "react";
import { Variable, Layers, CheckCircle2 } from "lucide-react";
import { TraceStep } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export interface VariableViewerProps {
  traceSteps: TraceStep[];
  jsonText: string;
}

export interface VariableItem {
  key: string;
  producedByRule: string;
  currentValue: string;
  consumedByRule: string;
}

export function VariableViewer({ traceSteps, jsonText }: VariableViewerProps) {
  const variables = useMemo(() => {
    const items: VariableItem[] = [];

    // Extract input fields
    try {
      const parsed = JSON.parse(jsonText || "{}");
      for (const [k, v] of Object.entries(parsed)) {
        items.push({
          key: k,
          producedByRule: "Input Request",
          currentValue: String(v),
          consumedByRule: traceSteps.find((s) => s.conditionSummaries.some((c) => c.field === k))?.ruleId || "All Rules",
        });
      }
    } catch {
      // ignore
    }

    // Extract produced values across trace steps
    for (const step of traceSteps) {
      if (step.producedValues) {
        for (const [k, v] of Object.entries(step.producedValues)) {
          const existing = items.find((i) => i.key === k);
          if (existing) {
            existing.currentValue = String(v);
            existing.producedByRule = step.ruleId;
          } else {
            items.push({
              key: k,
              producedByRule: step.ruleId,
              currentValue: String(v),
              consumedByRule: "Decision Engine",
            });
          }
        }
      }
    }

    return items;
  }, [traceSteps, jsonText]);

  if (variables.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-3 text-center">
        No execution variables generated yet.
      </p>
    );
  }

  return (
    <div className="space-y-2.5 rounded-lg border bg-card p-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Variable className="size-4 text-primary" />
          <span>Variable Inspector ({variables.length} Variables)</span>
        </div>
        <Badge variant="outline" className="h-5 text-[10px]">
          Live Pipeline Variables
        </Badge>
      </div>

      <div className="max-h-60 overflow-y-auto border rounded-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-muted border-b font-semibold text-muted-foreground sticky top-0 z-10 shadow-xs">
            <tr>
              <th className="p-2 font-semibold bg-muted">Variable Key</th>
              <th className="p-2 font-semibold bg-muted">Current Value</th>
              <th className="p-2 font-semibold bg-muted">Produced By</th>
              <th className="p-2 font-semibold bg-muted">Consumed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono text-[11px]">
            {variables.map((item, idx) => (
              <tr key={idx} className="hover:bg-accent/40">
                <td className="p-2 font-bold text-foreground truncate max-w-48" title={item.key}>{item.key}</td>
                <td className="p-2 text-primary font-semibold truncate max-w-36" title={item.currentValue}>{item.currentValue}</td>
                <td className="p-2 text-muted-foreground font-sans truncate max-w-36" title={item.producedByRule}>{item.producedByRule}</td>
                <td className="p-2 text-muted-foreground font-sans truncate max-w-36" title={item.consumedByRule}>{item.consumedByRule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
