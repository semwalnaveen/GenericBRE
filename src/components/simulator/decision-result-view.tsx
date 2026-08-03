"use client";

import { useState } from "react";
import { FileJson, ChevronDown, ShieldCheck, Gauge, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { DecisionResult, DecisionResponseConfig, ResponseMode, BusinessRule } from "@/lib/types";
import { buildApiResponsePayload } from "@/lib/decision-response";
import { DecisionBanner } from "./decision-banner";
import { DecisionCallout } from "./decision-callout";
import { ExecutionTimeline } from "./execution-timeline";
import { CalculatedVariablesCard } from "./calculated-variables-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { MODE_LABELS, MODE_COLORS } from "@/lib/execution-mode";
import { cn } from "@/lib/utils";

// This view always renders the full audit-grade breakdown — decision,
// explanation, trace, and audit metadata together — rather than letting the
// viewer pick a narrower slice. `mode` is kept as an internal constant (not a
// prop) purely so the existing section-visibility conditions below stay
// untouched and behave exactly as the old "Full Audit" tab did.
const mode: ResponseMode = "full-audit";

// One shared result view for both the Simulator and Execution Manager's Test
// Mapping panel — the two engines produce different result shapes
// (SimulationResult vs RuleSetExecutionResult), but both are normalized into
// a DecisionResult (see src/lib/decision-response.ts) before reaching here,
// so this component never needs to know which engine produced it beyond
// `result.source` (used only to decide whether an Execution Flow exists).
export function DecisionResultView({
  result,
  config,
  rules,
}: {
  result: DecisionResult;
  config: DecisionResponseConfig;
  rules: BusinessRule[];
}) {
  const [showRequest, setShowRequest] = useState(false);
  const [showResponse, setShowResponse] = useState(true);

  const triggeredRuleObjs = rules.filter((r) => result.triggeredRules.includes(r.id));
  const conditionSummaries = result.flatTrace.flatMap((t) => t.conditionSummaries);
  const passedConditions = conditionSummaries.filter((c) => c.passed).length;
  const failedConditions = conditionSummaries.filter((c) => !c.passed).length;
  const responsePayload = buildApiResponsePayload(result, mode, config);

  return (
    <div className="space-y-4">
      <DecisionBanner result={result} />

      {mode !== "decision-only" && (
        <>
          <DecisionCallout result={result} />

          {config.showRuleSequence && result.source === "execution-manager" && result.flow.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Execution Flow — Triggered Rule Sets</p>
              <div className="space-y-1.5">
                {result.flow.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                      f.mode && MODE_COLORS[f.mode]
                    )}
                  >
                    <span className="truncate">
                      {f.label}
                      {f.skipped ? ` — skipped (${f.skipReason})` : ""}
                    </span>
                    {f.mode && (
                      <Badge variant="outline" className="shrink-0 border-current text-sm">
                        {MODE_LABELS[f.mode]}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {config.showTriggeredRules && triggeredRuleObjs.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Triggered Rules</p>
              <div className="flex flex-wrap gap-2">
                {triggeredRuleObjs.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5 text-sm">
                    <span className="font-mono text-muted-foreground">{r.id}</span>
                    <span className="font-medium">{r.name}</span>
                    {config.showRuleVersion && result.ruleVersions[r.id] !== undefined && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-sm text-muted-foreground">v{result.ruleVersions[r.id]}</span>
                    )}
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <CalculatedVariablesCard calculatedValues={result.calculatedValues} rules={rules} />

          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rule Evaluation Timeline</p>
            {result.flow.length <= 1 ? (
              <ExecutionTimeline trace={result.flatTrace} />
            ) : (
              <Accordion>
                {result.flow.map((f) => (
                  <AccordionItem key={f.id} value={f.id}>
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        {f.label}
                        {f.mode && (
                          <Badge variant="outline" className={cn("text-sm", MODE_COLORS[f.mode])}>
                            {MODE_LABELS[f.mode]}
                          </Badge>
                        )}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      {f.skipped ? (
                        <p className="text-sm text-muted-foreground">Skipped — {f.skipReason}</p>
                      ) : f.trace.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No rules tagged into this Rule Set.</p>
                      ) : (
                        <ExecutionTimeline trace={f.trace} />
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>

          {config.showFailedRules && conditionSummaries.length > 0 && (
            <div className="flex items-center gap-4 rounded-xl border bg-card p-4 text-sm">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{passedConditions} condition{passedConditions === 1 ? "" : "s"} passed</span>
              <span className="font-semibold text-red-600 dark:text-red-400">{failedConditions} condition{failedConditions === 1 ? "" : "s"} failed</span>
            </div>
          )}

          {config.showExecutionTime && (
            <div className="flex items-center gap-1.5 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              <Gauge className="size-3.5 shrink-0" />
              Evaluated {result.flatTrace.length} rule{result.flatTrace.length === 1 ? "" : "s"} across {result.flow.length} rule set
              {result.flow.length === 1 ? "" : "s"} in {result.totalDurationMs.toFixed(1)}ms.
            </div>
          )}
        </>
      )}

      {(mode === "decision-trace" || mode === "full-audit") && (
        <>
          {config.showApiRequest && (
            <JsonPanel title="API Request" data={result.input} open={showRequest} onToggle={() => setShowRequest((v) => !v)} />
          )}
          {config.showApiResponse && (
            <JsonPanel
              title="API Response — Full Audit"
              data={responsePayload}
              open={showResponse}
              onToggle={() => setShowResponse((v) => !v)}
            />
          )}
        </>
      )}

      {mode === "full-audit" && (
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Audit Information
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
            <InfoRow label="Correlation ID" value={result.correlationId} mono />
            {/* Environment removed — FUTURE: restore <InfoRow label="Environment" value={result.environment} /> */}
            <InfoRow label="Timestamp" value={new Date(result.timestamp).toLocaleString()} />
          </div>
          <p className="mt-2.5 text-sm text-muted-foreground">
            {config.enableAuditLogging
              ? "This run was recorded in the Audit Log with the structured context above."
              : 'Audit logging is disabled for this scope — enable "Enable Audit Logging" in Decision Response Configuration to record this context.'}
          </p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("font-medium", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function JsonPanel({ title, data, open, onToggle }: { title: string; data: unknown; open: boolean; onToggle: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onToggle} className="flex flex-1 items-center justify-between gap-2 text-left">
          <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <FileJson className="size-3.5" /> {title}
          </span>
          <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          title="Copy to clipboard"
          className="shrink-0"
        >
          {copied ? <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      {open && <pre className="mt-2.5 max-h-80 overflow-auto rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
