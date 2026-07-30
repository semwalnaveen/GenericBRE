"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Rocket,
  AlertTriangle,
  CopyX,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileWarning,
  Info,
} from "lucide-react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useAppStore, useHasCapability } from "@/lib/store";
import { getMappedRules } from "@/lib/product-rule-engine";
import { detectProductRuleConflicts, ProductConflictFinding } from "@/lib/product-conflict-detection";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { buildSampleRequestJson } from "@/lib/sample-json";
import { collectFieldKeys } from "@/lib/condition-tree";
import { Stepper, StepperStep } from "@/components/ui/stepper";
import { MappedRulesReorder, MappedRulesChecklist } from "@/components/studio/product-rule-mapping-manager";
import { SampleJsonPanel } from "@/components/rule-builder/sample-json-panel";
import { RunSimulatorPanel } from "@/components/simulator/run-simulator-panel";
import { SimulationHistoryTab } from "@/components/products/simulation-history-tab";
import { ApiInformationTab } from "@/components/products/api-information-tab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const WORKSPACE_STEPS: StepperStep[] = [
  { id: "overview", label: "Create" },
  { id: "mapped-rules", label: "Map Rules" },
  { id: "sequence", label: "Sequence" },
  { id: "sample-json", label: "Sample JSON" },
  { id: "simulate", label: "Simulate" },
  { id: "publish", label: "Publish" },
  { id: "api", label: "API Ready" },
];

