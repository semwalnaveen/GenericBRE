"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Boxes, Search } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { Entity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

const BLANK: Entity = { id: "", name: "", description: "", industry: undefined };

const ENTITY_ACCENTS: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  applicant: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", border: "hover:border-blue-500/40", iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  "loan-account": { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", border: "hover:border-emerald-500/40", iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  policy: { bg: "bg-violet-500/10 dark:bg-violet-500/20", text: "text-violet-600 dark:text-violet-400", border: "hover:border-violet-500/40", iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  collateral: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", border: "hover:border-amber-500/40", iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
};

export function EntityCatalogManager() {
  const entities = useAppStore((s) => s.entities);
  const industries = useAppStore((s) => s.industries);
  const fieldCatalog = useAppStore((s) => s.fieldCatalog);
  const addEntity = useAppStore((s) => s.addEntity);
  const updateEntity = useAppStore((s) => s.updateEntity);
  const deleteEntity = useAppStore((s) => s.deleteEntity);

  const [editing, setEditing] = useState<Entity | null>(null);
  const [draft, setDraft] = useState<Entity>(BLANK);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Entity | null>(null);
  const [search, setSearch] = useState("");

  const filteredEntities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entities;
    return entities.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q)) || e.id.toLowerCase().includes(q)
    );
  }, [entities, search]);

  const startCreate = () => {
    setEditing(null);
    setDraft(BLANK);
    setOpen(true);
  };
  const startEdit = (entity: Entity) => {
    setEditing(entity);
    setDraft(entity);
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Entity name is required.");
      return;
    }
    if (editing) {
      updateEntity(editing.id, draft);
      toast.success(`"${draft.name}" updated.`);
    } else {
      const id = draft.name.trim().toLowerCase().replace(/\s+/g, "-");
      if (entities.some((e) => e.id === id)) {
        toast.error(`An entity with id "${id}" already exists.`);
        return;
      }
      addEntity({ ...draft, id });
      toast.success(`"${draft.name}" added — available in the Field Catalog's Entity picker.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteEntity(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  const fieldsForEntity = (entityId: string) => fieldCatalog.filter((f) => f.entity === entityId);
  const fieldCount = (entityId: string) => fieldsForEntity(entityId).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entities..."
              className="h-9 pl-8 text-sm"
            />
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
            {filteredEntities.length} Entities · {fieldCatalog.length} Fields Total
          </span>
        </div>

        <Button size="sm" className="gap-1.5 font-medium shadow-xs" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Entity
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredEntities.map((ent) => {
          const accent = ENTITY_ACCENTS[ent.id] ?? {
            bg: "bg-primary/10",
            text: "text-primary",
            border: "hover:border-primary/40",
            iconBg: "bg-primary/15 text-primary",
          };
          const fields = fieldsForEntity(ent.id);
          const count = fields.length;

          return (
            <div
              key={ent.id}
              className={cn(
                "group relative flex flex-col justify-between rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-3 transition-all duration-300 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.1)] overflow-hidden",
                accent.border
              )}
            >
              {/* Subtle background gradient */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-primary/20 shadow-[0_0_15px_-3px_currentColor] transition-transform duration-300 group-hover:scale-110", accent.iconBg)}>
                      <Boxes className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">{ent.name}</p>
                      {ent.industry ? (
                        <Badge variant="outline" className="mt-0.5 text-[9px] font-bold uppercase tracking-wider py-0 h-3.5 bg-muted/30">
                          {industries.find((i) => i.id === ent.industry)?.name ?? ent.industry}
                        </Badge>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 mt-0.5 block">Shared Domain</span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-all group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
                    <Button variant="ghost" size="icon-sm" className="size-7" onClick={() => startEdit(ent)} title="Edit Entity">
                      <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setPendingDelete(ent)}
                      title="Delete Entity"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="mt-2 line-clamp-2 text-[11px] font-medium text-muted-foreground/80 leading-snug">
                  {ent.description || "No description provided"}
                </p>
              </div>

              <div className="relative z-10 mt-2.5 space-y-2 border-t border-border/50 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase border border-transparent", accent.bg, accent.text)}>
                    {count} field{count === 1 ? "" : "s"} attached
                  </span>
                  <span className="text-[9px] font-bold uppercase font-mono text-muted-foreground/60">{ent.id}</span>
                </div>

                {count > 0 ? (
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    {fields.slice(0, 3).map((f) => (
                      <span key={f.key} className="rounded-lg border border-border/50 bg-background/50 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
                        {f.label}
                      </span>
                    ))}
                    {count > 3 && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 ml-1">+{count - 3} more</span>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground/60 italic font-medium mt-1.5">
                    No fields tagged yet.
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {filteredEntities.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <Boxes className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-foreground">No entities found</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {search ? "No entities match your search term." : "No entities configured yet."}
            </p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Entity" : "Add Entity"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-sm">Entity Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Applicant, Loan Account, Collateral..."
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Domain</Label>
              <Select
                value={draft.industry ?? ""}
                onValueChange={(v) => setDraft((d) => ({ ...d, industry: v ? (v as string) : undefined }))}
              >
                <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Shared across all domains</SelectItem>
                  {industries.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="What this entity represents..."
                className="min-h-20 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancel</DialogClose>
            <Button size="sm" onClick={save}>{editing ? "Save Changes" : "Add Entity"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Field Catalog entries currently assigned to this entity will revert to unassigned, but their field
              definitions will remain intact.
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
