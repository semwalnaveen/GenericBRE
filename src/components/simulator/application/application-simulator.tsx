"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayCircle, AlertCircle, FileSearch, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { LoanApplication } from "@/lib/types";
import { getMappedRules } from "@/lib/product-rule-engine";
import {
  findApplication,
  resolveApplication,
  isResolutionError,
  ApplicationResolutionError,
} from "@/lib/applications";
import { useRunSimulator } from "@/components/simulator/run-simulator-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ApplicationSearch, ApplicationQuickPick } from "./application-search";
import { ApplicationDetailsView, ApplicationDetailsSkeleton } from "./application-details-view";
import { DecisionExplanation } from "../decision-explanation";
import { ExecutionTimeline } from "../execution-timeline";
import { VariableViewer } from "../variable-viewer";

const FETCH_LATENCY_MS = 600;

export function ApplicationSimulator() {
  const applications = useAppStore((s) => s.applications);
  const products = useAppStore((s) => s.products);
  const rules = useAppStore((s) => s.rules);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);

  const [query, setQuery] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [application, setApplication] = useState<LoanApplication | null>(null);
  const [error, setError] = useState<ApplicationResolutionError | null>(null);

  // Product is auto-identified from the fetched application (spec step 4).
  const product = useMemo(
    () => (application ? products.find((p) => p.id === application.productId) ?? null : null),
    [application, products]
  );

  // Reuse the exact single-record execution hook — no new engine. We feed it
  // the fetched application's fields and call runScenario() (spec steps 9–11).
  const sim = useRunSimulator(product);

  // The hook resets jsonText to the product's blank template whenever the
  // product changes; re-apply the fetched application's fields afterward so
  // they win in the same commit. Same localized pattern used elsewhere
  // (MapToProductDialog prefill, rule-builder reseed).
  useEffect(() => {
    if (application) {
      sim.setJsonText(JSON.stringify(application.fields, null, 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.id]);

  const quickPicks: ApplicationQuickPick[] = useMemo(
    () => {
      const lowerQuery = query.toLowerCase();
      return applications
        .filter((a) => !lowerQuery || a.id.toLowerCase().includes(lowerQuery) || a.applicantName.toLowerCase().includes(lowerQuery))
        .slice(0, 6)
        .map((a) => ({
          id: a.id,
          applicantName: a.applicantName,
          productName: products.find((p) => p.id === a.productId)?.name ?? a.productId,
        }));
    },
    [applications, products, query]
  );

  const doFetch = (idOverride?: string) => {
    const raw = idOverride ?? query;
    if (!raw.trim()) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setFetching(true);
    setError(null);
    setApplication(null);
    // Simulated network latency so the loading state (spec step 12) is real —
    // there is no backend; this is a client-side store lookup.
    setTimeout(() => {
      const found = findApplication(applications, raw);
      
      if (!found) {
        // If not found exactly, check if there are partial matches.
        // If there are partial matches, the user is likely still typing, so don't show an error.
        const hasPartialMatches = applications.some(
          (a) => a.id.toLowerCase().includes(raw.toLowerCase()) || a.applicantName.toLowerCase().includes(raw.toLowerCase())
        );
        
        if (hasPartialMatches) {
          setError(null);
        } else {
          setError({ kind: "not-found", message: `No application found matching "${raw}".` });
        }
        setApplication(null);
      } else {
        const resolved = resolveApplication(found, products, (pid) => getMappedRules(pid, rules, productRuleMappings).length);
        if (isResolutionError(resolved)) {
          setError(resolved);
          setApplication(null);
        } else {
          setApplication(resolved.application);
        }
      }
      setFetching(false);
    }, 300);
  };

  const handlePick = (id: string) => {
    setQuery(id);
    doFetch(id);
  };

  const result = sim.decisionResult;
  const executionPlan = sim.mappedRules;
  const inputJson = application ? JSON.stringify(application.fields) : "{}";

  // Auto-search (Elasticsearch style) with debounce
  useEffect(() => {
    if (!query.trim()) {
      // Clear out if empty
      setApplication(null);
      setError(null);
      setInvalid(false);
      return;
    }
    const timer = setTimeout(() => {
      doFetch(query);
    }, 300); // Snappier debounce for search
    return () => clearTimeout(timer);
  }, [query]); // eslint-disable-next-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-background p-4 sm:p-5">
      <ApplicationSearch
        value={query}
        onChange={(v) => {
          setQuery(v);
          if (invalid) setInvalid(false);
        }}
        loading={fetching}
        quickPicks={quickPicks}
        onPick={handlePick}
        invalid={invalid}
      />

      {fetching && <ApplicationDetailsSkeleton />}

      {error && !fetching && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Couldn&apos;t load this application</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {!fetching && !error && !application && (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 p-10 text-center">
            <div className="relative mb-6 flex size-32 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
              <div className="absolute inset-4 rounded-full bg-primary/10" />
              <svg className="relative size-12 text-primary/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">No application loaded</p>
            <p className="mt-1 max-w-sm mx-auto text-sm text-muted-foreground/80">
              Enter an Application ID above (or pick a sample) to fetch its data and run it through the current rules.
            </p>
          </div>
      )}

      {!fetching && application && product && (
        <>
          <ApplicationDetailsView application={application} product={product} fieldCatalog={fieldCatalog} />

          <div className="flex items-center gap-2">
            <Button
              className="h-10 flex-1 gap-1.5 text-sm font-bold shadow-sm sm:flex-none sm:px-8"
              onClick={sim.runScenario}
              disabled={sim.running}
            >
              {sim.running ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
              {sim.running ? "Executing rule pipeline…" : "Run Simulation"}
            </Button>
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">{executionPlan.length}</span> mapped rule{executionPlan.length === 1 ? "" : "s"} · sequenced
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-start">
            {/* LEFT — decision + timeline (Final Decision reused unchanged) */}
            <div className="space-y-4">
              <DecisionExplanation result={result} />
              {result && (
                <div className="rounded-xl border bg-card p-4 shadow-xs">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Execution Timeline</p>
                  <ExecutionTimeline trace={result.flatTrace} />
                </div>
              )}
            </div>

            {/* RIGHT — variable inspector + mapped-rule sequence */}
            <div className="space-y-4">
              <VariableViewer traceSteps={result?.flatTrace ?? []} jsonText={inputJson} fieldCatalog={fieldCatalog} />
              <div className="rounded-xl border bg-card p-4 shadow-xs">
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Mapped Rule Sequence ({executionPlan.length})
                </p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {executionPlan.map((rule, idx) => {
                    const step = result?.flatTrace.find((t) => t.ruleId === rule.id);
                    return (
                      <div key={rule.id} className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 p-2 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-bold text-foreground">{rule.id}</p>
                            <p className="truncate text-[11px] text-muted-foreground" title={rule.name}>{rule.name}</p>
                          </div>
                        </div>
                        {step && (
                          <Badge
                            variant={step.status === "Passed" ? "default" : step.status === "Failed" ? "destructive" : "secondary"}
                            className="h-4 shrink-0 px-1 text-[9px]"
                          >
                            {step.status}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