export default function ProductWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = params.id;

  const products = useAppStore((s) => s.products);
  const rules = useAppStore((s) => s.rules);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const industries = useAppStore((s) => s.industries);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const simulations = useAppStore((s) => s.simulations);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const publishProduct = useAppStore((s) => s.publishProduct);
  const saveProductRuleMapping = useAppStore((s) => s.saveProductRuleMapping);
  const canManage = useHasCapability("config.manage");

  const product = products.find((p) => p.id === productId);
  const [activeTab, setActiveTab] = useState(() => (searchParams.get("tab") === "simulate" ? "simulate" : "overview"));
  const [draft, setDraft] = useState(product);

  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [publishBlockedOpen, setPublishBlockedOpen] = useState(false);
  const [publishWarningOpen, setPublishWarningOpen] = useState(false);

  const mappedRules = useMemo(
    () => (product ? getMappedRules(product.id, rules, productRuleMappings) : []),
    [product, rules, productRuleMappings]
  );

  // Product-scoped Conflict Analysis (Critical contradictions + Medium duplicates)
  const conflicts = useMemo(
    () => (product ? detectProductRuleConflicts(product.id, rules, productRuleMappings) : []),
    [product, rules, productRuleMappings]
  );

  const criticalConflicts = useMemo(() => conflicts.filter((c) => c.severity === "Critical"), [conflicts]);
  const mediumConflicts = useMemo(() => conflicts.filter((c) => c.severity === "Medium"), [conflicts]);

  const productMappingRows = useMemo(
    () => productRuleMappings.filter((m) => m.productId === product?.id && m.active),
    [productRuleMappings, product?.id]
  );
  const productSims = useMemo(
    () => simulations.filter((s) => s.productId === product?.id),
    [simulations, product?.id]
  );
  const sampleJson = useMemo(
    () =>
      buildSampleRequestJson(
        fieldCatalog,
        Array.from(new Set(mappedRules.flatMap((r) => Array.from(collectFieldKeys(r.rootGroup)))))
      ),
    [fieldCatalog, mappedRules]
  );

  const sequenced = productMappingRows.length > 0 && productMappingRows.every((m) => m.order !== undefined);
  const published = product?.publishStatus === "Published";
  const completedStepIds = useMemo(() => {
    const done: string[] = ["overview"];
    if (mappedRules.length > 0) done.push("mapped-rules");
    if (sequenced) done.push("sequence");
    if (mappedRules.length > 0) done.push("sample-json");
    if (productSims.length > 0) done.push("simulate");
    if (published) {
      done.push("publish");
      done.push("api");
    }
    return done;
  }, [mappedRules.length, sequenced, productSims.length, published]);

  const canPublish = mappedRules.length > 0 && sequenced;

  if (!product || !draft) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">Product not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/products")}>
          <ArrowLeft className="size-3.5" /> Back to Products
        </Button>
      </div>
    );
  }

  const saveOverview = () => {
    if (!draft.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    updateProduct(product.id, {
      name: draft.name,
      domain: draft.domain,
      status: draft.status,
      description: draft.description,
    });
    toast.success("Overview saved.");
  };

  const doPublish = () => {
    const result = publishProduct(product.id);
    if (!result.ok) {
      toast.error("Publish blocked", { description: result.reason });
      return;
    }
    toast.success(`"${product.name}" published — now live via the Product API.`);
    setActiveTab("api");
  };

  const handlePublish = () => {
    if (criticalConflicts.length > 0) {
      setPublishBlockedOpen(true);
      return;
    }
    if (mediumConflicts.length > 0) {
      setPublishWarningOpen(true);
      return;
    }
    doPublish();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-3 border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/products" />}>Products</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate font-medium">{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => router.push("/products")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{product.name}</h1>
              <Badge variant="outline" className="h-5 shrink-0 font-mono text-sm bg-muted/30">{product.code}</Badge>
              <Badge variant={product.status === "Active" ? "default" : "secondary"} className="h-5 shrink-0 text-sm font-medium">
                {product.status}
              </Badge>
              <Badge variant={published ? "default" : "secondary"} className="h-5 shrink-0 text-sm font-medium">
                {product.publishStatus ?? "Draft"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {industries.find((i) => i.id === product.domain)?.name ?? product.domain} · {mappedRules.length} Mapped Rules
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-sm font-medium"
              onClick={() => setConflictModalOpen(true)}
            >
              <ShieldAlert className="size-4 text-amber-500" />
              Conflict Analysis
              {conflicts.length > 0 && (
                <Badge variant={criticalConflicts.length > 0 ? "destructive" : "secondary"} className="ml-1 px-1.5 py-0 text-[11px]">
                  {conflicts.length}
                </Badge>
              )}
            </Button>

            {!published && (
              <Button
                size="sm"
                className="shrink-0 gap-1.5 font-medium shadow-xs"
                onClick={handlePublish}
                disabled={!canPublish || !canManage}
              >
                <Rocket className="size-3.5" /> Publish
              </Button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <Stepper
            steps={WORKSPACE_STEPS}
            currentStepId={activeTab === "history" ? "simulate" : activeTab}
            completedStepIds={completedStepIds}
            onStepClick={(id) => setActiveTab(id === "publish" ? "overview" : id)}
            className="min-w-[520px] sm:min-w-0"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)} className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="mx-5 mt-3 overflow-x-auto sm:mx-6">
          <TabsList className="w-fit">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mapped-rules">Mapped Rules</TabsTrigger>
            <TabsTrigger value="sequence">Rule Sequence</TabsTrigger>
            <TabsTrigger value="sample-json">Sample JSON</TabsTrigger>
            <TabsTrigger value="simulate">Run Simulator</TabsTrigger>
            <TabsTrigger value="history">Simulation History</TabsTrigger>
            <TabsTrigger value="api">API Information</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="max-w-2xl p-5 sm:p-6">
              <div className="rounded-xl border bg-card p-5 space-y-4 shadow-2xs">
                <div className="space-y-1.5">
                  <Label className="text-sm">Product Name *</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Product Code</Label>
                    <Input value={draft.code} disabled className="font-mono text-sm bg-muted/40" />
                    <p className="text-sm text-muted-foreground/80 leading-tight">
                      Stable API identifier — non-editable to prevent breaking active API integrations.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Domain</Label>
                    <Select value={draft.domain} onValueChange={(v) => setDraft({ ...draft, domain: (v as string) ?? draft.domain })}>
                      <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {industries.map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Status</Label>
                  <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: (v as "Active" | "Inactive") ?? draft.status })}>
                    <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground/80 leading-tight">
                    Controls execution eligibility — separate from the Publish lifecycle status.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Description</Label>
                  <Textarea
                    value={draft.description ?? ""}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="Product summary and business scope..."
                    className="min-h-20 text-sm leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button size="sm" className="font-medium shadow-xs" onClick={saveOverview} disabled={!canManage}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="mapped-rules" className="min-h-0 flex-1">
          <div className="h-full space-y-4 p-5 sm:p-6">
            {conflicts.length > 0 && (
              <div className={criticalConflicts.length > 0 ? "rounded-xl border border-destructive/40 bg-destructive/10 p-4" : "rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"}>
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldAlert className="size-4" />
                    {criticalConflicts.length > 0
                      ? `${criticalConflicts.length} Critical Conflict${criticalConflicts.length === 1 ? "" : "s"} Detected (Publish Blocked)`
                      : `${mediumConflicts.length} Duplicate Rule Warning${mediumConflicts.length === 1 ? "" : "s"} Detected`}
                  </p>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setConflictModalOpen(true)}>
                    View Conflict Report
                  </Button>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {conflicts.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {c.severity === "Critical" ? (
                        <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                      ) : (
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      )}
                      <span>
                        <span className="font-medium text-foreground">
                          [{c.severity}] Rule {c.ruleAId} vs Rule {c.ruleBId}:
                        </span>{" "}
                        <span className="text-muted-foreground">{c.reason}</span>{" "}
                        <span className="text-muted-foreground/80">— Recommendation: {c.recommendation}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <MappedRulesChecklist product={product} rules={rules} ruleCategories={ruleCategories} mappings={productRuleMappings} />
          </div>
        </TabsContent>

        <TabsContent value="sequence" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-5 sm:p-6">
              <MappedRulesReorder
                product={product}
                rules={rules}
                mappings={productRuleMappings}
                onReorder={(orderedIds) => {
                  saveProductRuleMapping(product.id, orderedIds);
                  toast.success("Execution sequence updated.");
                }}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="sample-json" className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-5 sm:p-6">
              <SampleJsonPanel data={sampleJson} />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="simulate" className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
            <RunSimulatorPanel product={product} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="min-h-0 flex-1">
          <SimulationHistoryTab simulations={productSims} />
        </TabsContent>

        <TabsContent value="api" className="min-h-0 flex-1">
          <ApiInformationTab product={product} sampleInput={sampleJson} mappedRuleCount={mappedRules.length} />
        </TabsContent>
      </Tabs>

      {/* CONFLICT ANALYSIS MODAL */}
      <Dialog open={conflictModalOpen} onOpenChange={setConflictModalOpen}>
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-500" />
              Product-Level Rule Conflict Analysis — {product.name}
            </DialogTitle>
            <DialogDescription>
              Evaluates rules mapped to {product.name} for contradictory decisions, threshold collisions, and logic duplicates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center bg-card">
                <p className="text-xs text-muted-foreground font-medium">Mapped Rules</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{mappedRules.length}</p>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center">
                <p className="text-xs text-destructive font-medium">Critical Conflicts</p>
                <p className="text-xl font-bold text-destructive mt-0.5">{criticalConflicts.length}</p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-center">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Duplicate Warnings</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{mediumConflicts.length}</p>
              </div>
            </div>

            {conflicts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg bg-emerald-500/5 border-emerald-500/30">
                <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">No Product-Level Conflicts Detected</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  All {mappedRules.length} rules mapped to {product.name} evaluate clean conditions with non-conflicting actions.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[340px] space-y-3">
                <div className="space-y-3 pr-2">
                  {conflicts.map((c, idx) => (
                    <div
                      key={idx}
                      className={
                        c.severity === "Critical"
                          ? "rounded-lg border border-destructive/40 bg-destructive/5 p-3.5 space-y-2"
                          : "rounded-lg border border-amber-500/40 bg-amber-500/5 p-3.5 space-y-2"
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={c.severity === "Critical" ? "destructive" : "secondary"}>
                            {c.severity}
                          </Badge>
                          <span className="font-semibold text-sm">
                            Rule {c.ruleAId} ({c.ruleAName}) vs Rule {c.ruleBId} ({c.ruleBName})
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-background/60 p-2.5 rounded border font-mono">
                        <div>
                          <span className="text-muted-foreground block font-sans text-[11px]">Rule {c.ruleAId}</span>
                          <span className="text-foreground">{c.conditionA || c.ruleAId}</span>
                          {c.decisionA && <span className="block text-primary font-semibold mt-0.5">Decision: {c.decisionA}</span>}
                        </div>
                        <div>
                          <span className="text-muted-foreground block font-sans text-[11px]">Rule {c.ruleBId}</span>
                          <span className="text-foreground">{c.conditionB || c.ruleBId}</span>
                          {c.decisionB && <span className="block text-destructive font-semibold mt-0.5">Decision: {c.decisionB}</span>}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Reason:</strong> {c.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Recommendation:</strong> {c.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictModalOpen(false)}>
              Close Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PUBLISH BLOCKED DIALOG (CRITICAL CONFLICTS) */}
      <AlertDialog open={publishBlockedOpen} onOpenChange={setPublishBlockedOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="size-5" /> Publish Blocked: Critical Product Conflicts
            </AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{product.name}&quot; cannot be published because {criticalConflicts.length} Critical rule conflict{criticalConflicts.length === 1 ? "" : "s"} were detected in this product&apos;s mapped rules.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            {criticalConflicts.map((c, i) => (
              <div key={i} className="rounded border border-destructive/30 bg-destructive/5 p-2.5 text-xs space-y-1">
                <span className="font-semibold text-destructive">
                  Conflict {i + 1}: Rule {c.ruleAId} conflicts with Rule {c.ruleBId}
                </span>
                <p className="text-muted-foreground">{c.reason}</p>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPublishBlockedOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setPublishBlockedOpen(false); setConflictModalOpen(true); }}>
              Resolve Conflicts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PUBLISH WARNING DIALOG (DUPLICATE RULES) */}
      <AlertDialog open={publishWarningOpen} onOpenChange={setPublishWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" /> Publish Warning: Duplicate Rules
            </AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{product.name}&quot; has {mediumConflicts.length} duplicate rule warning{mediumConflicts.length === 1 ? "" : "s"}. Duplicate rules are redundant but not blocking.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            {mediumConflicts.map((c, i) => (
              <div key={i} className="rounded border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs space-y-1">
                <span className="font-semibold text-amber-700 dark:text-amber-400">
                  Duplicate Rule: Rule {c.ruleAId} duplicates Rule {c.ruleBId}
                </span>
                <p className="text-muted-foreground">{c.reason}</p>
              </div>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPublishWarningOpen(false)}>Review Duplicates</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setPublishWarningOpen(false); doPublish(); }}>
              Publish Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
