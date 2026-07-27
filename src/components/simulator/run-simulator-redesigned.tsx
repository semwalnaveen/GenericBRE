"use client";

import { useState } from "react";
import { Download, RotateCcw, PlayCircle, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Product, TraceStep } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { downloadJson } from "@/lib/csv";
import { UseRunSimulatorResult } from "./run-simulator-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RunSimulatorRedesignedProps {
  product: Product;
  sim: UseRunSimulatorResult;
  products?: Product[];
  onProductChange?: (product: Product) => void;
}

// One-line summaries of a single rule's trace step, derived entirely from the
// engine's real conditionSummaries/actions — no hardcoded rule content.
function inputSummary(step: TraceStep): string {
  if (step.conditionSummaries.length === 0) return "—";
  return step.conditionSummaries.map((c) => `${c.field} = ${c.actual}`).join(", ");
}
function conditionSummary(step: TraceStep): string {
  if (step.conditionSummaries.length === 0) return "matches every case";
  return step.conditionSummaries.map((c) => `${c.field} ${c.operator} ${c.expected}`).join(", ");
}
function outputSummary(step: TraceStep): string {
  if (step.producedValues && Object.keys(step.producedValues).length > 0) {
    return Object.entries(step.producedValues).map(([k, v]) => `${k} = ${v}`).join(", ");
  }
  if (step.actionsApplied.length > 0) {
    return step.actionsApplied.map((a) => a.type).join(", ");
  }
  return step.status === "Passed" ? "matched" : "—";
}

const STATUS_STYLES: Record<TraceStep["status"], string> = {
  Passed: "bg-emerald-100 text-emerald-700",
  Failed: "bg-red-100 text-red-700",
  Skipped: "bg-gray-100 text-gray-600",
  "Not Applicable": "bg-gray-100 text-gray-600",
};

