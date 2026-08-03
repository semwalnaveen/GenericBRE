"use client";

import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Download } from "lucide-react";
import { DecisionResult, SimulationResult, TraceStep } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DecisionExplanationProps {
  result: DecisionResult | SimulationResult | null;
  onDownloadReport?: () => void;
}

export function DecisionExplanation({ result, onDownloadReport }: DecisionExplanationProps) {
  if (!result) {
    return (
      <div className="rounded-lg border bg-card p-5 text-center text-xs text-muted-foreground space-y-2">
        <ShieldCheck className="size-8 mx-auto text-muted-foreground/40" />
        <p className="font-medium text-foreground">Decision Engine Ready</p>
        <p>Configure simulation inputs and click <strong>Run Simulation</strong> to view the decision and business explanation breakdown.</p>
      </div>
    );
  }

  const isApproved = result.outcome === "Approved" || (result.outcome as string) === "Eligible";
  const isRejected = result.outcome === "Rejected";

  const traceSteps: TraceStep[] = (result as DecisionResult).flatTrace ?? (result as SimulationResult).trace ?? [];
  const passedSteps = traceSteps.filter((s) => s.status === "Passed" && !s.actionsApplied.some(a => a.type === "Reject"));
  const failedSteps = traceSteps.filter((s) => s.status === "Failed" || (s.status === "Passed" && s.actionsApplied.some(a => a.type === "Reject")));

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3.5 text-xs transition-all",
        isApproved
          ? "bg-emerald-500/5 border-emerald-500/30"
          : isRejected
          ? "bg-destructive/5 border-destructive/30"
          : "bg-amber-500/5 border-amber-500/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isApproved ? (
            <CheckCircle2 className="size-5 text-emerald-500" />
          ) : isRejected ? (
            <XCircle className="size-5 text-destructive" />
          ) : (
            <AlertTriangle className="size-5 text-amber-500" />
          )}
          <div>
            <h3 className="font-bold text-sm text-foreground">Final Decision</h3>
            <p className="text-muted-foreground text-[11px]">{result.summary}</p>
          </div>
        </div>

        <Badge
          className={cn(
            "text-xs px-2.5 py-1 font-bold border-0",
            isApproved
              ? "bg-emerald-500 text-white"
              : isRejected
              ? "bg-destructive text-white"
              : "bg-amber-500 text-white"
          )}
        >
          {result.outcome.toUpperCase()}
        </Badge>
      </div>

      {/* HUMAN READABLE BUSINESS REASON BULLETS */}
      <div className="space-y-2 border-t pt-2.5">
        <p className="font-semibold text-foreground text-xs">Decision Explanation Breakdown:</p>
        <ul className="space-y-1.5 pl-1">
          {passedSteps.map((step, idx) => (
            <li key={`pass-${idx}`} className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
              <span>
                <strong className="text-foreground font-semibold">{step.ruleName} ({step.ruleId}): </strong>
                {step.conditionSummaries.map((c) => `${c.field} ${c.operator} ${c.expected} (Actual: ${c.actual})`).join(", ") || "Rule condition satisfied."}
              </span>
            </li>
          ))}

          {failedSteps.map((step, idx) => {
            const rejectedByAction = step.actionsApplied.some(a => a.type === "Reject");
            return (
              <li key={`fail-${idx}`} className="flex items-start gap-1.5 text-destructive font-medium">
                <XCircle className="size-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-semibold">{step.ruleName} ({step.ruleId}): </strong>
                  {rejectedByAction 
                    ? (step.actionsApplied.find(a => a.type === "Reject")?.message || "Rule rejected the application.")
                    : (step.conditionSummaries.map((c) => `${c.field} ${c.operator} ${c.expected} (Actual: ${c.actual})`).join(", ") || "Condition failed.")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {onDownloadReport && (
        <Button size="sm" variant="outline" className="w-full h-8 gap-1.5 text-xs font-medium border-border/80" onClick={onDownloadReport}>
          <Download className="size-3.5" /> Download Full Simulation Report
        </Button>
      )}
    </div>
  );
}
