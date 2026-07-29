"use client";

import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Download, Upload, Plus, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { useAppStore, useHasCapability } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { buildColumns } from "@/components/repository/columns";
import { DataTable } from "@/components/repository/data-table";
import { RuleViewSheet } from "@/components/repository/rule-view-sheet";
import { MapToProductDialog } from "@/components/rule-builder/map-to-product-dialog";
import { downloadCsv, parseCsv } from "@/lib/csv";
import { emptyGroup } from "@/lib/condition-tree";
import { BusinessRule } from "@/lib/types";
import { detectRuleConflicts, detectConflictsForCandidate, RuleConflict } from "@/lib/conflict-detection";

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
  const publishRule = useAppStore((s) => s.publishRule);
  const products = useAppStore((s) => s.products);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const approvalRequests = useAppStore((s) => s.approvalRequests);
  // promoteRuleEnvironment removed — FUTURE: restore when environment promotion is reintroduced
  // const promoteRuleEnvironment = useAppStore((s) => s.promoteRuleEnvironment);
  const deleteRule = useAppStore((s) => s.deleteRule);
  const industries = useAppStore((s) => s.industries);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  // owners selector removed — FUTURE: restore when Owner is reintroduced
  // const owners = useAppStore((s) => s.owners);
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
  // ownerFilters removed — FUTURE: restore when Owner is reintroduced
  // groupFilters removed — Rule Group is no longer a filter dimension, see docs/plan history
  // environmentFilters removed — FUTURE: restore when environment promotion is reintroduced
  const [viewRule, setViewRule] = useState<BusinessRule | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [approvalConfirm, setApprovalConfirm] = useState<{ rule: BusinessRule; conflicts: RuleConflict[] } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BusinessRule | null>(null);
  const [selectedRows, setSelectedRows] = useState<BusinessRule[]>([]);
  // "Submit Rule" from the Repository opens the same Map-to-Product dialog the
  // Rule Builder uses, so a Draft can be mapped + submitted without re-editing.
  const [mapDialogRule, setMapDialogRule] = useState<BusinessRule | null>(null);
  const [resetSelectionSignal, setResetSelectionSignal] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);

  const conflicts = useMemo(() => detectRuleConflicts(rules), [rules]);

  const clearSelection = () => {
    setSelectedRows([]);
    setResetSelectionSignal((n) => n + 1);
  };

  function runBulk(label: string, action: (r: BusinessRule) => { ok: boolean; reason?: string }) {
    let succeeded = 0;
    const failures: string[] = [];
    for (const r of selectedRows) {
      const result = action(r);
      if (result.ok) succeeded++;
      else failures.push(`${r.id}${result.reason ? `: ${result.reason}` : ""}`);
    }
    if (succeeded > 0) {
      toast.success(`${label}: ${succeeded} of ${selectedRows.length} rule${selectedRows.length === 1 ? "" : "s"}${failures.length ? `, ${failures.length} blocked` : ""}`, {
        description: failures.length ? failures.slice(0, 4).join(" · ") + (failures.length > 4 ? " …" : "") : undefined,
      });
    } else {
      toast.error(`${label} blocked for all ${selectedRows.length} selected rule(s)`, {
        description: failures.slice(0, 4).join(" · "),
      });
    }
    clearSelection();
  }

  const handleImportFile = (file: File) => {
    const finish = (rows: Record<string, string>[]) => {
      const taken = new Set(rules.map((r) => r.id));
      let added = 0;
      const skipped: string[] = [];
      rows.forEach((row, i) => {
        const name = row.name || row.Name;
        const domain = row.domain || row.Domain;
        const category = row.category || row.Category;
        const owner = row.owner || row.Owner;
        const priority = Number(row.priority || row.Priority || 3);
        if (!name || !domain || !category || !owner) {
          skipped.push(`Row ${i + 2}: missing name, domain, category or owner`);
          return;
        }
        const rule: BusinessRule = {
          id: nextRuleId(rules, taken),
          name,
          domain,
          category,
          subCategory: "",
          priority: (Number.isFinite(priority) ? Math.min(5, Math.max(1, priority)) : 3) as BusinessRule["priority"],
          status: "Draft",
          // environment removed — FUTURE: restore when environment promotion is reintroduced
          description: row.description || row.Description || "",
          owner,
          rootGroup: emptyGroup("AND"),
          actions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          simulatable: true,
        };
        const result = addRule(rule);
        if (result.ok) added++;
        else skipped.push(`${rule.id}: ${result.reason}`);
      });
      toast.success(`Import complete: ${added} rule${added === 1 ? "" : "s"} added as Draft${skipped.length ? `, ${skipped.length} skipped` : ""}.`, {
        description: skipped.length ? skipped.slice(0, 5).join(" · ") + (skipped.length > 5 ? " …" : "") : "Open each in Rule Builder to finish its conditions & actions.",
      });
    };

    if (file.name.endsWith(".json")) {
      file.text().then((text) => {
        try {
          const data = JSON.parse(text);
          finish(Array.isArray(data) ? data : [data]);
        } catch {
          toast.error("Invalid JSON file.");
        }
      });
    } else {
      file.text().then((text) => finish(parseCsv(text)));
    }
  };

  const performApprove = useCallback(
    (r: BusinessRule) => {
      const result = approveRule(r.id);
      if (result.ok) {
        toast.success(`${r.id} approved`, { description: `${r.name} is Approved — publish it to go live.` });
      } else {
        toast.error("Approval blocked", { description: result.reason });
      }
    },
    [approveRule]
  );

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      if (search && !`${r.name} ${r.id}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (statuses.length && !statuses.includes(r.status)) return false;
      if (categoryFilters.length && !categoryFilters.includes(r.category)) return false;
      // owner filter removed — FUTURE: restore when Owner is reintroduced
      // group filter removed — Rule Group is no longer a filter dimension
      // environment filter removed — FUTURE: restore when environment promotion is reintroduced
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
          onSubmitForReview: (r) => setMapDialogRule(r),
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
          onPublish: (r) => {
            const result = publishRule(r.id);
            if (result.ok) {
              toast.success(`${r.id} published`, { description: `${r.name} is now live.` });
            } else {
              toast.error("Publish blocked", { description: result.reason });
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
          onPromote: (_r) => {
            // Promote action disabled — FUTURE: restore when environment promotion is reintroduced
          },
          onTestInSimulator: (r) => {
            router.push(`/simulator?domain=${r.domain}&sandboxRule=${r.id}`);
          },
          onDelete: (r) => setDeleteConfirm(r),
        },
        { canPublish, canCreate, canEdit, canDelete, ruleGroups, products, productRuleMappings, approvalRequests }
      ),
    [router, cloneRule, setRuleStatus, rejectRule, publishRule, canPublish, canCreate, canEdit, canDelete, ruleGroups, rules, performApprove, products, productRuleMappings, approvalRequests]
  );

  const clearAll = () => {
    setSearch("");
    setStatuses([]);
    setCategoryFilters([]);
    // setOwnerFilters([]); // FUTURE: restore when Owner is reintroduced
    // setGroupFilters removed — Rule Group is no longer a filter dimension
    // setEnvironmentFilters([]); // FUTURE: restore when environment promotion is reintroduced
  };

  const hasFilters = Boolean(
    search ||
    statuses.length ||
    categoryFilters.length
    // ownerFilters.length || // FUTURE: restore when Owner is reintroduced
    // groupFilters.length removed — Rule Group is no longer a filter dimension
    // || environmentFilters.length // FUTURE: restore when environment promotion is reintroduced
  );

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
          <input
            ref={importRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
          {canCreate && (
            <Button variant="outline" size="sm" className="gap-1.5 shadow-2xs" onClick={() => importRef.current?.click()}>
              <Upload className="size-3.5" /> Import Rules
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shadow-2xs"
            onClick={() =>
              downloadCsv(
                "rule_repository",
                filtered.map((r) => {
                  const mapped = productRuleMappings
                    .filter((m) => m.ruleId === r.id)
                    .map((m) => products.find((p) => p.id === m.productId)?.name ?? m.productId);
                  const ars = approvalRequests.filter((a) => a.ruleId === r.id);
                  const submitted = ars[0];
                  const approved = ars.find((a) => a.stage === "Approved");
                  return {
                    RuleID: r.id,
                    Name: r.name,
                    Domain: r.domain,
                    Category: r.category,
                    "Mapped Products": mapped.join("; "),
                    Priority: r.priority,
                    "Approval Status": r.status,
                    "Submitted By": submitted?.requestedBy ?? "",
                    "Submitted Date": submitted?.requestedAt ?? "",
                    "Approved By": approved?.decidedBy ?? "",
                    "Approved Date": approved?.decidedAt ?? "",
                    UpdatedAt: r.updatedAt,
                  };
                })
              )
            }
          >
            <Download className="size-3.5" /> Export CSV
          </Button>
          {canCreate && (
            <Button size="sm" className="gap-1.5 shadow-xs font-medium" onClick={() => router.push("/rule-builder")}>
              <Plus className="size-3.5" /> Create Rule
            </Button>
          )}
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b bg-muted/20 px-5 py-1.5 text-sm text-muted-foreground sm:px-6">
          <div className="flex items-center gap-1.5 font-medium text-destructive">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>{conflicts.length} Conflict{conflicts.length > 1 ? "s" : ""}:</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {conflicts.slice(0, 2).map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <span className="font-mono font-medium text-foreground">{c.ruleAId}</span>
                <span className="text-muted-foreground/60">vs</span>
                <span className="font-mono font-medium text-foreground">{c.ruleBId}</span>
                <span className="text-muted-foreground/80">— {c.reason}</span>
              </span>
            ))}
            {conflicts.length > 2 && (
              <span className="text-muted-foreground/70">+{conflicts.length - 2} more</span>
            )}
          </div>
        </div>
      )}

      {selectedRows.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-primary/5 px-5 py-2 sm:px-6">
          <span className="text-sm font-semibold">
            {selectedRows.length} rule{selectedRows.length === 1 ? "" : "s"} selected
          </span>
          {canPublish && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-sm"
              onClick={() => runBulk("Archived", (r) => (r.status !== "Archived" ? setRuleStatus(r.id, "Archived") : { ok: false, reason: "Already archived" }))}
            >
              Archive
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-sm text-destructive hover:text-destructive"
              onClick={() => runBulk("Deleted", (r) => deleteRule(r.id))}
            >
              Delete
            </Button>
          )}
          {/* Bulk "Assign Rule Group" removed — Rule Group is no longer a filter/assignment concept in Repository */}
          <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={clearSelection}>
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 p-5 sm:p-6">
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(r) => r.id}
          onSelectionChange={setSelectedRows}
          resetSelectionSignal={resetSelectionSignal}
          leftToolbar={
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search rules by name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-72 pl-8 text-sm sm:w-80"
              />
            </div>
          }
          rightToolbar={
            <>
              <MultiSelect
                label="Status"
                options={[
                  { value: "Draft", label: "Draft" },
                  { value: "Pending Approval", label: "Pending Approval" },
                  { value: "Approved", label: "Approved" },
                  { value: "Rejected", label: "Rejected" },
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
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 px-2 text-sm">
                  Clear all
                </Button>
              )}
            </>
          }
        />
      </div>

      <RuleViewSheet rule={viewRule} open={viewOpen} onOpenChange={setViewOpen} />

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

      <MapToProductDialog
        open={!!mapDialogRule}
        onOpenChange={(v) => !v && setMapDialogRule(null)}
        rule={mapDialogRule}
      />
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
