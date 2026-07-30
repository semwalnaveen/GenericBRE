"use client";

import { useState } from "react";
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

  const requiredFields = sim.fieldCatalog.filter((f) => f.mandatory).map((f) => f.key);

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

        {/* SIMULATOR MODE TOGGLE */}
        <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-lg border">
          <Button
            variant={simMode === "product" ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5"
            onClick={() => setSimMode("product")}
          >
            <Activity className="size-3.5" /> Run Simulator (Product Pipeline)
          </Button>
          <Button
            variant={simMode === "single_rule" ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5"
            onClick={() => setSimMode("single_rule")}
          >
            <SlidersHorizontal className="size-3.5" /> Rule Simulator (Single Rule)
          </Button>
        </div>
      </div>

      {/* 2-COLUMN BALANCED ENTERPRISE DESKTOP GRID */}
      <div className="grid grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN — PRODUCT SELECTOR, INPUT & VALIDATION (6 COLS) */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          <ProductSelector
            products={availableProducts}
            selectedProduct={product}
            onSelectProduct={handleProductChange}
            mappedRuleCount={executionPlan.length}
          />

          {/* DUAL INPUT MODE (FORM VIEW VS JSON VIEW) */}
          <div className="rounded-xl border bg-card p-4 space-y-3 shadow-xs">
            <Tabs value={inputMode} onValueChange={(v) => v && setInputMode(v as "form" | "json")}>
              <div className="flex items-center justify-between border-b pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Simulation Input Payload
                </h3>
                <TabsList className="h-8">
                  <TabsTrigger value="form" className="text-xs">Form View</TabsTrigger>
                  <TabsTrigger value="json" className="text-xs">JSON View</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="form" className="mt-3">
                <DynamicFormView
                  jsonText={sim.jsonText || "{}"}
                  onUpdateJsonText={sim.setJsonText}
                  mappedFields={["applicant_age", "monthly_income", "credit_score", "loan_amount", "ltv_ratio", "dti_ratio"]}
                  requiredFields={requiredFields}
                />
              </TabsContent>

              <TabsContent value="json" className="mt-3 space-y-2">
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
                  className="font-mono text-xs min-h-64 bg-slate-950 text-slate-100 border-slate-800 focus-visible:ring-primary"
                />
              </TabsContent>
            </Tabs>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium" onClick={sim.resetToSampleJson}>
                <RotateCcw className="size-3.5" /> Reset Input
              </Button>
              <Button
                size="sm"
                className="h-9 flex-1 gap-1.5 text-xs font-bold shadow-sm"
                onClick={sim.runScenario}
                disabled={sim.running}
              >
                <PlayCircle className="size-4" /> {sim.running ? "Executing BRE Pipeline..." : "Run Simulation"}
              </Button>
            </div>
          </div>

          {/* PRE-FLIGHT VALIDATION PANEL */}
          <ValidationPanel jsonText={sim.jsonText || "{}"} requiredFields={requiredFields} />
        </div>

        {/* RIGHT COLUMN — DECISION, VARIABLE INSPECTOR & CONTEXT (6 COLS) */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          {/* DECISION EXPLANATION CARD */}
          <DecisionExplanation result={result} onDownloadReport={handleDownloadReport} />

          {/* VARIABLE INSPECTOR (FULL 6-COLUMN WIDTH) */}
          {result && <VariableViewer traceSteps={result.flatTrace} jsonText={sim.jsonText || "{}"} fieldCatalog={sim.fieldCatalog} />}

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
    </div>
  );
}