export function RunSimulatorRedesigned({ product, sim, products = [], onProductChange }: RunSimulatorRedesignedProps) {
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [inputMode, setInputMode] = useState<"form" | "json">("form");

  const result = sim.decisionResult;

  // Real per-product execution plan (Rule Sequencer order), never hardcoded.
  const executionPlan = sim.mappedRules;

  const handleProductChange = (productId: string | null) => {
    if (!productId) return;
    const selected = products.find((p) => p.id === productId);
    if (selected && onProductChange) onProductChange(selected);
  };

  const handleCopyJson = (text: string, isResponse: boolean) => {
    navigator.clipboard.writeText(text);
    if (isResponse) {
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 2000);
    } else {
      setCopiedRequest(true);
      setTimeout(() => setCopiedRequest(false), 2000);
    }
    toast.success("Copied to clipboard");
  };

  const handleFormatJson = () => {
    try {
      sim.setJsonText(JSON.stringify(JSON.parse(sim.jsonText || "{}"), null, 2));
    } catch {
      toast.error("Invalid JSON", { description: "Fix the syntax before formatting." });
    }
  };

  // Panels 2 & 3 are always derived, product/rule-driven, never hardcoded —
  // Panel 3 shows the full contract shape (empty) before a run, and the real
  // result (populated in place) after one, via sim.responseShape.
  const apiRequestJson = JSON.stringify(sim.apiRequestEnvelope, null, 2);
  const apiResponseJson = JSON.stringify(sim.responseShape, null, 2);

  const availableProducts = products.length > 0 ? products : [product];

  // Form view is a labeled-input presentation of the exact same jsonText
  // state the JSON tab edits — no separate data source, so the two views
  // can never drift out of sync.
  let parsedFields: [string, unknown][] = [];
  let jsonIsValid = true;
  try {
    parsedFields = Object.entries(JSON.parse(sim.jsonText || "{}"));
  } catch {
    jsonIsValid = false;
  }

  const updateField = (key: string, raw: string) => {
    try {
      const obj = JSON.parse(sim.jsonText || "{}");
      const original = obj[key];
      if (typeof original === "number") {
        const n = Number(raw);
        obj[key] = Number.isNaN(n) ? raw : n;
      } else if (typeof original === "boolean") {
        obj[key] = raw === "true";
      } else {
        obj[key] = raw;
      }
      sim.setJsonText(JSON.stringify(obj, null, 2));
    } catch {
      // Underlying JSON is invalid — nothing to patch until it's fixed via the JSON tab.
    }
  };

  const handleDownloadReport = () => {
    if (!result) return;
    downloadJson(`simulation_report_${product.id}`, {
      product: { id: product.id, name: product.name, domain: product.domain },
      generatedAt: new Date().toISOString(),
      input: sim.jsonText ? JSON.parse(sim.jsonText) : {},
      decision: {
        outcome: result.outcome,
        summary: result.summary,
        passed: result.flatTrace.filter((t) => t.status === "Passed").length,
        failed: result.flatTrace.filter((t) => t.status === "Failed").length,
      },
      executionPlan: executionPlan.map((rule, idx) => ({ sequence: idx + 1, ruleId: rule.id, ruleName: rule.name, ruleType: rule.ruleType })),
      timeline: result.flatTrace.map((step) => ({
        ruleId: step.ruleId,
        ruleName: step.ruleName,
        input: inputSummary(step),
        condition: conditionSummary(step),
        output: outputSummary(step),
        status: step.status,
        durationMs: step.durationMs,
      })),
      apiRequest: sim.apiRequestEnvelope,
      apiResponse: sim.responseShape,
    });
    toast.success("Report downloaded");
  };

  const outcomeTone = !result
    ? null
    : result.outcome === "Approved" ? "emerald" : result.outcome === "Rejected" ? "red" : "amber";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5 space-y-5 min-h-full">
          {/* Consolidated product context — single source of truth for product
              identity, replacing the previously duplicated Select Product +
              Product Summary blocks. */}
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Select
                items={Object.fromEntries(availableProducts.map((p) => [p.id, p.name]))}
                value={product.id}
                onValueChange={handleProductChange}
              >
                <SelectTrigger className="h-9 w-full max-w-64 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((prod) => (
                    <SelectItem key={prod.id} value={prod.id}>
                      {prod.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge
                className={cn(
                  "border-0 shrink-0",
                  product.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                )}
              >
                {product.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span>
                <span className="text-muted-foreground">Domain</span>{" "}
                <span className="font-medium">{product.domain}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Mapped Rules</span>{" "}
                <span className="font-medium">{executionPlan.length}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Last Updated</span>{" "}
                <span className="font-medium">
                  {new Date(product.updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 items-start">
            {/* Left — Simulation Input, 7 cols */}
            <div className="col-span-12 lg:col-span-7 space-y-2.5">
              <Tabs value={inputMode} onValueChange={(v) => v && setInputMode(v as "form" | "json")}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Simulation Input</h3>
                  <TabsList>
                    <TabsTrigger value="form">Form</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="form" className="mt-2.5">
                  {jsonIsValid && parsedFields.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 rounded-lg border bg-card p-3.5">
                      {parsedFields.map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <label htmlFor={`sim-field-${key}`} className="text-sm font-medium text-muted-foreground">
                            {key}
                          </label>
                          {typeof value === "boolean" ? (
                            <Select value={String(value)} onValueChange={(v) => v && updateField(key, v)}>
                              <SelectTrigger id={`sim-field-${key}`} size="sm" className="h-9 w-full text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">true</SelectItem>
                                <SelectItem value="false">false</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={`sim-field-${key}`}
                              className="h-9 text-sm"
                              type={typeof value === "number" ? "number" : "text"}
                              value={String(value)}
                              onChange={(e) => updateField(key, e.target.value)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                      {jsonIsValid ? "No fields in the current input." : "The JSON is invalid — switch to the JSON tab to fix it."}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="json" className="mt-2.5 space-y-2">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Copy input JSON"
                      title="Copy"
                      onClick={() => handleCopyJson(sim.jsonText || "{}", false)}
                    >
                      {copiedRequest ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <Copy className="size-4 text-gray-600" />
                      )}
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Format input JSON" title="Format" onClick={handleFormatJson}>
                      <Sparkles className="size-4 text-gray-600" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Reset input to sample JSON" title="Reset to Default" onClick={sim.resetToSampleJson}>
                      <RotateCcw className="size-4 text-gray-600" />
                    </Button>
                  </div>
                  <Textarea
                    value={sim.jsonText || "{}"}
                    onChange={(e) => sim.setJsonText(e.target.value)}
                    placeholder='{"key": "value"}'
                    className="font-mono text-sm max-h-48 overflow-y-auto bg-gray-900 text-gray-100 border-gray-700"
                  />
                </TabsContent>
              </Tabs>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={sim.resetToSampleJson}>
                  <RotateCcw className="size-3.5" /> Reset
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={sim.runScenario}
                  disabled={sim.running}
                >
                  <PlayCircle className="size-3.5" /> {sim.running ? "Running..." : "Run Simulation"}
                </Button>
              </div>
            </div>

            {/* Right — Decision, 5 cols. The single place the outcome is
                shown — replaces the old Simulation Summary card + pinned
                footer banner, which each repeated it separately. */}
            <div className="col-span-12 lg:col-span-5">
              <div
                aria-live="polite"
                className={cn(
                  "h-full space-y-3 rounded-lg border p-4",
                  result
                    ? outcomeTone === "emerald"
                      ? "bg-emerald-50 border-emerald-200"
                      : outcomeTone === "red"
                        ? "bg-red-50 border-red-200"
                        : "bg-amber-50 border-amber-200"
                    : "bg-card"
                )}
              >
                <h3 className="text-sm font-semibold">Decision</h3>
                {result ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Check
                        className={cn(
                          "size-5 shrink-0",
                          outcomeTone === "emerald" ? "text-emerald-600" : outcomeTone === "red" ? "text-red-600" : "text-amber-600"
                        )}
                      />
                      <Badge
                        className={cn(
                          "text-sm border-0 px-2 py-1",
                          outcomeTone === "emerald"
                            ? "bg-emerald-100 text-emerald-700"
                            : outcomeTone === "red"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {result.outcome.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground/80">{result.summary}</p>
                    <div className="grid grid-cols-2 gap-2 border-t pt-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Passed</span>
                        <span className="font-medium text-emerald-600">{result.flatTrace.filter((t) => t.status === "Passed").length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Failed</span>
                        <span className="font-medium text-red-600">{result.flatTrace.filter((t) => t.status === "Failed").length}</span>
                      </div>
                    </div>
                    <Button size="sm" className="w-full gap-1.5" onClick={handleDownloadReport}>
                      <Download className="size-3.5" /> Download Full Report
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Run the simulation to see the decision here.</p>
                )}
              </div>
            </div>
          </div>

          {/* Execution Plan — elevated above the fold, directly under Run,
              now also carrying live pass/fail status once a result exists. */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold">Execution Plan (Rule Sequence)</h3>
            {executionPlan.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                No rules are mapped to {product.name}. Map rules to this product to build an execution plan.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {executionPlan.map((rule, idx) => {
                  const step = result?.flatTrace.find((t) => t.ruleId === rule.id);
                  return (
                    <div key={rule.id} className="flex flex-col items-center gap-1.5 p-2.5 border rounded-lg bg-card transition-colors hover:border-primary/30 hover:bg-accent/50">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {idx + 1}
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">{rule.id}</div>
                        <div className="text-sm text-muted-foreground leading-tight">{rule.name}</div>
                        <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                          {rule.ruleType && <Badge className="text-sm bg-blue-50 text-blue-700 border-0 px-1.5 py-0.5">{rule.ruleType}</Badge>}
                          {step && <Badge className={cn("text-sm border-0 px-1.5 py-0.5", STATUS_STYLES[step.status])}>{step.status}</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Simulation Timeline — auto-expands once a run has happened */}
          {result && result.flatTrace.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold">Simulation Timeline</h3>
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold">Rule</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Input</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Condition</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Output</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Status</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.flatTrace.map((step) => (
                        <tr key={step.ruleId} className="hover:bg-accent/40">
                          <td className="px-3 py-2.5 font-medium">
                            <div>{step.ruleId}</div>
                            <div className="text-sm text-muted-foreground">{step.ruleName}</div>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{inputSummary(step)}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{conditionSummary(step)}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{outputSummary(step)}</td>
                          <td className="px-3 py-2.5">
                            <Badge className={cn("border-0", STATUS_STYLES[step.status])}>{step.status}</Badge>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{step.durationMs.toFixed(1)} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Developer View — collapsed by default; raw request/response
              payloads for technical audiences, demoted from top-level cards
              that used to compete for attention with the Decision. */}
          <Accordion>
            <AccordionItem value="dev-view" className="rounded-xl border bg-muted/30 overflow-hidden">
              <AccordionTrigger className="w-full px-4 py-3 text-sm font-semibold text-foreground bg-muted/40 hover:bg-accent/60 hover:no-underline transition-colors cursor-pointer select-none flex items-center justify-between min-h-11">
                Developer View — API Request &amp; Response
              </AccordionTrigger>
              <AccordionContent className="p-4 border-t bg-card">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">API Request</h4>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="h-6 w-6"
                        aria-label="Copy API request JSON"
                        title="Copy"
                        onClick={() => handleCopyJson(apiRequestJson, false)}
                      >
                        {copiedRequest ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                      </Button>
                    </div>
                    <div className="rounded-lg border bg-gray-900 p-2 font-mono text-sm text-gray-100 max-h-56 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{apiRequestJson}</pre>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Final Output (Response JSON)</h4>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="h-6 w-6"
                        aria-label="Copy response JSON"
                        title="Copy"
                        onClick={() => handleCopyJson(apiResponseJson, true)}
                      >
                        {copiedResponse ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                      </Button>
                    </div>
                    <div className="rounded-lg border bg-gray-900 p-2 font-mono text-sm text-gray-100 max-h-56 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{apiResponseJson}</pre>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}
