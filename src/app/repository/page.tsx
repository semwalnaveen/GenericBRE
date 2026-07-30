"use client";

import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Download, Upload, Plus, AlertTriangle, X, ShieldAlert, CheckCircle2, XCircle, FileWarning, Info } from "lucide-react";
import { toast } from "sonner";
import { useAppStore, useHasCapability } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiSelect } from "@/components/ui/multi-select";
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
import { buildColumns } from "@/components/repository/columns";
import { DataTable } from "@/components/repository/data-table";
import { RuleViewSheet } from "@/components/repository/rule-view-sheet";
import { downloadCsv, parseCsv } from "@/lib/csv";
import { emptyGroup } from "@/lib/condition-tree";
import { BusinessRule } from "@/lib/types";
import { detectConflictsForCandidate, RuleConflict } from "@/lib/conflict-detection";
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
  const approveRule = useAppStore((s) => s.approveRule);
  const rejectRule = useAppStore((s) => s.rejectRule);
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
  const [statuses, setStatuses] = useState<string[]>(searchParams.get("status") ? [searchParams.get("status")!] : []);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [viewRule, setViewRule] = useState<BusinessRule | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [approvalConfirm, setApprovalConfirm] = useState<{ rule: BusinessRule; conflicts: RuleConflict[] } | null>(null);
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
      conditionSummaries: JSON.stringify(r.conditionSummaries),
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
        let conditionSummaries = [];
        try { actions = row.actions ? JSON.parse(row.actions) : []; } catch {}
        try { elseActions = row.elseActions ? JSON.parse(row.elseActions) : undefined; } catch {}
        try { conditionSummaries = row.conditionSummaries ? JSON.parse(row.conditionSummaries) : []; } catch {}
        
        const newRule: BusinessRule = {
          ...row,
          id,
          name: `${row.name || "Imported"} (Copy)`,
          status: "Draft",
          actions,
          elseActions,
          conditionSummaries,
        };
        addRule(newRule);
        importedCount++;
      });
      toast.success(`Imported ${importedCount} rules as Drafts`);
      if (importRef.current) importRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const performApprove = useCallback(
    (rule: BusinessRule) => {
      const result = approveRule(rule.id);
      if (result.ok) {
        toast.success(`${rule.id} approved & published`, { description: `${rule.name} is now live.` });
      } else {
        toast.error("Approval blocked", { description: result.reason });
      }
    },
    [approveRule]
  );

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const m = r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
        if (!m) return false;
      }
      if (statuses.length > 0 && !statuses.includes(r.status)) return false;
      if (categoryFilters.length > 0 && !categoryFilters.includes(r.category)) return false;
      return true;
    });
  }, [rules, search, statuses, categoryFilters]);

  const columns = useMemo(
    () =>
      buildColumns(
        {
          onView: (r) => {
            setViewRule(r);
            setViewOpen(true);
          },
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
          onApprove: (r) => {
            const candidateConflicts = detectConflictsForCandidate(r, rules);
            if (candidateConflicts.length > 0) {
              setApprovalConfirm({ rule: r, conflicts: candidateConflicts });
            } else {
              performApprove(r);
            }
          },
          onReject: (r) => {
            const result = rejectRule(r.id);
            if (result.ok) {
              toast.info(`${r.id} rejected`, { description: `${r.name} sent back — edit and resubmit.` });
            } else {
              toast.error("Action blocked", { description: result.reason });
            }
          },
          onReactivate: (r) => {
            const result = setRuleStatus(r.id, "Published");
            if (result.ok) {
              toast.success(`${r.id} re-activated`);
            } else {
              toast.error("Action blocked", { description: result.reason });
            }
          },
          onPromote: (_r) => {},
          onTestInSimulator: (r) => {
            router.push(`/simulator?domain=${r.domain}&sandboxRule=${r.id}`);
          },
          onDelete: (r) => setDeleteConfirm(r),
        },
        { canPublish, canCreate, canEdit, canDelete, ruleGroups, products, productRuleMappings, approvalRequests }
      ),
    [router, cloneRule, setRuleStatus, rejectRule, canPublish, canCreate, canEdit, canDelete, ruleGroups, rules, performApprove, products, productRuleMappings, approvalRequests]
  );

  const clearAll = () => {
    setSearch("");
    setStatuses([]);
    setCategoryFilters([]);
  };

  const hasFilters = Boolean(search || statuses.length || categoryFilters.length);

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
        <div className={criticalConflicts.length > 0 ? "flex shrink-0 items-center justify-between gap-3 border-b bg-destructive/10 px-5 py-2 text-sm sm:px-6" : "flex shrink-0 items-center justify-between gap-3 border-b bg-amber-500/10 px-5 py-2 text-sm sm:px-6"}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className={criticalConflicts.length > 0 ? "flex items-center gap-1.5 font-semibold text-destructive" : "flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400"}>
              <ShieldAlert className="size-4 shrink-0" />
              <span>
                Product-Level Rule Conflicts: {criticalConflicts.length > 0 ? `${criticalConflicts.length} Critical` : ""}{criticalConflicts.length > 0 && mediumConflicts.length > 0 ? ", " : ""}{mediumConflicts.length > 0 ? `${mediumConflicts.length} Duplicate Warning${mediumConflicts.length > 1 ? "s" : ""}` : ""}
              </span>
            </div>
            <div className="hidden md:flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {productConflicts.slice(0, 2).map(({ productName, finding }, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  <span className="font-medium text-foreground">[{productName}]</span>
                  <span className="text-muted-foreground font-mono">Rule {finding.ruleAId} vs {finding.ruleBId}</span>
                  <span className="text-muted-foreground">— {finding.reason}</span>
                </span>
              ))}
              {productConflicts.length > 2 && (
                <span className="text-muted-foreground/70">+{productConflicts.length - 2} more</span>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs shrink-0 font-medium"
            onClick={() => setReportModalOpen(true)}
          >
            View Conflict Report
          </Button>
        </div>
      )}

      {/* FILTER TOOLBAR */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-card/40 px-5 py-2.5 sm:px-6">
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

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 gap-1 px-2 text-xs text-muted-foreground">
            <X className="size-3" /> Reset filters
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 p-5 sm:p-6">
        <DataTable
          columns={columns}
          data={filtered}
          onSelectionChange={setSelectedRows}
          resetSelectionSignal={resetSelectionSignal}
        />
      </div>

      <RuleViewSheet open={viewOpen} onOpenChange={setViewOpen} rule={viewRule} />

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

      <AlertDialog open={!!approvalConfirm} onOpenChange={(v) => !v && setApprovalConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" /> Possible conflict detected
            </AlertDialogTitle>
            <AlertDialogDescription>
              Publishing {approvalConfirm?.rule.id} would create
              {approvalConfirm && approvalConfirm.conflicts.length > 1 ? " these conflicts" : " this conflict"} with
              rules already Active. You can still approve — this is advisory, not a hard block.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="space-y-1.5 rounded-lg border bg-destructive/5 p-2.5 text-sm">
            {approvalConfirm?.conflicts.map((c, i) => (
              <li key={i} className="text-destructive">
                {c.ruleAId} vs {c.ruleBId} — {c.reason}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (approvalConfirm) performApprove(approvalConfirm.rule);
                setApprovalConfirm(null);
              }}
            >
              Approve Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" /> Delete {deleteConfirm?.id} permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteConfirm?.name} and its condition/action definitions for good — unlike Archive, this
              can&apos;t be undone. Its version history and audit trail entries stay for the record, but the rule
              itself is gone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteConfirm) return;
                const result = deleteRule(deleteConfirm.id);
                if (result.ok) {
                  toast.success(`${deleteConfirm.id} deleted permanently`);
                } else {
                  toast.error("Delete blocked", { description: result.reason });
                }
                setDeleteConfirm(null);
              }}
            >
              Delete Permanently
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
