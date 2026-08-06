"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Download, Upload, Plus, AlertTriangle, X, ShieldAlert, CheckCircle2, XCircle, FileWarning, Info, Columns3, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAppStore, useHasCapability } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { buildColumns } from "@/components/repository/columns";
import { DataTable } from "@/components/repository/data-table";
import { downloadCsv, parseCsv } from "@/lib/csv";
import { emptyGroup } from "@/lib/condition-tree";
import { BusinessRule } from "@/lib/types";
import { detectProductRuleConflicts, ProductConflictFinding } from "@/lib/product-conflict-detection";

function nextRuleId(existing: BusinessRule[], taken: Set<string>) {
  const nums = existing.map((r) => parseInt(r.id.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
  let max = nums.length ? Math.max(...nums) : 100;
  let id = `RL-${max + 1}`;
  while (taken.has(id)) {
    max += 1;
    id = `RL-${max + 1}`;
  }
  taken.add(id);
  return id;
}

function RepositoryContent() {
  const rules = useAppStore((s) => s.rules);
  const addRule = useAppStore((s) => s.addRule);
  const cloneRule = useAppStore((s) => s.cloneRule);
  const setRuleStatus = useAppStore((s) => s.setRuleStatus);
  const products = useAppStore((s) => s.products);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const approvalRequests = useAppStore((s) => s.approvalRequests);
  const deleteRule = useAppStore((s) => s.deleteRule);
  const industries = useAppStore((s) => s.industries);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const ruleGroups = useAppStore((s) => s.ruleGroups);
  const canPublish = useHasCapability("rule.publish");
  const canCreate = useHasCapability("rule.create");
  const canEdit = useHasCapability("rule.edit");
  const canDelete = useHasCapability("rule.delete");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statuses, setStatuses] = useState<string[]>(searchParams.getAll("status").length > 0 ? searchParams.getAll("status") : []);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [productFilters, setProductFilters] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<BusinessRule | null>(null);
  const [selectedRows, setSelectedRows] = useState<BusinessRule[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [resetSelectionSignal, setResetSelectionSignal] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);

  // Product-Level Rule Conflict Detection — evaluate all mapped products
  const productConflicts = useMemo(() => {
    const out: { productId: string; productName: string; finding: ProductConflictFinding }[] = [];
    for (const p of products) {
      const findings = detectProductRuleConflicts(p.id, rules, productRuleMappings);
      for (const finding of findings) {
        out.push({ productId: p.id, productName: p.name, finding });
      }
    }
    return out;
  }, [products, rules, productRuleMappings]);

  const criticalConflicts = useMemo(() => productConflicts.filter((c) => c.finding.severity === "Critical"), [productConflicts]);
  const mediumConflicts = useMemo(() => productConflicts.filter((c) => c.finding.severity === "Medium"), [productConflicts]);

  const clearSelection = () => {
    setSelectedRows([]);
    setResetSelectionSignal((n) => n + 1);
  };

  const handleExport = () => {
    const toExport = selectedRows.length > 0 ? selectedRows : filtered;
    if (toExport.length === 0) {
      toast.warning("No rules to export");
      return;
    }
    const exportData = toExport.map((r) => ({
      ...r,
      actions: JSON.stringify(r.actions),
      elseActions: r.elseActions ? JSON.stringify(r.elseActions) : "",
      rootGroup: JSON.stringify(r.rootGroup),
    }));
    downloadCsv("genericbre_rules", exportData as Record<string, unknown>[]);
    toast.success(`Exported ${exportData.length} rules`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const data = parseCsv(text);
      let importedCount = 0;
      data.forEach((row: any) => {
        const taken = new Set(useAppStore.getState().rules.map((r) => r.id));
        const id = nextRuleId(useAppStore.getState().rules, taken);

        let actions = [];
        let elseActions = undefined;
        let rootGroup: any = { operator: "AND", conditions: [] };
        try { actions = row.actions ? JSON.parse(row.actions) : []; } catch { }
        try { elseActions = row.elseActions ? JSON.parse(row.elseActions) : undefined; } catch { }
        try { rootGroup = row.rootGroup ? JSON.parse(row.rootGroup) : { operator: "AND", conditions: [] }; } catch { }

        const newRule: BusinessRule = {
          ...row,
          id,
          name: `${row.name || "Imported"} (Copy)`,
          status: "Draft",
          actions,
          elseActions,
          rootGroup,
        };
        addRule(newRule);
        importedCount++;
      });
      toast.success(`Imported ${importedCount} rules as Drafts`);
      if (importRef.current) importRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const m = r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
        if (!m) return false;
      }
      if (statuses.length > 0 && !statuses.includes(r.status)) return false;
      if (categoryFilters.length > 0 && !categoryFilters.includes(r.category)) return false;
      if (productFilters.length > 0) {
        const mappedToSelectedProducts = productRuleMappings.some(
          (m) => m.ruleId === r.id && m.active && productFilters.includes(m.productId)
        );
        if (!mappedToSelectedProducts) return false;
      }
      return true;
    });
  }, [rules, search, statuses, categoryFilters, productFilters, productRuleMappings]);

  const columns = useMemo(
    () =>
      buildColumns(
        {
          onView: (r) => router.push(`/repository/view?id=${r.id}`),
          onEdit: (r) => router.push(`/rule-builder?id=${r.id}`),
          onClone: (r) => {
            const result = cloneRule(r.id);
            if (result.ok) {
              toast.success(`Cloned ${r.id} → ${result.newId}`, { description: "New rule saved as Draft." });
            } else {
              toast.error("Clone blocked", { description: result.reason });
            }
          },
          onDisable: (r) => {
            const result = setRuleStatus(r.id, "Inactive");
            if (result.ok) {
              toast.info(`${r.id} disabled`, { description: `${r.name} removed from live evaluation.` });
            } else {
              toast.error("Action blocked", { description: result.reason });
            }
          },
          onArchive: (r) => {
            const result = setRuleStatus(r.id, "Archived");
            if (result.ok) {
              toast.info(`${r.id} archived`);
            } else {
              toast.error("Action blocked", { description: result.reason });
            }
          },
          onSubmitForReview: (r) => router.push(`/rule-builder/mapping?ruleId=${r.id}`),
          onReactivate: (r) => {
            const result = setRuleStatus(r.id, "Published");
            if (result.ok) {
              toast.success(`${r.id} re-activated`);
            } else {
              toast.error("Action blocked", { description: result.reason });
            }
          },
          onPromote: (_r) => { },
          onTestInSimulator: (r) => {
            router.push(`/simulator?domain=${r.domain}&sandboxRule=${r.id}`);
          },
          onDelete: (r) => setDeleteConfirm(r),
        },
        { canPublish, canCreate, canEdit, canDelete, ruleGroups, products, productRuleMappings, approvalRequests }
      ),
    [router, cloneRule, setRuleStatus, canPublish, canCreate, canEdit, canDelete, ruleGroups, products, productRuleMappings, approvalRequests]
  );

  const clearAll = () => {
    setSearch("");
    setStatuses([]);
    setCategoryFilters([]);
    setProductFilters([]);
  };

  const hasFilters = Boolean(search || statuses.length || categoryFilters.length || productFilters.length);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-card/60 px-5 py-3.5 backdrop-blur-sm sm:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Rule Repository</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
              {rules.length} Rules
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">Searchable catalogue of every configured business rule</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept=".csv" className="hidden" ref={importRef} onChange={handleImport} />
          <Button variant="outline" size="sm" className="gap-1.5 shadow-xs" onClick={() => importRef.current?.click()}>
            <Upload className="size-3.5" /> Import
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 shadow-xs" onClick={handleExport}>
            <Download className="size-3.5" /> Export {selectedRows.length > 0 ? `(${selectedRows.length})` : ""}
          </Button>
          {canCreate && (
            <Button size="sm" className="gap-1.5 shadow-xs font-medium" onClick={() => router.push("/rule-builder")}>
              <Plus className="size-3.5" /> Create Rule
            </Button>
          )}
        </div>
      </div>

      {/* PRODUCT-LEVEL RULE CONFLICT DETECTION BANNER */}
      {productConflicts.length > 0 && (
        <div className={cn(
          "relative z-10 flex shrink-0 items-center justify-between gap-4 border-b px-5 py-2.5 sm:px-6 overflow-hidden",
          criticalConflicts.length > 0 ? "bg-red-500/5 border-red-500/15" : "bg-amber-500/5 border-amber-500/15"
        )}>
          {/* Subtle gradient glow */}
          <div className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r to-transparent opacity-60",
            criticalConflicts.length > 0 ? "from-red-500/10" : "from-amber-500/10"
          )} />

          <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2 w-full">
            <div className="flex items-center gap-2.5">
              <span className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg shadow-sm border",
                criticalConflicts.length > 0 ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30" : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
              )}>
                <ShieldAlert className="size-4" />
              </span>
              <span className={cn(
                "font-bold tracking-tight",
                criticalConflicts.length > 0 ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
              )}>
                Product Conflicts
                <Badge variant="outline" className={cn(
                  "ml-2.5 h-5 rounded-full px-2 font-mono text-[10px] font-bold shadow-xs",
                  criticalConflicts.length > 0 ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400" : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                )}>
                  {criticalConflicts.length > 0 ? `${criticalConflicts.length} Critical` : ""}{criticalConflicts.length > 0 && mediumConflicts.length > 0 ? ", " : ""}{mediumConflicts.length > 0 ? `${mediumConflicts.length} Warning${mediumConflicts.length > 1 ? "s" : ""}` : ""}
                </Badge>
              </span>
            </div>

            <div className="hidden lg:flex flex-1 items-center gap-x-3 gap-y-1 text-xs">
              {productConflicts.slice(0, 1).map(({ productName, finding }, i) => (
                <div key={i} className="flex items-center gap-2 overflow-hidden rounded-md border border-border/60 bg-background/60 px-2 py-1 shadow-xs backdrop-blur-sm max-w-[600px] hover:border-border/90 transition-colors">
                  <span className="shrink-0 rounded bg-muted/80 px-1.5 py-0.5 font-medium text-foreground text-[11px] uppercase tracking-wider">
                    {productName}
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground/80 font-medium">
                    {finding.ruleAId} <span className="text-muted-foreground/40 text-[10px] px-0.5">vs</span> {finding.ruleBId}
                  </span>
                  <span className="truncate text-muted-foreground font-medium pr-1">
                    — {finding.reason}
                  </span>
                </div>
              ))}
              {productConflicts.length > 1 && (
                <span className="text-muted-foreground/60 font-medium text-[11px] uppercase tracking-wider">+{productConflicts.length - 1} more</span>
              )}
            </div>
          </div>

          <Button
            size="sm"
            className={cn(
              "relative h-8 shrink-0 gap-1.5 text-xs font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
              criticalConflicts.length > 0 ? "bg-red-600 hover:bg-red-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"
            )}
            onClick={() => setReportModalOpen(true)}
          >
            View Report <ArrowRight className="size-3.5" />
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 p-5 sm:p-6">
        <DataTable
          columns={columns}
          data={filtered}
          onSelectionChange={setSelectedRows}
          resetSelectionSignal={resetSelectionSignal}
          renderTopToolbar={(table) => (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-card/40 px-5 py-2.5 sm:px-6 -mx-5 -mt-5 mb-2 sm:-mx-6 sm:-mt-6 sm:mb-2">
              <div className="relative min-w-48 flex-1 sm:max-w-64">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search rules, categories..."
                  className="h-8 pl-8 text-sm"
                />
              </div>

              <MultiSelect
                label="Status"
                options={[
                  { value: "Draft", label: "Draft" },
                  { value: "Pending Approval", label: "Pending Approval" },
                  { value: "Published", label: "Published" },
                  { value: "Inactive", label: "Inactive" },
                  { value: "Archived", label: "Archived" },
                ]}
                selected={statuses}
                onChange={setStatuses}
              />

              <MultiSelect
                label="Category"
                options={ruleCategories.map((c) => ({ value: c.name, label: c.name }))}
                selected={categoryFilters}
                onChange={setCategoryFilters}
              />

              <MultiSelect
                label="Product"
                options={products.map((p) => ({ value: p.id, label: p.name }))}
                selected={productFilters}
                onChange={setProductFilters}
              />

              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-xs" />}>
                  <Columns3 className="size-3.5" /> Columns
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {table
                    .getAllColumns()
                    .filter((c: any) => c.getCanHide())
                    .map((c: any) => (
                      <DropdownMenuCheckboxItem
                        key={c.id}
                        checked={c.getIsVisible()}
                        onCheckedChange={(v) => c.toggleVisibility(!!v)}
                        className="capitalize"
                      >
                        {c.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 gap-1 px-2 text-xs text-muted-foreground">
                  <X className="size-3" /> Reset filters
                </Button>
              )}
            </div>
          )}
        />
      </div>

      {/* PRODUCT-LEVEL RULE CONFLICT DETECTION REPORT MODAL */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-500" />
              Product-Level Rule Conflict Detection Report
            </DialogTitle>
            <DialogDescription>
              Evaluates all mapped products for contradictory decisions, overlapping thresholds, and duplicate rules mapped to the same product.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center bg-card">
                <p className="text-xs text-muted-foreground font-medium">Mapped Products Analyzed</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{products.length}</p>
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

            <ScrollArea className="max-h-[380px] space-y-3">
              <div className="space-y-3 pr-2">
                {productConflicts.map(({ productName, finding: c }, idx) => (
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
                          [{productName}] Rule {c.ruleAId} ({c.ruleAName}) vs Rule {c.ruleBId} ({c.ruleBName})
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportModalOpen(false)}>
              Close Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" /> Request Deletion of {deleteConfirm?.id}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will submit a deletion request for {deleteConfirm?.name} to be reviewed by a Checker. The rule will enter a &quot;Pending Deletion&quot; state until it is approved or rejected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteConfirm) return;
                const result = deleteRule(deleteConfirm.id);
                if (result.ok) {
                  toast.success(`Deletion request submitted for ${deleteConfirm.id}`);
                } else {
                  toast.error("Delete blocked", { description: result.reason });
                }
                setDeleteConfirm(null);
              }}
            >
              Request Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default function RepositoryPage() {
  return (
    <Suspense fallback={null}>
      <RepositoryContent />
    </Suspense>
  );
}
