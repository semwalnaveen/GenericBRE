"use client";

import { AlertTriangle, Clock, Hash } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { BusinessRule } from "@/lib/types";
import { resolveDecisionResponseConfig } from "@/lib/decision-response";
import { BatchRowResult } from "@/lib/batch-runner";
import { OutcomeBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DecisionExplanation } from "../decision-explanation";
import { ExecutionTimeline } from "../execution-timeline";
import { VariableViewer } from "../variable-viewer";
import { DecisionResultView } from "../decision-result-view";

// Row Details drill-down — reuses the exact same result-display components
// the single-record Run Simulator already composes (DecisionExplanation,
// ExecutionTimeline, VariableViewer, DecisionResultView), just fed with one
// batch row's already-computed result instead of the live sim state. No new
// execution happens here — purely presentational.
export function BatchRowDetailSheet({
  row,
  rules,
  domain,
  open,
  onOpenChange,
}: {
  row: BatchRowResult | null;
  rules: BusinessRule[];
  domain: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const decisionResponseSettings = useAppStore((s) => s.decisionResponseSettings);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const config = resolveDecisionResponseConfig(decisionResponseSettings, { industry: domain });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-2xl">
        {row && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Hash className="size-3.5 text-muted-foreground" /> Row {row.rowNumber}
                <span className="font-mono text-sm text-muted-foreground">{row.customerId}</span>
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                {row.status === "Success" && row.decision ? (
                  <OutcomeBadge outcome={row.decision.outcome} />
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" /> Execution Error
                  </Badge>
                )}
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3" /> {row.durationMs.toFixed(1)}ms
                </span>
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 px-4">
              {row.status === "Error" || !row.decision ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
                  <p className="font-semibold text-destructive">This row could not be executed.</p>
                  <p className="mt-1 text-muted-foreground">{row.errorMessage ?? "Unknown error."}</p>
                </div>
              ) : (
                <Tabs defaultValue="decision" className="pb-4">
                  <TabsList className="mb-3 w-full">
                    <TabsTrigger value="decision" className="flex-1">Decision</TabsTrigger>
                    <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
                    <TabsTrigger value="variables" className="flex-1">Variables</TabsTrigger>
                    <TabsTrigger value="audit" className="flex-1">Full Audit</TabsTrigger>
                  </TabsList>

                  <TabsContent value="decision">
                    <DecisionExplanation result={row.decision} />
                  </TabsContent>

                  <TabsContent value="timeline">
                    <ExecutionTimeline trace={row.decision.flatTrace} />
                  </TabsContent>

                  <TabsContent value="variables">
                    <VariableViewer traceSteps={row.decision.flatTrace} jsonText={JSON.stringify(row.decision.input)} fieldCatalog={fieldCatalog} />
                  </TabsContent>

                  <TabsContent value="audit">
                    <DecisionResultView result={row.decision} config={config} rules={rules} />
                  </TabsContent>
                </Tabs>
              )}
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
