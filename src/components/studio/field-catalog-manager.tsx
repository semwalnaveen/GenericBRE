"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Search, Download, Upload, AlertTriangle, Link2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { BusinessField, FieldDataType } from "@/lib/types";
import { fieldUsage } from "@/lib/condition-tree";
import { downloadCsv, parseCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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

// "list" is deliberately excluded — it's still a valid FieldDataType (JSON
// Mapping uses it independently for JSON array attribute inference), but no
// BusinessField consumer exists for it anymore, so it isn't offered here.
const FIELD_TYPES: FieldDataType[] = ["number", "string", "boolean", "enum", "currency", "percentage", "date"];
const STATUSES: NonNullable<BusinessField["status"]>[] = ["Active", "Draft", "Deprecated"];

const BLANK: BusinessField = { key: "", label: "", domain: "Common", type: "string", status: "Active" };

const STATUS_TONE: Record<string, string> = {
  Active: "text-emerald-600 dark:text-emerald-400",
  Draft: "text-amber-600 dark:text-amber-400",
  Deprecated: "text-muted-foreground",
};

export function FieldCatalogManager() {
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const industries = useAppStore((s) => s.industries);
  const entities = useAppStore((s) => s.entities);
  const rules = useAppStore((s) => s.rules);
  const addField = useAppStore((s) => s.addField);
  const updateField = useAppStore((s) => s.updateField);
  const deleteField = useAppStore((s) => s.deleteField);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<BusinessField>(BLANK);
  const [optionsText, setOptionsText] = useState("");
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<BusinessField | null>(null);

  const [search, setSearch] = useState("");
  const [industryFilters, setIndustryFilters] = useState<string[]>([]);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const importRef = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 6;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fieldCatalog.filter((f) => {
      if (q && !`${f.label} ${f.key} ${f.businessName ?? ""}`.toLowerCase().includes(q)) return false;
      if (industryFilters.length && !industryFilters.includes(f.domain)) return false;
      if (typeFilters.length && !typeFilters.includes(f.type)) return false;
      if (statusFilters.length && !statusFilters.includes(f.status ?? "Active")) return false;
      return true;
    });
  }, [fieldCatalog, search, industryFilters, typeFilters, statusFilters]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages);
  const paginatedFields = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const startCreate = () => {
    setEditingKey(null);
    setDraft(BLANK);
    setOptionsText("");
    setOpen(true);
  };
  const startEdit = (field: BusinessField) => {
    setEditingKey(field.key);
    setDraft(field);
    setOptionsText((field.options ?? []).join(", "));
    setOpen(true);
  };

  const save = () => {
    if (!draft.label.trim()) {
      toast.error("Field label is required.");
      return;
    }
    const key = editingKey ?? draft.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!editingKey && fieldCatalog.some((f) => f.key === key)) {
      toast.error(`A field with key "${key}" already exists.`);
      return;
    }
    const options = draft.type === "enum" ? optionsText.split(",").map((o) => o.trim()).filter(Boolean) : undefined;
    const field: BusinessField = {
      ...draft,
      key,
      options,
      status: draft.status ?? "Active",
    };

    if (editingKey) {
      updateField(editingKey, field);
      toast.success(`"${field.label}" updated.`);
    } else {
      addField(field);
      toast.success(`"${field.label}" added to the catalog — now selectable in Rule Builder & Simulator.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const usage = fieldUsage(pendingDelete.key, rules);
    if (usage.count > 0) {
      // Deletion used to proceed anyway despite the dialog's own warning,
      // silently leaving live rules pointing at a field key that no longer
      // exists (audit finding B32) — hard-block instead.
      toast.error(`Can't delete "${pendingDelete.label}"`, {
        description: `${usage.count} rule(s) still reference this field. Remove or repoint those conditions first.`,
      });
      setPendingDelete(null);
      return;
    }
    deleteField(pendingDelete.key);
    toast.info(`"${pendingDelete.label}" removed.`);
    setPendingDelete(null);
  };

  const exportCsv = () => {
    downloadCsv(
      "field_catalog",
      filtered.map((f) => ({
        Key: f.key,
        Label: f.label,
        "Business Name": f.businessName ?? "",
        Industry: f.domain,
        Entity: f.entity ?? "",
        Type: f.type,
        Unit: f.unit ?? "",
        "Source System": f.sourceSystem ?? "",
        Status: f.status ?? "Active",
        "Rule Usage": fieldUsage(f.key, rules).count,
      }))
    );
    toast.success(`Exported ${filtered.length} field${filtered.length === 1 ? "" : "s"}.`);
  };

  const handleImportFile = (file: File) => {
    file.text().then((text) => {
      const rows = parseCsv(text);
      let added = 0;
      let updated = 0;
      const skipped: string[] = [];
      for (const [i, row] of rows.entries()) {
        const key = row.Key?.trim();
        const label = row.Label?.trim();
        const domain = row.Industry?.trim();
        const type = row.Type?.trim() as FieldDataType;
        if (!key || !label || !domain || !FIELD_TYPES.includes(type)) {
          skipped.push(`Row ${i + 2}: missing/invalid Key, Label, Industry or Type`);
          continue;
        }
        const field: BusinessField = {
          key,
          label,
          businessName: row["Business Name"] || undefined,
          domain,
          entity: row.Entity || undefined,
          type,
          unit: row.Unit || undefined,
          sourceSystem: row["Source System"] || undefined,
          status: (row.Status as BusinessField["status"]) || "Active",
        };
        if (fieldCatalog.some((f) => f.key === key)) {
          updateField(key, field);
          updated++;
        } else {
          addField(field);
          added++;
        }
      }
      toast.success(`Import complete: ${added} added, ${updated} updated${skipped.length ? `, ${skipped.length} skipped` : ""}.`, {
        description: skipped.length ? skipped.slice(0, 5).join(" · ") + (skipped.length > 5 ? " …" : "") : undefined,
      });
    });
  };

  return (
    <div className="space-y-3">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <div className="relative min-w-48 flex-1 sm:max-w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by label, key or business name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-sm bg-background"
            />
          </div>
          <MultiSelect
            label="Domain"
            options={industries.map((i) => ({ value: i.id, label: i.name }))}
            selected={industryFilters}
            onChange={setIndustryFilters}
            className="h-9 text-sm"
          />
          <MultiSelect
            label="Type"
            options={FIELD_TYPES.map((t) => ({ value: t, label: t }))}
            selected={typeFilters}
            onChange={setTypeFilters}
            className="h-9 text-sm"
          />
          <MultiSelect
            label="Status"
            options={STATUSES.map((s) => ({ value: s, label: s }))}
            selected={statusFilters}
            onChange={setStatusFilters}
            className="h-9 text-sm"
          />
          {(search !== "" || industryFilters.length > 0 || typeFilters.length > 0 || statusFilters.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearch("");
                setIndustryFilters([]);
                setTypeFilters([]);
                setStatusFilters([]);
              }}
            >
              Clear all
            </Button>
          )}
        </div>

        <div className="flex shrink-0 gap-1.5">
          <input
            ref={importRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFile(file);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" className="gap-1.5 shadow-2xs text-sm" onClick={() => importRef.current?.click()}>
            <Upload className="size-3.5" /> Import
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 shadow-2xs text-sm" onClick={exportCsv}>
            <Download className="size-3.5" /> Export
          </Button>
          <Button size="sm" className="gap-1.5 shadow-xs font-medium text-sm" onClick={startCreate}>
            <Plus className="size-3.5" /> Add Field
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30 border-b border-border/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] uppercase tracking-wider font-bold text-foreground h-10">Label & Key</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-bold text-foreground h-10">Type & Entity</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-bold text-foreground h-10">Status</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wider font-bold text-foreground h-10">Used By</TableHead>
              <TableHead className="w-20 text-right text-[11px] uppercase tracking-wider font-bold text-foreground h-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedFields.map((f) => {
              const usage = fieldUsage(f.key, rules);
              const entityName = entities.find((e) => e.id === f.entity)?.name;

              return (
                <TableRow key={f.key} className="hover:bg-muted/50 transition-colors group/row border-border/50">
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-foreground tracking-tight">{f.label}</span>
                      {f.computed && (
                        <Badge variant="secondary" className="px-1.5 py-0 text-sm font-mono">
                          computed
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-sm text-muted-foreground">{f.key}</p>
                    {f.businessName && <p className="text-sm text-muted-foreground/70">{f.businessName}</p>}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-primary/5 text-primary border-primary/20">
                        {f.type}
                      </Badge>
                      {entityName && (
                        <span className="text-sm text-muted-foreground">· {entityName}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${STATUS_TONE[f.status ?? "Active"]}`}>
                      <span className="size-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                      {f.status ?? "Active"}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    {usage.count === 0 ? (
                      <span className="text-sm text-muted-foreground/60 italic">Unused</span>
                    ) : (
                      <Popover>
                        <PopoverTrigger
                          render={
                            <button className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                              <Link2 className="size-3" /> {usage.count} rule{usage.count === 1 ? "" : "s"}
                            </button>
                          }
                        />
                        <PopoverContent className="w-56 p-2">
                          <p className="mb-1.5 px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Where used</p>
                          <div className="flex flex-col gap-0.5">
                            {usage.ruleIds.slice(0, 8).map((id) => {
                              const rule = rules.find((r) => r.id === id);
                              return (
                                <Link
                                  key={id}
                                  href={`/repository?search=${id}`}
                                  className="truncate rounded-md px-1.5 py-1 text-sm hover:bg-muted"
                                >
                                  <span className="font-mono text-sm text-muted-foreground">{id}</span> {rule?.name}
                                </Link>
                              );
                            })}
                            {usage.count > 8 && (
                              <p className="px-1.5 py-1 text-sm text-muted-foreground">+{usage.count - 8} more</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button variant="ghost" size="icon-sm" className="size-7" onClick={() => startEdit(f)} title="Edit Field">
                        <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setPendingDelete(f)}
                        title="Delete Field"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No fields match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-4 py-3 text-sm text-muted-foreground bg-muted/10">
          <div>
            Showing <span className="font-semibold text-foreground">{filtered.length > 0 ? (safePage - 1) * PAGE_SIZE + 1 : 0}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min(safePage * PAGE_SIZE, filtered.length)}</span> of{" "}
            <span className="font-semibold text-foreground">{filtered.length}</span> fields
            {filtered.length !== fieldCatalog.length && (
              <span className="text-muted-foreground/70"> (filtered from {fieldCatalog.length} total)</span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon-sm"
                className="size-7"
                disabled={safePage <= 1}
                onClick={() => setPage(1)}
                title="First Page"
              >
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                className="size-7"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Previous Page"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-2 text-sm font-medium text-foreground">
                Page {safePage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                className="size-7"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title="Next Page"
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                className="size-7"
                disabled={safePage >= totalPages}
                onClick={() => setPage(totalPages)}
                title="Last Page"
              >
                <ChevronsRight className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingKey ? "Edit Field" : "Add Business Field"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Label *</Label>
              <Input
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="e.g. Policy Term (Months)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Entity</Label>
              <Select
                items={{ "": "None", ...Object.fromEntries(entities.map((e) => [e.id, e.name])) }}
                value={draft.entity ?? ""}
                onValueChange={(v) => setDraft((d) => ({ ...d, entity: v ? (v as string) : undefined }))}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data Type *</Label>
                <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: (v ?? "string") as FieldDataType }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={draft.status ?? "Active"} onValueChange={(v) => setDraft((d) => ({ ...d, status: (v ?? "Active") as BusinessField["status"] }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {draft.type === "enum" && (
              <div className="space-y-1.5">
                <Label>Options (comma-separated)</Label>
                <Input value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Low Risk, Medium Risk, High Risk" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit (optional)</Label>
                <Input value={draft.unit ?? ""} onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value || undefined }))} placeholder="₹, %, years..." />
              </div>
              <div className="space-y-1.5">
                <Label>Source System</Label>
                <Input value={draft.sourceSystem ?? ""} onChange={(e) => setDraft((d) => ({ ...d, sourceSystem: e.target.value || undefined }))} placeholder="e.g. Core Banking" />
              </div>
            </div>

            <div className="pt-3 mt-3 border-t">
              <Label className="text-sm font-semibold text-muted-foreground mb-3 block">Validation Constraints (Optional)</Label>
              
              {(draft.type === "number" || draft.type === "currency" || draft.type === "percentage") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Minimum Value</Label>
                    <Input type="number" value={draft.minValue ?? ""} onChange={(e) => setDraft((d) => ({ ...d, minValue: e.target.value ? Number(e.target.value) : undefined }))} placeholder="e.g. 0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Maximum Value</Label>
                    <Input type="number" value={draft.maxValue ?? ""} onChange={(e) => setDraft((d) => ({ ...d, maxValue: e.target.value ? Number(e.target.value) : undefined }))} placeholder="e.g. 100000" />
                  </div>
                </div>
              )}

              {draft.type === "string" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Minimum Length</Label>
                      <Input type="number" value={draft.minLength ?? ""} onChange={(e) => setDraft((d) => ({ ...d, minLength: e.target.value ? Number(e.target.value) : undefined }))} placeholder="e.g. 2" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Maximum Length</Label>
                      <Input type="number" value={draft.maxLength ?? ""} onChange={(e) => setDraft((d) => ({ ...d, maxLength: e.target.value ? Number(e.target.value) : undefined }))} placeholder="e.g. 255" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Regex Pattern</Label>
                    <Input value={draft.regexPattern ?? ""} onChange={(e) => setDraft((d) => ({ ...d, regexPattern: e.target.value || undefined }))} placeholder="e.g. ^[A-Z0-9]+$" />
                  </div>
                </div>
              )}
              
              {draft.type !== "number" && draft.type !== "currency" && draft.type !== "percentage" && draft.type !== "string" && (
                 <p className="text-sm text-muted-foreground italic">No validation constraints available for {draft.type} fields.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editingKey ? "Save Changes" : "Add Field"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" /> Delete &quot;{pendingDelete?.label}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && fieldUsage(pendingDelete.key, rules).count > 0
                ? `${fieldUsage(pendingDelete.key, rules).count} rule(s) currently reference this field — it can't be deleted until those conditions are removed or repointed to a different field.`
                : "This field isn't referenced by any rule yet. It will no longer appear in Rule Builder or Simulator."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={!!pendingDelete && fieldUsage(pendingDelete.key, rules).count > 0}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
