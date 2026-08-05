"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Package, Search, Download, Power, PowerOff, Trash2, AlertTriangle } from "lucide-react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { iconForIndustry } from "@/lib/industries";
import { Product } from "@/lib/types";
import { downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
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

function blank(defaultDomain: string): Product {
  const now = new Date().toISOString();
  return { id: "", name: "", code: "", domain: defaultDomain, description: "", status: "Active", createdAt: now, updatedAt: now };
}

const suggestCode = (name: string) => name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
const suggestId = (name: string) => `prod-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export function ProductManager() {
  const products = useAppStore((s) => s.products);
  const industries = useAppStore((s) => s.industries);
  const mappings = useAppStore((s) => s.productRuleMappings);
  const addProduct = useAppStore((s) => s.addProduct);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const deleteProduct = useAppStore((s) => s.deleteProduct);
  const canCreate = useHasCapability("config.manage");

  const [editing, setEditing] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Product>(blank(industries[0]?.id ?? ""));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (domainFilter.length > 0 && !domainFilter.includes(p.domain)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(p.status)) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, domainFilter, statusFilter]);

  const mappedCount = (id: string) => mappings.filter((m) => m.productId === id && m.active).length;
  const hasHistory = (id: string) => mappings.some((m) => m.productId === id);

  const exportCsv = () => {
    downloadCsv(
      "products",
      filteredProducts.map((p) => ({
        Name: p.name,
        Code: p.code,
        Domain: industries.find((i) => i.id === p.domain)?.name ?? p.domain,
        Status: p.status,
        "Publish Status": p.publishStatus ?? "Draft",
        "Mapped Rules": mappedCount(p.id),
      }))
    );
  };

  const startCreate = () => {
    setEditing(null);
    setDraft(blank(industries[0]?.id ?? ""));
    setOpen(true);
  };
  const startEdit = (p: Product) => {
    setEditing(p);
    setDraft(p);
    setOpen(true);
  };
  const toggleStatus = (p: Product) => {
    const nextStatus = p.status === "Active" ? "Inactive" : "Active";
    updateProduct(p.id, { status: nextStatus });
    toast.info(`"${p.name}" status changed to ${nextStatus}.`);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    deleteProduct(deleteConfirm.id);
    toast.info(`"${deleteConfirm.name}" removed.`);
    setDeleteConfirm(null);
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    const code = draft.code.trim() ? draft.code.trim().toUpperCase() : suggestCode(draft.name);
    if (editing) {
      updateProduct(editing.id, { ...draft, code });
      toast.success(`"${draft.name}" updated.`);
    } else {
      const id = suggestId(draft.name);
      if (products.some((p) => p.id === id || p.code === code)) {
        toast.error("A product with that name or code already exists.");
        return;
      }
      addProduct({ ...draft, id, code });
      toast.success(`"${draft.name}" added — available immediately in Product-Rule Mapping & the Simulator.`);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <div className="relative min-w-48 flex-1 sm:max-w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code..."
              className="h-9 pl-8 text-sm"
            />
          </div>
          <MultiSelect
            label="Domain"
            options={industries.map((i) => ({ value: i.id, label: i.name }))}
            selected={domainFilter}
            onChange={setDomainFilter}
            className="h-9 text-sm"
          />
          <MultiSelect
            label="Status"
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
            selected={statusFilter}
            onChange={setStatusFilter}
            className="h-9 text-sm"
          />
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm shadow-2xs" onClick={exportCsv} disabled={filteredProducts.length === 0}>
            <Download className="size-3.5" /> Export CSV
          </Button>
          <span className="text-sm text-muted-foreground">{filteredProducts.length} of {products.length}</span>
        </div>

        {canCreate && (
          <Button size="sm" className="shrink-0 gap-1.5 font-medium shadow-xs" onClick={startCreate}>
            <Plus className="size-3.5" /> Add Product
          </Button>
        )}
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((p) => {
          const industry = industries.find((i) => i.id === p.domain);
          const Icon = iconForIndustry(industry?.icon) ?? Package;
          const count = mappedCount(p.id);

          return (
            <div key={p.id} className="group relative flex flex-col justify-between rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl p-3.5 transition-all duration-300 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.1)] overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-primary/20 shadow-[0_0_15px_-3px_currentColor] bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-[13px] font-bold tracking-tight text-foreground transition-colors group-hover:text-primary" title={p.name}>{p.name}</h3>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${p.status === "Active" ? "text-primary" : "text-muted-foreground/80"}`}>
                          <span className={`size-1.5 rounded-full bg-current ${p.status === "Active" ? "shadow-[0_0_8px_currentColor]" : ""}`} />
                          {p.status}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                        {p.code} <span className="opacity-50 px-0.5">•</span> {industry?.name ?? p.domain}
                      </p>
                    </div>
                  </div>

                  <div className="absolute right-2 top-2 flex shrink-0 items-center gap-0.5 opacity-0 transition-all group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 bg-card/80 backdrop-blur-md rounded-lg p-1 border border-border/50 shadow-sm z-20">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 bg-background/50"
                      title={p.status === "Active" ? "Deactivate" : "Reactivate"}
                      onClick={() => toggleStatus(p)}
                    >
                      {p.status === "Active" ? <PowerOff className="size-3.5 text-muted-foreground hover:text-foreground" /> : <Power className="size-3.5 text-emerald-600 dark:text-emerald-400" />}
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="size-7 bg-background/50" onClick={() => startEdit(p)} title="Edit Product">
                      <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 bg-background/50 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:pointer-events-auto disabled:opacity-40"
                      disabled={hasHistory(p.id)}
                      title={hasHistory(p.id) ? "Has rule mappings or simulation history — deactivate instead" : "Delete permanently"}
                      onClick={() => setDeleteConfirm(p)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="mt-2.5 line-clamp-2 text-[11px] font-medium text-muted-foreground/80 leading-snug flex-1">
                  {p.description || "No description provided"}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-sm">
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-primary/10 text-primary">
                    {count} rule{count === 1 ? "" : "s"} mapped
                  </span>
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase font-mono text-muted-foreground/60 border border-border/50">{p.publishStatus ?? "Draft"}</span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <Package className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-foreground">No products found</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {products.length === 0 ? "No products configured yet. Add one to get started." : "No products match this filter."}
            </p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Home Loan"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input
                  value={draft.code}
                  onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                  placeholder="e.g. HOME_LOAN"
                  className="font-mono"
                  disabled={editing?.publishStatus === "Published"}
                />
                {editing?.publishStatus === "Published" && (
                  <p className="text-sm text-muted-foreground">
                    Stable API identifier — not editable once published, to avoid breaking existing integrations.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Domain *</Label>
                <Select value={draft.domain} onValueChange={(v) => setDraft((d) => ({ ...d, domain: (v as string) ?? d.domain }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select domain" /></SelectTrigger>
                  <SelectContent>
                    {industries.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: (v as Product["status"]) ?? d.status }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={draft.description ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="What this product/scheme is"
                className="min-h-16"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={save}>{editing ? "Save Changes" : "Add Product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" /> Delete &quot;{deleteConfirm?.name}&quot; permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This product has no rule mappings or simulation history, so nothing is orphaned — but the deletion itself
              can&apos;t be undone. If it&apos;s ever used later, Deactivate is the reversible option instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteConfirm) return;
                const result = deleteProduct(deleteConfirm.id);
                if (result.ok) {
                  toast.success(`"${deleteConfirm.name}" deleted permanently.`);
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
