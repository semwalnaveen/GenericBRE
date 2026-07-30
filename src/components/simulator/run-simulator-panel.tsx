"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, PlayCircle, RotateCcw, CheckCircle2, Clock, Zap } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Product, DecisionResult, ResponseMode } from "@/lib/types";
import { getMappedRules, executeRulesByProduct } from "@/lib/product-rule-engine";
import { validatePayload, applyTranslationMapping } from "@/lib/engine";
import { fromSimulation, resolveDecisionResponseConfig, buildApiResponsePayload } from "@/lib/decision-response";
import { applyMatrixLookup } from "@/lib/matrix-lookup";
import { buildTemplateJson, buildApiRequestEnvelope, buildResponseShapePreview, buildResponseShapeFromResult } from "@/lib/simulator-json";
import { SampleJsonPanel } from "@/components/rule-builder/sample-json-panel";
import { DecisionResultView } from "@/components/simulator/decision-result-view";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function templateJsonTextFor(
  product: Product | null,
  rules: Parameters<typeof buildTemplateJson>[1],
  mappings: Parameters<typeof buildTemplateJson>[2],
  fieldCatalog: Parameters<typeof buildTemplateJson>[3]
): string {
  return product ? JSON.stringify(buildTemplateJson(product, rules, mappings, fieldCatalog), null, 2) : "{}";
}

