"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Search,
  Save,
  Package,
  CheckSquare,
  Square,
  GripVertical,
  ListOrdered,
  ShieldAlert,
  Check,
  ChevronsUpDown,
  Clock,
} from "lucide-react";
import { useAppStore, useHasCapability } from "@/lib/store";
import { getMappedRules } from "@/lib/product-rule-engine";
import { iconForIndustry } from "@/lib/industries";
import { BusinessRule, Product, ProductRuleMapping } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/ui/multi-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ProductRuleCoverageChart, ProductRuleNetworkDiagram } from "@/components/studio/product-rule-mapping-viz";

// The Rule Sequencer for product execution — reorders the rules already
// mapped to this product (ProductRuleMapping.order). Same established
// grip-handle drag pattern as rule-builder/rule-sequence-panel.tsx: draggable
// lives on a dedicated handle span, not the whole row. Operates on the live
// saved mapping directly (reorder saves immediately on drop), independent of
// any in-progress add/remove selection below.
export function MappedRulesReorder({
  product,
  rules,
  mappings,
  onReorder,
}: {
  product: Product;
  rules: BusinessRule[];
  mappings: ProductRuleMapping[];
  onReorder: (orderedIds: string[]) => void;
}) {
  const canManage = useHasCapability("config.manage");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const ordered = getMappedRules(product.id, rules, mappings);

  const handleDrop = (targetId: string) => {
    if (!canManage || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const ids = ordered.map((r) => r.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    setDraggedId(null);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggedId);
    onReorder(ids);
  };

  if (ordered.length === 0) return null;

  return (
    <div className="flex flex-col rounded-xl border bg-card shadow-sm max-h-full">
      <div className="flex shrink-0 items-center gap-2 border-b bg-muted/30 px-3.5 py-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ListOrdered className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Execution Sequence</p>
          <p className="text-sm text-muted-foreground">Drag the grip handle to reorder — runs top to bottom</p>
        </div>
        <Badge variant="secondary" className="ml-auto h-6 shrink-0 text-sm">{ordered.length} rule{ordered.length === 1 ? "" : "s"}</Badge>
      </div>
      <div className="space-y-1.5 overflow-y-auto p-2.5 max-h-[320px]">
        {ordered.map((r, i) => (
          <div
            key={`${r.id}-${i}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(r.id)}
            className={cn(
              "flex select-none items-center gap-2.5 rounded-lg border bg-background px-2.5 py-2 text-sm transition-colors",
              draggedId === r.id ? "opacity-50" : "hover:border-primary/40 hover:shadow-sm"
            )}
          >
            <span
              draggable={canManage}
              onDragStart={() => canManage && setDraggedId(r.id)}
              onDragEnd={() => setDraggedId(null)}
              title={canManage ? undefined : "Your role doesn't include permission to reorder execution sequence"}
              className={cn(
                "flex shrink-0 text-muted-foreground/60",
                canManage ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-50"
              )}
            >
              <GripVertical className="size-4" />
            </span>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary">
              {i + 1}
            </span>
            <span className="w-16 shrink-0 font-mono text-sm text-muted-foreground">{r.id}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
            <Badge variant="secondary" className="h-6 shrink-0 text-sm">{r.category || "Uncategorized"}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// The map/unmap checklist half — search + category filter + select-all +
// table + explicit "Save Mapping" (dirty-state gated). Extracted so both the
// Settings-page two-pane manager below and the Product Workspace's Mapped
// Rules tab (src/app/products/[id]/page.tsx) share one implementation
// instead of two copies that could drift.
export function MappedRulesChecklist({
  product,
  rules,
  ruleCategories,
  mappings,
}: {
  product: Product;
  rules: BusinessRule[];
  ruleCategories: { id: string; name: string }[];
  mappings: ProductRuleMapping[];
}) {
  const saveProductRuleMapping = useAppStore((s) => s.saveProductRuleMapping);
  const canManage = useHasCapability("config.manage");
  const [search, setSearch] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [selection, setSelection] = useState<Set<string> | null>(null);

  const savedRuleIds = useMemo(
    () => new Set(getMappedRules(product.id, rules, mappings).map((r) => r.id)),
    [product.id, rules, mappings]
  );
  const activeSelection = selection ?? savedRuleIds;
  const dirty = selection !== null;

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (categoryFilters.length && !categoryFilters.includes(r.category)) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rules, search, categoryFilters]);

  const toggleRule = (ruleId: string) => {
    const next = new Set(activeSelection);
    if (next.has(ruleId)) next.delete(ruleId);
    else next.add(ruleId);
    setSelection(next);
  };

  const allFilteredSelected = filteredRules.length > 0 && filteredRules.every((r) => activeSelection.has(r.id));
  const toggleSelectAllFiltered = () => {
    const next = new Set(activeSelection);
    if (allFilteredSelected) {
      filteredRules.forEach((r) => next.delete(r.id));
    } else {
      filteredRules.forEach((r) => next.add(r.id));
    }
    setSelection(next);
  };

  const save = () => {
    if (!canManage) {
      toast.error("You don't have permission to change this product's rule mapping.");
      return;
    }
    const res = saveProductRuleMapping(product.id, Array.from(activeSelection));
    if (res && !res.ok) {
      toast.error(res.reason);
      return;
    }
    setSelection(null);
    toast.success(`Mapping saved — ${activeSelection.size} rule${activeSelection.size === 1 ? "" : "s"} mapped to "${product.name}".`);
  };

  return (
    <div className="flex flex-col gap-3 max-h-full">
      <div className="flex flex-col rounded-xl border bg-card shadow-sm">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/30 px-3.5 py-2.5">
          <div className="relative flex-1 min-w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rules by name or ID..."
              className="h-8 bg-background pl-8 text-sm"
            />
          </div>
          <MultiSelect
            label="Category"
            options={ruleCategories.map((c) => ({ value: c.name, label: c.name }))}
            selected={categoryFilters}
            onChange={setCategoryFilters}
          />
          <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-background text-sm" onClick={toggleSelectAllFiltered}>
            {allFilteredSelected ? <Square className="size-3.5" /> : <CheckSquare className="size-3.5" />}
            {allFilteredSelected ? "Clear filtered" : "Select all filtered"}
          </Button>
        </div>

        <div className="flex shrink-0 items-center justify-between px-3.5 py-2 text-sm text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{activeSelection.size}</span> rule{activeSelection.size === 1 ? "" : "s"} mapped to{" "}
            <span className="font-semibold text-foreground">{product.name}</span>
          </span>
          <span>{filteredRules.length} shown</span>
        </div>

        <div className="mx-3.5 mb-3.5 flex flex-col rounded-lg border overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 bg-muted/50 px-3 py-2 text-sm font-bold uppercase tracking-wider text-muted-foreground border-b select-none">
            <div className="flex items-center">
              <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAllFiltered} />
            </div>
            <span className="w-16 shrink-0">ID</span>
            <span className="min-w-0 flex-1">Rule</span>
            <span className="w-28 shrink-0 text-center">Category</span>
          </div>

          <ScrollArea className="max-h-[250px]">
            <div className="divide-y">
              {filteredRules.map((r, i) => (
                <label
                  key={`${r.id}-${i}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-primary/5",
                    activeSelection.has(r.id) ? "bg-primary/5" : i % 2 === 1 ? "bg-muted/20" : ""
                  )}
                >
                  <Checkbox checked={activeSelection.has(r.id)} onCheckedChange={() => toggleRule(r.id)} />
                  <span className="w-16 shrink-0 font-mono text-sm text-muted-foreground">{r.id}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                  <div className="w-28 shrink-0 flex justify-center">
                    <Badge variant="secondary" className="h-6 text-sm">{r.category || "Uncategorized"}</Badge>
                  </div>
                </label>
              ))}
              {filteredRules.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">No rules match this filter.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className={cn(
        "flex items-center justify-end gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors",
        dirty ? "border-primary/30 bg-primary/5" : "bg-card"
      )}>
        {dirty && <span className="text-sm font-medium text-primary">Unsaved changes</span>}
        <Button
          size="sm"
          className="gap-1.5"
          onClick={save}
          disabled={!dirty || !canManage}
          title={canManage ? undefined : "Your role doesn't include permission to change this product's rule mapping"}
        >
          <Save className="size-3.5" /> Save Mapping
        </Button>
      </div>
    </div>
  );
}

