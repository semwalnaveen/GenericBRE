"use client";

import React, { useState } from "react";
import { Download, RotateCcw, PlayCircle, Copy, Check, Sparkles, SlidersHorizontal, FileCode, CheckCircle2, ShieldCheck, Activity } from "lucide-react";
import { toast } from "sonner";
import { Product, TraceStep } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { downloadJson } from "@/lib/csv";
import { UseRunSimulatorResult } from "./run-simulator-panel";
import { ProductSelector } from "./product-selector";
import { ValidationPanel } from "./validation-panel";
import { DynamicFormView } from "./dynamic-form-view";
import { VariableViewer } from "./variable-viewer";
import { DecisionExplanation } from "./decision-explanation";
import { CalculatedVariablesCard } from "./calculated-variables-card";
import { collectFieldKeys } from "@/lib/condition-tree";
import { extractVariableKeys } from "@/lib/expression";

interface RunSimulatorRedesignedProps {
  product: Product;
  sim: UseRunSimulatorResult;
  products?: Product[];
  onProductChange?: (product: Product) => void;
}

export function RunSimulatorRedesigned({ product, sim, products = [], onProductChange }: RunSimulatorRedesignedProps) {
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [inputMode, setInputMode] = useState<"form" | "json">("form");
  const [simMode, setSimMode] = useState<"product" | "single_rule">("product");

  const result = sim.decisionResult;
  const executionPlan = sim.mappedRules;

  const handleProductChange = (selected: Product) => {
    if (onProductChange) onProductChange(selected);
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
      toast.success("JSON Formatted");
    } catch {
      toast.error("Invalid JSON", { description: "Fix syntax errors before formatting." });
    }
  };

  const apiRequestJson = JSON.stringify(sim.apiRequestEnvelope, null, 2);
  const apiResponseJson = JSON.stringify(sim.responseShape, null, 2);

  const requiredFields = React.useMemo(() => {
    const keys = new Set<string>();
    for (const rule of executionPlan) {
      collectFieldKeys(rule.rootGroup).forEach((k) => keys.add(k));
      const allActions = [...rule.actions, ...(rule.elseActions || [])];
      for (const a of allActions) {
        if (a.type === "Calculate" || a.type === "Assign Value") {
          extractVariableKeys(a.outputValue || "").forEach((k) => keys.add(k));
        } else if (a.type === "Bracket Lookup") {
          extractVariableKeys((a as any).bracketInputKey || "").forEach((k) => keys.add(k));
        }
      }
    }
    return sim.fieldCatalog
      .filter((f) => f.mandatory && keys.has(f.key))
      .map((f) => f.key);
  }, [executionPlan, sim.fieldCatalog]);

  const availableProducts = products.length > 0 ? products : [product];

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
      executionPlan: executionPlan.map((rule, idx) => ({ sequence: idx + 1, ruleId: rule.id, ruleName: rule.name })),
      timeline: result.flatTrace,
      apiRequest: sim.apiRequestEnvelope,
      apiResponse: sim.responseShape,
    });
    toast.success("Report downloaded");
  };

  return (
    <div className="flex flex-1 flex-col bg-background p-4 sm:p-5 space-y-4 overflow-y-auto">
      {/* TOP HEADER — MODE SWITCHER & SIMULATOR PRODUCT CONTEXT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Enterprise Rule Simulator</h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 font-semibold">
              Large API Ready (500+ Fields)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test single rules or execute the complete Product rule sequence pipeline with real-time field validation and variable tracing.
          </p>
        </div>

        
      </div>

      {/* 2-COLUMN BALANCED ENTERPRISE DESKTOP GRID */}
      <div className="grid grid-cols-12 gap-5 items-stretch">
        {/* LEFT COLUMN — PRODUCT SELECTOR, INPUT & VALIDATION (6 COLS) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 min-h-0">
          <ProductSelector
            products={availableProducts}
            selectedProduct={product}
            onSelectProduct={handleProductChange}
            mappedRuleCount={executionPlan.length}
          />

          

          {/* PRE-FLIGHT VALIDATION PANEL */}
          <ValidationPanel jsonText={JSON.stringify(sim.translatedPayload || {})} requiredFields={requiredFields} />

          {/* DUAL INPUT MODE (FORM VIEW VS JSON VIEW) */}
          <div className="rounded-xl border bg-card p-4 flex flex-col flex-1 shadow-xs min-h-0">
            <Tabs value={inputMode} onValueChange={(v) => v && setInputMode(v as "form" | "json")} className="flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Simulation Input Payload
                </h3>
                <TabsList className="h-8">
                  <TabsTrigger value="form" className="text-xs">Form View</TabsTrigger>
                  <TabsTrigger value="json" className="text-xs">JSON View</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="form" className="mt-3 flex-1 overflow-auto max-h-[600px]">
                <DynamicFormView
                  jsonText={JSON.stringify(sim.translatedPayload || {}, null, 2)}
                  onUpdateJsonText={sim.setJsonText}
                  mappedFields={["applicant_age", "monthly_income", "credit_score", "loan_amount", "ltv_ratio", "dti_ratio"]}
                  requiredFields={requiredFields}
                />
              </TabsContent>

              <TabsContent value="json" className="mt-3 flex-1 flex flex-col space-y-2 overflow-auto max-h-[600px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono text-[11px]">JSON Payload Editor</span>
                  <div className="flex items-center gap-1">
                    <Button size="icon-sm" variant="ghost" title="Copy JSON" onClick={() => handleCopyJson(sim.jsonText || "{}", false)}>
                      {copiedRequest ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    </Button>
                    <Button size="icon-sm" variant="ghost" title="Format JSON" onClick={handleFormatJson}>
                      <Sparkles className="size-3.5 text-primary" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" title="Reset to Sample" onClick={sim.resetToSampleJson}>
                      <RotateCcw className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={sim.jsonText || "{}"}
                  onChange={(e) => sim.setJsonText(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="font-mono text-xs  bg-slate-950 text-slate-100 border-slate-800 focus-visible:ring-primary flex-1 overflow-auto"
                />
              </TabsContent>
            </Tabs>

            
          </div>

          
          
          </div>

        {/* RIGHT COLUMN — CALCULATED VARIABLES, DECISION, VARIABLE INSPECTOR & CONTEXT (6 COLS) */}
        <div className="col-span-12 lg:col-span-5 space-y-4">                    {/* CALCULATED VARIABLES — shown right after the Input payload (left column),
              before the Decision, matching Input -> Calculated Variables -> Decision. */}
          {result && <CalculatedVariablesCard calculatedValues={result.calculatedValues} rules={sim.rules} />}

          {/* DECISION EXPLANATION CARD */}
          <DecisionExplanation result={result} onDownloadReport={handleDownloadReport} />

          {/* VARIABLE INSPECTOR (FULL 6-COLUMN WIDTH) */}
          {result && <VariableViewer traceSteps={result.flatTrace} jsonText={sim.jsonText || "{}"} fieldCatalog={sim.fieldCatalog} rules={sim.rules} />}
{/* STICKY SUMMARY PANEL */}
          <div className="rounded-xl border bg-card p-4 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">
              Execution Context
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Product</span>
                <span className="font-semibold text-foreground">{product.name}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Domain</span>
                <span className="font-semibold text-foreground">{product.domain}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Mapped Rules</span>
                <span className="font-bold text-primary">{executionPlan.length} Rules</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground">Validation Status</span>
                <Badge variant="outline" className="h-5 text-[10px] bg-emerald-500/10 text-emerald-600 border-0">
                  Ready
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Request Size</span>
                <span className="font-mono text-muted-foreground">{new Blob([sim.jsonText || ""]).size} bytes</span>
              </div>
            </div>
          </div>
        
        </div>
      </div>
      {/* FLOATING ACTION BAR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border bg-background/80 backdrop-blur-xl p-1.5 shadow-2xl">
        <Button variant="outline" size="sm" className="h-10 rounded-full px-5 font-medium transition-all hover:bg-muted" onClick={sim.resetToSampleJson}>
          <RotateCcw className="size-4 mr-2" /> Reset Input
        </Button>
        <Button
          size="sm"
          className="h-10 rounded-full px-8 font-bold shadow-[0_0_15px_rgba(var(--primary),0.25)] transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(var(--primary),0.4)]"
          onClick={sim.runScenario}
          disabled={sim.running}
        >
          <PlayCircle className="size-5 mr-2" /> {sim.running ? "Executing..." : "Run Simulation"}
        </Button>
      </div>
    </div>
  );
}
