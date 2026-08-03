"use client";

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Variable, Layers, CheckCircle2 } from "lucide-react";
import { TraceStep, BusinessField, BusinessRule } from "@/lib/types";
import { formatVariableValue } from "@/lib/variable-format";
import { Badge } from "@/components/ui/badge";

export interface VariableViewerProps {
  traceSteps: TraceStep[];
  jsonText: string;
  fieldCatalog: BusinessField[];
  /** Optional — when provided, calculated values are formatted per their
   *  declared Return Type (percentage/currency), see variable-format.ts. */
  rules?: BusinessRule[];
}

export interface VariableItem {
  key: string;
  producedByRule: string;
  currentValue: string;
  consumedByRule: string;
}

export function VariableViewer({ traceSteps, jsonText, fieldCatalog, rules }: VariableViewerProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const variables = useMemo(() => {
    const items: VariableItem[] = [];

    // Extract input fields
    try {
      const parsed = JSON.parse(jsonText || "{}");
      for (const [k, v] of Object.entries(parsed)) {
        const field = fieldCatalog.find((f) => f.key === k);
        const valStr = field?.mask ? "***" : String(v);
        items.push({
          key: k,
          producedByRule: "Input Request",
          currentValue: valStr,
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
          const field = fieldCatalog.find((f) => f.key === k);
          const valStr = field?.mask ? "***" : rules ? formatVariableValue(rules, k, v) : String(v);
          const existing = items.find((i) => i.key === k);
          if (existing) {
            existing.currentValue = valStr;
            existing.producedByRule = step.ruleId;
          } else {
            items.push({
              key: k,
              producedByRule: step.ruleId,
              currentValue: valStr,
              consumedByRule: "Decision Engine",
            });
          }
        }
      }
    }

    return items;
  }, [traceSteps, jsonText, fieldCatalog, rules]);

  if (variables.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-3 text-center">
        No execution variables generated yet.
      </p>
    );
  }

  const rowVirtualizer = useVirtualizer({
    count: variables.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 5,
  });

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

      <div ref={parentRef} className="max-h-60 overflow-y-auto border rounded-md relative bg-card">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-10 flex w-full bg-muted border-b text-[11px] font-semibold text-muted-foreground shadow-xs">
          <div className="p-2 w-[35%]">Variable Key</div>
          <div className="p-2 w-[25%]">Current Value</div>
          <div className="p-2 w-[20%]">Produced By</div>
          <div className="p-2 w-[20%]">Consumed By</div>
        </div>
        
        {/* Virtualized Body */}
        <div 
          className="w-full relative font-mono text-[11px]"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = variables[virtualRow.index];
            return (
              <div 
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute top-0 left-0 w-full flex items-center hover:bg-accent/40 border-b border-border/40"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="p-2 font-bold text-foreground truncate w-[35%]" title={item.key}>{item.key}</div>
                <div className="p-2 text-primary font-semibold truncate w-[25%]" title={item.currentValue}>{item.currentValue}</div>
                <div className="p-2 text-muted-foreground font-sans truncate w-[20%]" title={item.producedByRule}>{item.producedByRule}</div>
                <div className="p-2 text-muted-foreground font-sans truncate w-[20%]" title={item.consumedByRule}>{item.consumedByRule}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