const CARD_VIEW_THRESHOLD = 8;

// Adaptive product picker: a clean card grid while the catalog is small
// (≤8 — the same neutral card language as the Dashboard's Product panel)
// that automatically becomes a searchable combobox once it isn't. This is
// the standard enterprise pattern (Salesforce, Pega, Appian object pickers)
// for choosing one entity out of a catalog that can grow into the hundreds:
// cards don't scale past a screenful, but a combobox's footprint never
// grows with the catalog, and its trigger keeps the current selection
// permanently visible instead of requiring a scroll to find a highlighted
// card among hundreds.
function ProductSelector({
  products,
  rules,
  mappings,
  industries,
  selected,
  onSelect,
}: {
  products: Product[];
  rules: BusinessRule[];
  mappings: ProductRuleMapping[];
  industries: { id: string; icon: string }[];
  selected: Product | null;
  onSelect: (p: Product) => void;
}) {
  const storeIndustries = useAppStore((s) => s.industries);
  const recentProductIds = useAppStore((s) => s.recentProductIds);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const mappedCount = (id: string) => getMappedRules(id, rules, mappings).length;
  const iconFor = (domain: string) => iconForIndustry(industries.find((i) => i.id === domain)?.icon) ?? Package;

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Package className="mx-auto mb-2 size-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No products yet — add one in Product Master first.</p>
      </div>
    );
  }

  if (products.length <= CARD_VIEW_THRESHOLD) {
    const q = search.trim().toLowerCase();
    const filtered = q ? products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) : products;
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold tracking-tight text-foreground">Select Product</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-sm font-medium text-muted-foreground">
              {filtered.length} of {products.length}
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="h-8 w-48 pl-8 text-sm"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <Search className="mx-auto mb-1.5 size-5 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No products match this search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4">
            {filtered.map((p) => {
              const Icon = iconFor(p.domain);
              const count = mappedCount(p.id);
              const isSelected = selected?.id === p.id;
              const domainName = storeIndustries.find((i) => i.id === p.domain)?.name ?? p.domain;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelect(p)}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-150",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30 dark:bg-primary/15"
                      : "border-border bg-card hover:border-primary/40 hover:bg-accent/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg shadow-2xs transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/70 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={cn("truncate text-sm font-semibold tracking-tight", isSelected ? "text-primary" : "text-foreground")}>
                        {p.name}
                      </p>
                      {isSelected && (
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-2.5" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-sm text-muted-foreground">
                      <span className="truncate">{domainName}</span>
                      <span className={cn("font-medium shrink-0 ml-1", isSelected ? "text-primary/90" : "text-muted-foreground/80")}>
                        {count} rule{count === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // >8 products — searchable combobox. Trigger always shows the current
  // selection; opening it gives instant type-ahead search (reusing the same
  // Popover+Command pattern as the Rule Builder's field picker) plus a
  // Recently Used shortlist sourced from the same recentProductIds the
  // Simulator already tracks, so "frequently used" stays consistent app-wide.
  const recentProducts = recentProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p && p.id !== selected?.id)
    .slice(0, 5);

  const pick = (p: Product) => {
    onSelect(p);
    setOpen(false);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-sm font-semibold text-muted-foreground">Select Product</p>
        <Badge variant="secondary" className="h-6 text-sm">{products.length} products</Badge>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" className="h-auto w-full justify-between gap-2 px-3 py-2 sm:w-auto sm:min-w-80" />}>
          {selected ? (
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {(() => {
                  const Icon = iconFor(selected.domain);
                  return <Icon className="size-4" />;
                })()}
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-semibold">{selected.name}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {selected.code} · {mappedCount(selected.id)} rule{mappedCount(selected.id) === 1 ? "" : "s"}
                </span>
              </span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Select a product…</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-90 p-0">
          <Command>
            <CommandInput placeholder="Search products by name or code..." />
            <CommandList>
              <CommandEmpty>No matching products.</CommandEmpty>
              {recentProducts.length > 0 && (
                <CommandGroup heading="Recently Used">
                  {recentProducts.map((p) => (
                    <CommandItem key={p.id} value={`${p.name} ${p.code}`} onSelect={() => pick(p)} className="gap-2.5">
                      <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <Badge variant="outline" className="h-6 shrink-0 text-sm">{mappedCount(p.id)}</Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup heading="All Products">
                {products.map((p) => {
                  const Icon = iconFor(p.domain);
                  return (
                    <CommandItem key={p.id} value={`${p.name} ${p.code}`} onSelect={() => pick(p)} className="gap-2.5">
                      <Check className={cn("size-3.5 shrink-0", selected?.id === p.id ? "opacity-100" : "opacity-0")} />
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <Badge variant="outline" className="h-6 shrink-0 text-sm">{p.domain}</Badge>
                      <span className="w-6 shrink-0 text-right text-sm text-muted-foreground">{mappedCount(p.id)}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Product-Rule Mapping — the many-to-many wiring that replaces Execution
// Manager's group/step routing. Category here is filter-only (narrows the
// picker), never part of execution.
export function ProductRuleMappingManager() {
  const products = useAppStore((s) => s.products);
  const rules = useAppStore((s) => s.rules);
  const ruleCategories = useAppStore((s) => s.ruleCategories);
  const industries = useAppStore((s) => s.industries);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const saveProductRuleMapping = useAppStore((s) => s.saveProductRuleMapping);
  const recordRecentProduct = useAppStore((s) => s.recordRecentProduct);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0] ?? null);

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    recordRecentProduct(p.id);
  };

  const reorderMapped = (orderedIds: string[]) => {
    if (!selectedProduct) return;
    const res = saveProductRuleMapping(selectedProduct.id, orderedIds);
    if (res && !res.ok) {
      toast.error(res.reason);
      return;
    }
    toast.success("Execution sequence updated.");
  };

  return (
    <div className="flex h-full min-h-100 flex-col gap-4">
      <ProductSelector
        products={products}
        rules={rules}
        mappings={productRuleMappings}
        industries={industries}
        selected={selectedProduct}
        onSelect={selectProduct}
      />

      {/* Main Content */}
      {!selectedProduct ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-center">
          <Package className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Select a product to configure its rules.</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 min-h-0">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b pb-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Package className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{selectedProduct.name}</p>
              <p className="text-sm text-muted-foreground">Configure which rules execute and their sequence.</p>
            </div>
          </div>

          {/* Two-Column Layout: Available Rules + Selected Sequence. Side by
              side only at xl+ (1280px) — below that, 3 fixed-width columns
              (Products + this row) don't reliably fit, and Execution
              Sequence being shrink-0 meant it could get pushed past the
              visible area instead of shrinking. Stacking avoids that
              entirely: each column takes the full width on its own row, so
              nothing can be squeezed off-screen. Side by side, both stretch
              to the same height (the root's xl:h-125 provides a real bound)
              and scroll their own content internally; stacked, they size to
              content and the page's own scroll takes over instead. */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
            {/* Left: Available Rules */}
            <div className="flex min-h-0 flex-1 flex-col min-w-0">
              <MappedRulesChecklist
                product={selectedProduct}
                rules={rules}
                ruleCategories={ruleCategories}
                mappings={productRuleMappings}
              />
            </div>

            {/* Right: Execution Sequence */}
            <div className="flex min-h-0 w-full flex-col xl:w-80 xl:shrink-0">
              <MappedRulesReorder
                product={selectedProduct}
                rules={rules}
                mappings={productRuleMappings}
                onReorder={reorderMapped}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
