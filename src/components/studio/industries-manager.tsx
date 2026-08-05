"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Industry } from "@/lib/types";
import { INDUSTRY_ICON_OPTIONS, iconForIndustry } from "@/lib/industries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const BLANK: Industry = { id: "", name: "", icon: "Building2", description: "" };

export function IndustriesManager() {
  const industries = useAppStore((s) => s.industries);
  const rules = useAppStore((s) => s.rules);
  const addIndustry = useAppStore((s) => s.addIndustry);
  const updateIndustry = useAppStore((s) => s.updateIndustry);
  const deleteIndustry = useAppStore((s) => s.deleteIndustry);

  const [editing, setEditing] = useState<Industry | null>(null);
  const [draft, setDraft] = useState<Industry>(BLANK);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Industry | null>(null);

  const startCreate = () => {
    setEditing(null);
    setDraft(BLANK);
    setOpen(true);
  };
  const startEdit = (industry: Industry) => {
    setEditing(industry);
    setDraft(industry);
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Domain name is required.");
      return;
    }
    if (editing) {
      updateIndustry(editing.id, draft);
      toast.success(`"${draft.name}" updated.`);
    } else {
      const id = draft.name.trim().replace(/\s+/g, "-");
      if (industries.some((i) => i.id === id)) {
        toast.error(`A domain with id "${id}" already exists.`);
        return;
      }
      addIndustry({ ...draft, id });
      toast.success(`"${draft.name}" added — available immediately across Rule Builder, Repository, Matrix & Simulator.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteIndustry(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {industries.length} Domain{industries.length === 1 ? "" : "s"} Configured
        </span>
        <Button size="sm" className="shrink-0 gap-1.5 shadow-sm" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Domain
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {industries.map((ind) => {
          const Icon = iconForIndustry(ind.icon);
          const ruleCount = rules.filter((r) => r.domain === ind.id).length;
          return (
            <div key={ind.id} className="group relative flex flex-col justify-between rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-3.5 transition-all duration-300 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.1)] overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-primary/20 shadow-[0_0_15px_-3px_currentColor] bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">{ind.name}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 font-mono">{ind.id}</p>
                    </div>
                  </div>
                  
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-all group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
                    <Button variant="ghost" size="icon-sm" className="size-7" onClick={() => startEdit(ind)} title="Edit Domain">
                      <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setPendingDelete(ind)} title="Delete Domain">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                
                <p className="mt-2.5 line-clamp-2 text-[11px] font-medium text-muted-foreground/80 leading-snug flex-1">
                  {ind.description || "No description provided"}
                </p>
                
                <div className="mt-3 border-t border-border/50 pt-2.5 flex items-center justify-between text-sm">
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-primary/10 text-primary">
                    {ruleCount} rule{ruleCount === 1 ? "" : "s"} attached
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {industries.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No domains configured yet. Add one to get started.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Domain" : "Add Domain"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Healthcare, Retail, Manufacturing..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select value={draft.icon} onValueChange={(v) => setDraft((d) => ({ ...d, icon: v ?? "Building2" }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDUSTRY_ICON_OPTIONS.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Shown on the Dashboard's demo scenario launcher"
                className="min-h-16"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editing ? "Save Changes" : "Add Domain"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing rules, matrices and simulations already tagged with this domain keep their reference, but it will
              no longer appear as a selectable option anywhere in the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
