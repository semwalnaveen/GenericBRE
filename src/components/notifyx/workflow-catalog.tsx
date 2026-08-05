"use client";

import { useMemo, useState } from "react";
import { Search, Plus, FolderInput, PlayCircle, PauseCircle, Copy, Pencil, Eye, Download, Workflow, Zap } from "lucide-react";
import { NotifyWorkflow, NotifyCategory, NotifyTrigger } from "@/lib/types";
import { categoryClasses, NOTIFY_STATUS_STYLES } from "@/lib/notify-vocabulary";
import { downloadCsv } from "@/lib/csv";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

export function WorkflowCatalog({
  workflows,
  categories,
  triggers,
  canCreate,
  canEdit,
  canToggle,
  onCreate,
  onImportTemplate,
  onEdit,
  onView,
  onToggle,
  onClone,
}: {
  workflows: NotifyWorkflow[];
  categories: NotifyCategory[];
  triggers: NotifyTrigger[];
  canCreate: boolean;
  canEdit: boolean;
  canToggle: boolean;
  onCreate: () => void;
  onImportTemplate: () => void;
  onEdit: (wf: NotifyWorkflow) => void;
  onView: (wf: NotifyWorkflow) => void;
  onToggle: (wf: NotifyWorkflow) => void;
  onClone: (wf: NotifyWorkflow) => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const triggerById = useMemo(() => new Map(triggers.map((t) => [t.id, t])), [triggers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workflows.filter((w) => {
      if (categoryFilter.length && !categoryFilter.includes(w.categoryId)) return false;
      if (statusFilter.length && !statusFilter.includes(w.status)) return false;
      if (q) {
        const triggerLabel = triggerById.get(w.triggerId)?.label ?? "";
        const categoryName = categoryById.get(w.categoryId)?.name ?? "";
        if (
          !w.name.toLowerCase().includes(q) &&
          !triggerLabel.toLowerCase().includes(q) &&
          !categoryName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [workflows, search, categoryFilter, statusFilter, triggerById, categoryById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resetPage = () => setPage(1);

  const exportCsv = () => {
    downloadCsv(
      "notifyx_workflows",
      filtered.map((w) => ({
        ID: w.id,
        Name: w.name,
        Category: categoryById.get(w.categoryId)?.name ?? w.categoryId,
        Trigger: triggerById.get(w.triggerId)?.label ?? w.triggerId,
        Status: w.status,
        Steps: w.steps.length,
        Runs: w.runCount,
        CreatedBy: w.createdBy,
        UpdatedAt: w.updatedAt,
      }))
    );
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Workflow className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold">NotifyX</p>
            <p className="text-sm text-muted-foreground">Automate reminders, escalations, and notifications across the platform.</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="size-3.5" /> Export
          </Button>
          {canCreate && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onImportTemplate}>
              <FolderInput className="size-3.5" /> Import Template
            </Button>
          )}
          {canCreate && (
            <Button size="sm" className="gap-1.5" onClick={onCreate}>
              <Plus className="size-3.5" /> New
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            placeholder="Search workflows..."
            className="h-9 pl-8"
          />
        </div>
        <MultiSelect
          label="Category"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          selected={categoryFilter}
          onChange={(v) => { setCategoryFilter(v); resetPage(); }}
        />
        <MultiSelect
          label="Status"
          options={[
            { value: "Draft", label: "Draft" },
            { value: "Active", label: "Active" },
            { value: "Paused", label: "Paused" },
          ]}
          selected={statusFilter}
          onChange={(v) => { setStatusFilter(v); resetPage(); }}
        />
        <span className="ml-auto shrink-0 text-sm text-muted-foreground">{filtered.length} workflow{filtered.length === 1 ? "" : "s"}</span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {pageRows.map((w) => {
          const category = categoryById.get(w.categoryId);
          const trigger = triggerById.get(w.triggerId);
          return (
            <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-3.5 shadow-sm transition-all hover:bg-card/60 hover:shadow-md">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-semibold">{w.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  {category && (
                    <Badge variant="outline" className={cn("text-sm", categoryClasses(category.colorToken))}>
                      {category.name}
                    </Badge>
                  )}
                  <Badge variant="outline" className={cn("text-sm", NOTIFY_STATUS_STYLES[w.status])}>
                    {w.status}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Zap className="size-3 text-primary" /> {trigger?.label ?? w.triggerId}
                  </span>
                  <span>{w.steps.length} steps · {w.runCount} runs</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title={w.status === "Active" ? "Pause" : "Activate"}
                  onClick={() => onToggle(w)}
                  disabled={!canToggle}
                >
                  {w.status === "Active" ? <PauseCircle className="size-4" /> : <PlayCircle className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon-sm" title="Clone" onClick={() => onClone(w)} disabled={!canCreate}>
                  <Copy className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => onEdit(w)} disabled={!canEdit}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" title="View" onClick={() => onView(w)}>
                  <Eye className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {pageRows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border/50 bg-card/20 backdrop-blur-sm p-8 text-center text-sm text-muted-foreground">
            {workflows.length === 0 ? "No workflows yet." : "No workflows match your filters."}
          </p>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t pt-2.5 text-sm text-muted-foreground">
          <span>
            {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <span>Rows:</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); resetPage(); }}>
              <SelectTrigger size="sm" className="h-7 w-16"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-7" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>
              Prev
            </Button>
            <span>{safePage} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-7" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
