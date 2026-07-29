"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Search, IdCard, Download, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { JobTitle } from "@/lib/types";
import { downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

const BLANK = { name: "" };
const PAGE_SIZE = 10;
type SortKey = "name" | "createdAt";

// Job Titles & Permissions — a reusable named-title catalog that populates
// the Job Title dropdown in Add/Edit User (see JobTitle in types.ts). Purely
// a name list: System Permissions and Maker-Checker approval categories are
// each chosen independently on the user record, not bundled here.
export function JobTitleManager() {
  const jobTitles = useAppStore((s) => s.jobTitles);
  const addJobTitle = useAppStore((s) => s.addJobTitle);
  const updateJobTitle = useAppStore((s) => s.updateJobTitle);
  const deleteJobTitle = useAppStore((s) => s.deleteJobTitle);

  const [editing, setEditing] = useState<JobTitle | null>(null);
  const [draft, setDraft] = useState<{ name: string }>(BLANK);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<JobTitle | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);

  const filteredJobTitles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = !q ? jobTitles : jobTitles.filter((jt) => jt.name.toLowerCase().includes(q));
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) =>
      sort.key === "name"
        ? a.name.localeCompare(b.name) * dir
        : (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
    );
  }, [jobTitles, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredJobTitles.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedJobTitles = filteredJobTitles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
    setPage(1);
  };
  const sortIndicator = (key: SortKey) =>
    sort.key === key ? (sort.dir === "asc" ? <ChevronUp className="inline size-3" /> : <ChevronDown className="inline size-3" />) : null;

  const exportCsv = () => {
    downloadCsv(
      "job_titles",
      filteredJobTitles.map((jt) => ({
        "Job Title": jt.name,
        "Created Date": new Date(jt.createdAt).toLocaleDateString(),
      }))
    );
    toast.success(`Exported ${filteredJobTitles.length} job title${filteredJobTitles.length === 1 ? "" : "s"}.`);
  };

  const startCreate = () => {
    setEditing(null);
    setDraft(BLANK);
    setOpen(true);
  };
  const startEdit = (jobTitle: JobTitle) => {
    setEditing(jobTitle);
    setDraft({ name: jobTitle.name });
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Job title name is required.");
      return;
    }
    if (editing) {
      updateJobTitle(editing.id, { name: draft.name.trim() });
      toast.success(`"${draft.name}" updated.`);
      setOpen(false);
      return;
    }
    const result = addJobTitle({ name: draft.name });
    if (!result.ok) {
      toast.error(result.reason ?? "Couldn't add this job title.");
      return;
    }
    toast.success(`"${draft.name}" added — available now in User Management's Add/Edit User dialog.`);
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteJobTitle(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search job titles..."
              className="h-9 pl-8 text-sm"
            />
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
            {filteredJobTitles.length} Job Titles
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
            <Download className="size-3.5" /> Export
          </Button>
          <Button size="sm" className="gap-1.5 font-medium shadow-xs" onClick={startCreate}>
            <Plus className="size-3.5" /> Add Job Title
          </Button>
        </div>
      </div>

      {/* Job Titles Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                Job Title {sortIndicator("name")}
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("createdAt")}>
                Created Date {sortIndicator("createdAt")}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedJobTitles.map((jobTitle) => (
              <TableRow key={jobTitle.id}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <IdCard className="size-3.5" />
                    </span>
                    {jobTitle.name}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{new Date(jobTitle.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-0.5">
                    <Button variant="ghost" size="icon-sm" onClick={() => startEdit(jobTitle)} title="Edit Job Title">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="hover:text-destructive"
                      onClick={() => setPendingDelete(jobTitle)}
                      title="Delete Job Title"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paginatedJobTitles.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                  {search
                    ? "No job titles match your search."
                    : "No job titles found — add one to make it selectable in User Management's Add/Edit User dialog."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="outline" size="icon-sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="px-1 text-sm text-muted-foreground">Page {safePage} of {totalPages}</span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Job Title" : "Add Job Title"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-sm">Job Title Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ name: e.target.value })}
                placeholder="e.g. Credit Risk Manager"
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancel</DialogClose>
            <Button size="sm" onClick={save}>{editing ? "Save Changes" : "Add Job Title"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              This only removes it from the Job Title dropdown — any user already using this title keeps it as free text; you&apos;d need to update them individually going forward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction size="sm" onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
