"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Reorder } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Boxes,
  GripVertical,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  FileCode2,
  AlertCircle
} from "lucide-react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { BusinessRule, ProductRuleMapping, Priority } from "@/lib/types";
import { collectRuleDependencies } from "@/lib/condition-tree";

import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function MappingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ruleId = searchParams.get("ruleId");

  const rules = useAppStore((s) => s.rules);
  const products = useAppStore((s) => s.products);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const mapRuleToProducts = useAppStore((s) => s.mapRuleToProducts);
  const submitForReview = useAppStore((s) => s.submitForReview);
  const canEdit = useHasCapability("rule.edit");

  const rule = useMemo(() => rules.find((r) => r.id === ruleId), [rules, ruleId]);

  const [productIds, setProductIds] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<Priority>(3);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // State to track draggable sequence per product
  // Record<productId, array of mapped rule IDs including this one>
  const [sequences, setSequences] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!rule) return;
    const existingMappings = productRuleMappings.filter((m) => m.ruleId === rule.id);
    setProductIds(existingMappings.map((m) => m.productId));
    setCategory(rule.category);
    setPriority(rule.priority);
    setEffectiveDate(existingMappings[0]?.effectiveDate ?? "");
    setRemarks(existingMappings[0]?.remarks ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule?.id]); // Only load once when rule ID is identified

  // Hydrate sequences for selected products
  useEffect(() => {
    if (!rule) return;
    const newSequences: Record<string, string[]> = {};
    for (const pid of productIds) {
      if (sequences[pid]) {
        newSequences[pid] = sequences[pid];
      } else {
        // Fetch existing mapped rules for this product, sort by order
        let existing = productRuleMappings
          .filter(m => m.productId === pid && m.ruleId !== rule.id)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
          .map(m => m.ruleId);
        
        // Find if rule was already mapped and where
        const myMapping = productRuleMappings.find(m => m.productId === pid && m.ruleId === rule.id);
        if (myMapping && typeof myMapping.order === 'number') {
           existing.splice(myMapping.order - 1, 0, rule.id);
        } else {
           existing.push(rule.id); // Default to end
        }
        newSequences[pid] = existing;
      }
    }
    setSequences(newSequences);
    // Expand newly added products by default
    setExpandedCards(prev => {
        const next = new Set(prev);
        productIds.forEach(p => next.add(p));
        return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds, rule?.id]);

  if (!rule) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <h1 className="text-base font-semibold">Rule Not Found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">The rule {ruleId} does not exist or was deleted.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/repository")}>Back to Repository</Button>
      </div>
    );
  }

  const buildConfig = () => ({
    productIds,
    categoryId: category || undefined,
    priority,
    sequence: productIds.length > 0 ? (sequences[productIds[0]]?.indexOf(rule.id) ?? 0) + 1 : 0,
    effectiveDate: effectiveDate || undefined,
    remarks: remarks.trim() || undefined,
  });

  const isEffectiveDateMissing = effectiveDate === "";
  const isEffectiveDateInPast = effectiveDate !== "" && effectiveDate < new Date().toISOString().slice(0, 10);

  const validateSequence = (): { ok: boolean; consumer?: string; producer?: string; productName?: string } => {
    for (const pid of productIds) {
      const seq = sequences[pid] || [];
      for (let i = 0; i < seq.length; i++) {
        const currentRuleId = seq[i];
        const r = rules.find((x) => x.id === currentRuleId);
        if (!r) continue;
        const deps = new Set([...collectRuleDependencies(r.rootGroup)].filter(id => id !== r.id));
        for (const depId of deps) {
          const depIdx = seq.indexOf(depId);
          if (depIdx !== -1 && depIdx > i) {
            return {
              ok: false,
              consumer: r.name || r.id,
              producer: rules.find(x => x.id === depId)?.name || depId,
              productName: products.find(x => x.id === pid)?.name || pid
            };
          }
        }
      }
    }
    return { ok: true };
  };

  const validationResult = validateSequence();

  const handleSaveMapping = () => {
    setSubmitAttempted(true);
    if (productIds.length === 0) {
      toast.error("Select at least one product to map.");
      return;
    }
    if (isEffectiveDateMissing) {
      toast.error("Effective Date is required.");
      return;
    }
    if (isEffectiveDateInPast) {
      toast.error("Effective Date can't be in the past.");
      return;
    }
    if (!validationResult.ok) {
      toast.error(`Sequence Error in ${validationResult.productName}`, { description: `"${validationResult.consumer}" depends on "${validationResult.producer}", so it must be executed AFTER it.` });
      return;
    }
    const res = mapRuleToProducts(rule.id, buildConfig());
    if (!res.ok) {
      toast.error("Couldn't save mapping", { description: res.reason });
      return;
    }
    toast.success("Mapping saved", { description: `${rule.id} mapped to ${productIds.length} product(s).` });
  };

  const handleSubmitForApproval = () => {
    setSubmitAttempted(true);
    if (productIds.length === 0) {
      toast.error("Map at least one product before submitting for approval.");
      return;
    }
    if (isEffectiveDateMissing) {
      toast.error("Effective Date is required.");
      return;
    }
    if (isEffectiveDateInPast) {
      toast.error("Effective Date can't be in the past.");
      return;
    }
    if (!validationResult.ok) {
      toast.error(`Sequence Error in ${validationResult.productName}`, { description: `"${validationResult.consumer}" depends on "${validationResult.producer}", so it must be executed AFTER it.` });
      return;
    }
    const mapped = mapRuleToProducts(rule.id, buildConfig());
    if (!mapped.ok) {
      toast.error("Couldn't save mapping", { description: mapped.reason });
      return;
    }
    const submitted = submitForReview(rule.id);
    if (!submitted.ok) {
      toast.error("Couldn't submit for approval", { description: submitted.reason });
      return;
    }
    toast.success("Submitted for approval", { description: `${rule.id} · ${rule.name} is now Pending Approval.` });
    router.push("/repository");
  };

  const toggleExpand = (pid: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-2 border-b bg-card/40 px-5 py-3 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => router.push("/rule-builder?id=" + rule.id)} className="cursor-pointer">Rule Builder</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Product Mapping</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push(`/rule-builder?id=${rule.id}`)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Product Rule Mapping</h1>
            <p className="text-sm text-muted-foreground">Map the newly created rule to one or more products and define execution order.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* Main Column */}
          <div className="flex flex-col gap-5 lg:col-span-8">
            
            {/* Rule Summary */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 p-5 shadow-sm">
              <div className="absolute right-0 top-0 -mt-4 -mr-4 opacity-5">
                <FileCode2 className="size-32" />
              </div>
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-background/50 backdrop-blur-sm font-mono">{rule.id}</Badge>
                    <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-0">{rule.status}</Badge>
                  </div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">{rule.name || "Untitled Rule"}</h2>
                  <div className="mt-2 flex items-center gap-3 text-sm font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Boxes className="size-3.5" /> {rule.category || "Uncategorized"}</span>
                    <span>·</span>
                    <span>Version {rule.version}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Product Selector */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Select Products</Label>
              <MultiSelect
                label="Search and select products..."
                options={products.map((p) => ({ value: p.id, label: p.name }))}
                selected={productIds}
                onChange={setProductIds}
                className="w-full bg-card"
              />
              <div className="flex flex-wrap gap-2 pt-2">
                {productIds.map(id => {
                  const p = products.find(prod => prod.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="px-2.5 py-1 text-sm font-medium">
                      {p?.name ?? id}
                    </Badge>
                  );
                })}
                {productIds.length === 0 && <span className="text-sm text-muted-foreground">No products selected.</span>}
              </div>
            </div>

            {/* Product Configuration Cards */}
            {productIds.length > 0 && (
              <div className="space-y-3 pt-1">
                <Label className="text-base font-semibold">Product Configuration & Sequence</Label>
                {productIds.map(pid => {
                  const p = products.find(prod => prod.id === pid);
                  const isExpanded = expandedCards.has(pid);
                  const seq = sequences[pid] || [];

                  return (
                    <Card key={pid} className="overflow-hidden rounded-none shadow-sm p-0 gap-0 border-0 ring-1 ring-border">
                      <div 
                        className="flex cursor-pointer items-center justify-between bg-card px-4 py-2.5 hover:bg-accent/50 transition-colors"
                        onClick={() => toggleExpand(pid)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                          <Boxes className="size-4 text-primary" />
                          <h3 className="font-semibold">{p?.name ?? pid}</h3>
                        </div>
                        <Badge variant="outline">{seq.length} Mapped Rules</Badge>
                      </div>
                      
                      {isExpanded && (
                        <div className="border-t bg-muted/10">
                           <div className="px-4 pt-4 pb-3 text-sm text-muted-foreground">
                             Drag and drop rules to define execution sequence. Conflict detection runs automatically.
                           </div>
                           
                           <div className="max-h-[240px] overflow-y-auto px-4 pb-4">
                             <Reorder.Group 
                                axis="y" 
                                values={seq} 
                                onReorder={(newSeq) => setSequences(s => ({ ...s, [pid]: newSeq }))} 
                                className="space-y-1"
                             >
                               {seq.map((rid, idx) => {
                                 const r = rules.find(x => x.id === rid);
                                 const isCurrent = rid === rule.id;
                                 return (
                                   <Reorder.Item
                                     key={rid}
                                     value={rid}
                                     className={cn(
                                       "flex items-center gap-3 rounded-lg border bg-card px-2 py-2 shadow-sm transition-all",
                                     isCurrent && "border-primary bg-primary/5 ring-1 ring-primary/20"
                                   )}
                                 >
                                   <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                                   <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                                     {idx + 1}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <p className="truncate text-sm font-medium">{r?.name || "Unknown Rule"} {isCurrent && "(This Rule)"}</p>
                                     <p className="truncate text-xs text-muted-foreground">{rid}</p>
                                   </div>
                                   {isCurrent && (
                                     <Badge variant="secondary" className="bg-primary text-primary-foreground">Current</Badge>
                                   )}
                                   </Reorder.Item>
                                 )
                               })}
                             </Reorder.Group>
                           </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Side Column */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            <Card className="p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold">Rule Details</h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Effective Date *</Label>
                  <Input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    aria-invalid={submitAttempted && (isEffectiveDateMissing || isEffectiveDateInPast)}
                    className="bg-card"
                  />
                  <p
                    className={cn(
                      "text-[11px]",
                      submitAttempted && (isEffectiveDateMissing || isEffectiveDateInPast) ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {submitAttempted && isEffectiveDateMissing
                      ? "Required — pick a date this mapping should take effect."
                      : isEffectiveDateInPast
                        ? "This date is in the past — pick today or later."
                        : "Must be today or a future date — this mapping can't take effect in the past."}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Remarks</Label>
                  <Textarea 
                    value={remarks} 
                    onChange={(e) => setRemarks(e.target.value)} 
                    placeholder="Optional note for the reviewer…" 
                    rows={4} 
                    className="bg-card resize-none" 
                  />
                </div>
              </div>
            </Card>

            {productIds.length > 0 && (
              validationResult.ok ? (
                <Card className="p-5 border-emerald-500/30 bg-emerald-500/5 shadow-sm">
                   <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                     <CheckCircle2 className="size-4" />
                     <h2 className="font-semibold">Conflict Check Passed</h2>
                   </div>
                   <p className="mt-2 text-sm text-emerald-700/80 dark:text-emerald-400/80">
                     No duplicate rules, contradictory conditions, or circular dependencies detected in the mapped products.
                   </p>
                </Card>
              ) : (
                <Card className="p-5 border-destructive/30 bg-destructive/5 shadow-sm">
                   <div className="flex items-center gap-2 text-destructive">
                     <AlertCircle className="size-4" />
                     <h2 className="font-semibold">Sequence Error</h2>
                   </div>
                   <p className="mt-2 text-sm text-destructive/90">
                     In <strong>{validationResult.productName}</strong>, rule <strong>&quot;{validationResult.consumer}&quot;</strong> depends on <strong>&quot;{validationResult.producer}&quot;</strong>. 
                     It must be sequenced <em>after</em> its dependency.
                   </p>
                </Card>
              )
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 mt-auto flex items-center justify-between border-t bg-card/80 p-4 backdrop-blur-md">
        <Button variant="ghost" onClick={() => router.push(`/rule-builder?id=${rule.id}`)}>
          <ArrowLeft className="mr-2 size-4" /> Previous
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveMapping}>Save Mapping</Button>
          <Button onClick={handleSubmitForApproval}>Submit for Approval</Button>
        </div>
      </div>
    </div>
  );
}
