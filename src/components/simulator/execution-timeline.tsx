"use client";

import { CheckCircle2, XCircle, MinusCircle, Clock, ChevronRight } from "lucide-react";
import { TraceStep } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ExecutionTimelineProps {
  traceSteps?: TraceStep[];
  trace?: TraceStep[];
}

const STATUS_ICONS: Record<TraceStep["status"], React.ElementType> = {
  Passed: CheckCircle2,
  Failed: XCircle,
  Skipped: MinusCircle,
  "Not Applicable": MinusCircle,
};

const STATUS_COLORS: Record<TraceStep["status"], string> = {
  Passed: "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
  Failed: "border-destructive/40 bg-destructive/5 text-destructive",
  Skipped: "border-border bg-muted/30 text-muted-foreground",
  "Not Applicable": "border-border bg-muted/30 text-muted-foreground",
};

export function ExecutionTimeline({ traceSteps, trace }: ExecutionTimelineProps) {
  const steps = traceSteps ?? trace ?? [];
  if (!steps || steps.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-4 text-center">
        Run simulation to generate visual execution timeline nodes.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Visual Rule Execution Timeline ({steps.length} Steps)
        </h4>
      </div>

      <div className="space-y-2 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-border/60">
        {steps.map((step, idx) => {
          const Icon = STATUS_ICONS[step.status] ?? MinusCircle;
          const statusClass = STATUS_COLORS[step.status];

          const inputsUsed = step.conditionSummaries.map((c) => `${c.field} = ${c.actual}`).join(", ");
          const outputProduced = step.producedValues && Object.keys(step.producedValues).length > 0
            ? Object.entries(step.producedValues).map(([k, v]) => `${k} = ${v}`).join(", ")
            : step.actionsApplied.map((a) => a.type).join(", ");

          return (
            <div key={step.ruleId || idx} className="relative flex items-start gap-3 pl-8">
              {/* Timeline Node Badge Icon */}
              <div className="absolute left-1.5 top-2 size-5 -translate-x-1/2 rounded-full bg-background border flex items-center justify-center z-10">
                <Icon className={cn("size-3.5", step.status === "Passed" && "text-emerald-500", step.status === "Failed" && "text-destructive", step.status === "Skipped" && "text-muted-foreground")} />
              </div>

              {/* Node Card */}
              <div className={cn("flex-1 rounded-lg border p-3 text-xs space-y-1.5 transition-shadow hover:shadow-2xs", statusClass)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">
                      Step {idx + 1}: {step.ruleId}
                    </span>
                    <span className="font-semibold text-foreground/90 truncate max-w-44" title={step.ruleName}>
                      {step.ruleName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={step.status === "Passed" ? "default" : step.status === "Failed" ? "destructive" : "secondary"} className="h-5 text-[10px]">
                      {step.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 font-mono text-[11px]">
                  <div>
                    <span className="font-sans text-[10px] text-muted-foreground block">Input Evaluated</span>
                    <span className="text-foreground truncate block" title={inputsUsed || "—"}>
                      {inputsUsed || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="font-sans text-[10px] text-muted-foreground block">Output Generated</span>
                    <span className="text-foreground truncate block" title={outputProduced || "—"}>
                      {outputProduced || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
