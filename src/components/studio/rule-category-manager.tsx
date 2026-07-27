"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Tag, Search, FolderGit2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { RuleCategory } from "@/lib/types";
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

const BLANK: RuleCategory = { id: "", name: "", description: "", industry: undefined };

const CATEGORY_ACCENTS: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  Eligibility: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", border: "hover:border-blue-500/40", iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  Pricing: { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", border: "hover:border-emerald-500/40", iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  Underwriting: { bg: "bg-violet-500/10 dark:bg-violet-500/20", text: "text-violet-600 dark:text-violet-400", border: "hover:border-violet-500/40", iconBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  "Risk & Fraud": { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", border: "hover:border-amber-500/40", iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  Compliance: { bg: "bg-sky-500/10 dark:bg-sky-500/20", text: "text-sky-600 dark:text-sky-400", border: "hover:border-sky-500/40", iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  Collateral: { bg: "bg-orange-500/10 dark:bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", border: "hover:border-orange-500/40", iconBg: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  Claims: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-600 dark:text-purple-400", border: "hover:border-purple-500/40", iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
};

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  Eligibility: "Applicant qualification, age, income & bureau threshold checks.",
  Pricing: "Interest rate calculations, haircut tables, and premium loading slabs.",
  Underwriting: "Manual review routing and high-value loan risk assessments.",
  "Risk & Fraud": "Anti-fraud guardrails, velocity limits & debt-to-income caps.",
  Compliance: "Regulatory standards, mandatory disclosures & sanction checks.",
  Collateral: "Valuation minimums, LTV ceilings & asset purity standards.",
  Claims: "Policy claim processing, deductible checks & payout validation.",
};

export function RuleCategoryManager() {
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const industries = useAppStore((s) => s.industries);
  const rules = useAppStore((s) => s.rules);
  const addRuleCategory = useAppStore((s) => s.addRuleCategory);
  const updateRuleCategory = useAppStore((s) => s.updateRuleCategory);
  const deleteRuleCategory = useAppStore((s) => s.deleteRuleCategory);

  const [editing, setEditing] = useState<RuleCategory | null>(null);
  const [draft, setDraft] = useState<RuleCategory>(BLANK);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RuleCategory | null>(null);
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ruleCategories;
    return ruleCategories.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))
    );
  }, [ruleCategories, search]);

  const startCreate = () => {
    setEditing(null);
    setDraft(BLANK);
    setOpen(true);
  };
  const startEdit = (category: RuleCategory) => {
    setEditing(category);
    setDraft(category);
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Category name is required.");
      return;
    }
    if (editing) {
      updateRuleCategory(editing.id, draft);
      toast.success(`"${draft.name}" updated.`);
    } else {
      const id = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (ruleCategories.some((c) => c.id === id)) {
        toast.error(`A category with id "${id}" already exists.`);
        return;
      }
      addRuleCategory({ ...draft, id });
      toast.success(`"${draft.name}" added — available immediately in Rule Builder & Repository filters.`);
    }
    setOpen(false);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteRuleCategory(pendingDelete.id);
    toast.info(`"${pendingDelete.name}" removed.`);
    setPendingDelete(null);
  };

  const ruleCount = (name: string) => rules.filter((r) => r.category === name).length;

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="h-9 pl-8 text-sm"
            />
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
            {filteredCategories.length} Categories · {rules.length} Rules
          </span>
        </div>

        <Button size="sm" className="gap-1.5 font-medium shadow-xs" onClick={startCreate}>
          <Plus className="size-3.5" /> Add Category
        </Button>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCategories.map((cat) => {
          const accent = CATEGORY_ACCENTS[cat.name] ?? {
            bg: "bg-primary/10",
            text: "text-primary",
            border: "hover:border-primary/40",
            iconBg: "bg-primary/10 text-primary",
          };
          const count = ruleCount(cat.name);
          const desc = cat.description || DEFAULT_DESCRIPTIONS[cat.name] || "No description configured";

          return (
            <div
              key={cat.id}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl border bg-card p-3 transition-all duration-150 hover:shadow-xs",
                accent.border
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-lg shadow-2xs", accent.iconBg)}>
                      <Tag className="size-3.5" />
                    </span>
                    <div>
                      <p className="font-semibold text-sm tracking-tight text-foreground">{cat.name}</p>
                      {cat.industry ? (
                        <Badge variant="outline" className="mt-0.5 text-sm py-0 h-5">
                          {industries.find((i) => i.id === cat.industry)?.name ?? cat.industry}
                        </Badge>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground/70">Shared Domain</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 opacity-80 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon-sm" className="size-7" onClick={() => startEdit(cat)} title="Edit Category">
                      <Pencil className="size-3 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7"
                      onClick={() => setPendingDelete(cat)}
                      title="Delete Category"
                    >
                      <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>

                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-snug">
                  {desc}
                </p>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t pt-2">
                <span className={cn("rounded-md px-2 py-0.5 text-sm font-medium border border-transparent", accent.bg, accent.text)}>
                  {count} rule{count === 1 ? "" : "s"} tagged
                </span>
                <span className="text-sm font-mono text-muted-foreground/60">{cat.id}</span>
              </div>
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <FolderGit2 className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-foreground">No categories found</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {search ? "No categories match your search term." : "No categories configured yet."}
            </p>
          </div>
        )}
      </div>

      {/* Edit / Add Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-sm">Category Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Eligibility, Pricing, Compliance..."
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="What kind of rules belong in this category..."
                className="min-h-20 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancel</DialogClose>
            <Button size="sm" onClick={save}>{editing ? "Save Changes" : "Add Category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove &quot;{pendingDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Existing rules already tagged with this category keep their reference, but it will no longer appear as a
              selectable option in Rule Builder or Repository filters.
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