// The run/result logic shared by the standalone /simulator page (which adds
// its own Product-picker rail on top) and the Product Workspace's Run
// Simulator tab (where the product is already fixed by the route) — a
// single source of truth for "execute this product's mapped rules against
// an input payload" so the two surfaces can never drift out of sync.
export function useRunSimulator(product: Product | null, initialSandboxRuleId: string | null = null) {
  const rules = useAppStore((s) => s.rules);
  const matrices = useAppStore((s) => s.matrices);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const executionSettings = useAppStore((s) => s.executionSettings);
  const decisionResponseSettings = useAppStore((s) => s.decisionResponseSettings);
  const addSimulation = useAppStore((s) => s.addSimulation);
  const logAudit = useAppStore((s) => s.logAudit);
  const currentUser = useAppStore((s) => s.currentUser);
  const recordRecentProduct = useAppStore((s) => s.recordRecentProduct);
  const jsonMappings = useAppStore((s) => s.jsonMappings);

  const domain = product?.domain ?? "";
  const [jsonText, setJsonText] = useState<string>(() =>
    templateJsonTextFor(product, rules, productRuleMappings, fieldCatalog)
  );
  const [decisionResult, setDecisionResult] = useState<DecisionResult | null>(null);
  const [responseMode, setResponseMode] = useState<ResponseMode>(
    () => resolveDecisionResponseConfig(decisionResponseSettings, { industry: domain }).defaultMode
  );
  const [running, setRunning] = useState(false);
  const [sandboxRuleId, setSandboxRuleId] = useState<string | null>(initialSandboxRuleId);

  const mappedRules = useMemo(
    () => (product ? getMappedRules(product.id, rules, productRuleMappings) : []),
    [product, rules, productRuleMappings]
  );
  const testingMappedRules = mappedRules.filter((r) => r.status === "Pending Approval");
  const mappedRuleIdsKey = mappedRules.map((r) => r.id).join(",");

  // Auto Synchronization — regenerate the sample JSON whenever the selected
  // product's mapped-rule set changes (mapped/unmapped, or a different
  // product), so the input always matches the live configuration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJsonText(templateJsonTextFor(product, rules, productRuleMappings, fieldCatalog));
    setDecisionResult(null);
    setSandboxRuleId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, mappedRuleIdsKey]);

  const resetToSampleJson = () => {
    setJsonText(templateJsonTextFor(product, rules, productRuleMappings, fieldCatalog));
    setDecisionResult(null);
  };

  // Panel 2 — API Request envelope, live off whatever Template JSON currently
  // parses to (falls back to the canonical template shape while invalid).
  const parsedTemplate = useMemo(() => {
    try {
      return JSON.parse(jsonText);
    } catch {
      return product ? buildTemplateJson(product, rules, productRuleMappings, fieldCatalog) : {};
    }
  }, [jsonText, product, rules, productRuleMappings, fieldCatalog]);
  const apiRequestEnvelope = useMemo(
    () => (product ? buildApiRequestEnvelope(product, parsedTemplate) : {}),
    [product, parsedTemplate]
  );

  // Panel 3 — API Response shape: full contract with empty values before a
  // run, populated in place from the real DecisionResult after one.
  const responseShape = useMemo(() => {
    if (!product) return null;
    return decisionResult
      ? buildResponseShapeFromResult(product, rules, productRuleMappings, decisionResult)
      : buildResponseShapePreview(product, rules, productRuleMappings);
  }, [product, rules, productRuleMappings, decisionResult]);

  const runScenario = () => {
    if (!product) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      toast.error("Invalid JSON", { description: "Fix the Sample Request JSON before running the simulation." });
      return;
    }

    let input: Record<string, string | number | boolean> = { ...(parsed as Record<string, string | number | boolean>) };

    // Apply JSON Value Mapping translation layer
    const mapping = jsonMappings.find(m => m.productId === product.id && m.direction === "request") 
                 || jsonMappings.find(m => m.industry === domain && !m.productId && m.direction === "request");
    
    input = applyTranslationMapping(input, mapping) as Record<string, string | number | boolean>;

    // Validate payload against field catalog constraints
    const validationErrors = validatePayload(input, fieldCatalog);
    if (validationErrors.length > 0) {
      toast.error("Payload Validation Failed", {
        description: validationErrors.map((e) => e.error).join(" • ")
      });
      return;
    }

    setRunning(true);

    if (domain === "Lending") {
      const income = Number(input.monthly_income) || 1;
      const liabilities = Number(input.monthly_liabilities) || 0;
      input.dti_ratio = Math.round((liabilities / income) * 100);
    }

    setTimeout(() => {
      const execution = executeRulesByProduct(
        product,
        rules,
        productRuleMappings,
        input,
        fieldCatalog,
        sandboxRuleId ? [sandboxRuleId] : [],
        executionSettings[domain] ?? executionSettings.default ?? { conflictResolution: "execute-all" }
      );

      if (!execution.ok || !execution.result) {
        toast.error("Couldn't run simulation", { description: execution.reason });
        setRunning(false);
        return;
      }
      const sim = execution.result;

      if (sim.outcome !== "Rejected") {
        // Matrix lookup fills in values a product's own rules didn't already
        // compute (e.g. legacy Lending products with no native pricing rule)
        // — it must never clobber a rule-authored output like a "Bracket
        // Lookup" action's interest_rate with a stale/unrelated matrix row.
        sim.calculatedValues = { ...applyMatrixLookup(matrices, domain, input), ...sim.calculatedValues };
      }

      const dr = fromSimulation(sim, rules);
      const responseConfig = resolveDecisionResponseConfig(decisionResponseSettings, { industry: domain });
      setDecisionResult(dr);
      setResponseMode(responseConfig.defaultMode);
      recordRecentProduct(product.id);
      // Sandbox previews (a rule still in Testing) aren't production activity —
      // keep them out of the "Simulations Run" history/KPI, log them distinctly.
      if (!sim.sandbox) {
        addSimulation(sim);
      }
      logAudit({
        user: currentUser.name,
        action: sim.sandbox ? "Ran Sandbox Test" : "Ran Simulation",
        entity: "Simulation",
        entityId: sim.id,
        details: sim.sandbox
          ? `${product.name} scenario against pending rule ${sandboxRuleId}, outcome ${sim.outcome} (sandbox — not live).`
          : `${product.name} scenario, outcome ${sim.outcome}.`,
        decisionContext: responseConfig.enableAuditLogging
          ? {
              correlationId: dr.correlationId,
              triggeredRules: dr.triggeredRules,
              ruleVersions: dr.ruleVersions,
              executionTimeMs: dr.totalDurationMs,
              requestPayload: dr.input,
              responsePayload: buildApiResponsePayload(dr, "full-audit", responseConfig),
            }
          : undefined,
      });
      toast[sim.outcome === "Approved" ? "success" : sim.outcome === "Rejected" ? "error" : "warning"](
        `Simulation complete: ${sim.outcome}`,
        { description: sim.summary }
      );
      setRunning(false);
    }, 350);
  };

  return {
    rules,
    /** The product's mapped rules in execution order (Rule Sequencer order,
     *  priority fallback) — surfaced so result UIs can show the real
     *  execution plan/count instead of hardcoding it. */
    mappedRules,
    jsonText,
    setJsonText,
    apiRequestEnvelope,
    responseShape,
    decisionResult,
    responseMode,
    setResponseMode,
    running,
    sandboxRuleId,
    setSandboxRuleId,
    testingMappedRules,
    resetToSampleJson,
    runScenario,
    activeConfig: resolveDecisionResponseConfig(decisionResponseSettings, { industry: domain }),
  };
}

export type UseRunSimulatorResult = ReturnType<typeof useRunSimulator>;

// Left-rail scrollable contents: editable Sample JSON + optional
// sandbox-test picker. Meant to sit inside a ScrollArea, with
// <RunSimulatorActions> pinned below it (outside the scroll area) — see
// RunSimulatorPanel below for the reference layout.
export function RunSimulatorInputs({ sim }: { sim: UseRunSimulatorResult }) {
  return (
    <div className="space-y-4">
      <SampleJsonPanel editable value={sim.jsonText} onChange={sim.setJsonText} />

      {sim.testingMappedRules.length > 0 && (
        <div className="space-y-1.5 rounded-lg border p-3">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <FlaskConical className="size-3 text-amber-500" /> Sandbox test a pending rule
          </label>
          <p className="text-sm text-muted-foreground">
            Include one Testing-stage rule mapped to this product in this run to preview its effect before approving.
            Never affects live results.
          </p>
          <Select
            value={sim.sandboxRuleId ?? "none"}
            onValueChange={(v) => sim.setSandboxRuleId(v === "none" ? null : (v ?? null))}
          >
            <SelectTrigger size="sm" className="h-8 w-full"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (production rules only)</SelectItem>
              {sim.testingMappedRules.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.id} — {r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// Pinned Reset/Run buttons — kept separate from RunSimulatorInputs so a
// caller can pin them outside its own ScrollArea (as /simulator does).
export function RunSimulatorActions({ product, sim }: { product: Product | null; sim: UseRunSimulatorResult }) {
  return (
    <div className="flex shrink-0 gap-2">
      <Button variant="outline" size="icon" onClick={sim.resetToSampleJson} disabled={!product} title="Reset to Sample JSON">
        <RotateCcw className="size-4" />
      </Button>
      <Button className="flex-1 gap-1.5" onClick={sim.runScenario} disabled={sim.running || !product}>
        <PlayCircle className="size-4" /> {sim.running ? "Running..." : "Run Simulation"}
      </Button>
    </div>
  );
}

// Right-rail contents: empty state or the full decision result.
export function RunSimulatorResult({ product, sim }: { product: Product | null; sim: UseRunSimulatorResult }) {
  if (!sim.decisionResult) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
        <PlayCircle className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          {product ? "Edit the Sample JSON and click Run Simulation" : "Select a product to get started"}
        </p>
        <p className="text-sm text-muted-foreground/70">Only rules mapped to the selected product will execute</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sim.decisionResult.sandbox && (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <FlaskConical className="size-4 shrink-0" />
          <p>
            <span className="font-semibold">Sandbox Test</span> — this run includes a rule still in Testing status. It
            previews the effect of approving that rule; it is not a live production decision and isn&apos;t counted in
            simulation history.
          </p>
        </div>
      )}
      <DecisionResultView
        result={sim.decisionResult}
        config={sim.activeConfig}
        rules={sim.rules}
      />
    </div>
  );
}

// Workflow step indicator
function WorkflowSteps({ product, jsonReady, running, hasResult }: { product: Product; jsonReady: boolean; running: boolean; hasResult: boolean }) {
  return (
    <div className="flex items-center gap-2 border-b bg-card px-6 py-3 overflow-x-auto">
      {[
        { icon: CheckCircle2, label: "Product Selected", done: true },
        { icon: Zap, label: "Configure JSON", done: jsonReady },
        { icon: Clock, label: "Running...", done: hasResult, active: running },
        { icon: CheckCircle2, label: "View Results", done: hasResult },
      ].map((step, idx) => (
        <div key={idx} className="flex items-center gap-2 shrink-0">
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${
            step.done ? "bg-emerald-500 text-white" : step.active ? "bg-primary text-white animate-pulse" : "bg-muted text-muted-foreground"
          }`}>
            <step.icon className="size-3.5" />
          </div>
          <span className="text-sm whitespace-nowrap text-muted-foreground">{step.label}</span>
          {idx < 3 && <div className="h-px w-4 bg-muted" />}
        </div>
      ))}
    </div>
  );
}

// Composed, self-contained two-pane panel for a fixed product — used by the
// Product Workspace's Run Simulator tab (no product picker needed, the
// product is already fixed by the route).
export function RunSimulatorPanel({ product }: { product: Product }) {
  const sim = useRunSimulator(product);
  const jsonReady = sim.jsonText.trim().length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkflowSteps product={product} jsonReady={jsonReady} running={sim.running} hasResult={!!sim.decisionResult} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row">
        <ScrollArea className="min-h-0 flex-1">
          <RunSimulatorResult product={product} sim={sim} />
        </ScrollArea>
      </div>
    </div>
  );
}
