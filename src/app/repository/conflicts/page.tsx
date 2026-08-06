"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useAppStore, useUserScope, isRuleInScope } from "@/lib/store";
import { detectProductRuleConflicts, ProductConflictFinding } from "@/lib/product-conflict-detection";
import { BusinessRule } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/status-badge";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<ProductConflictFinding["kind"], string> = {
  "contradictory-decision": "Contradictory Decision",
  "duplicate-logic": "Duplicate Logic",
  "duplicate-mapping": "Duplicate Mapping",
};

type EnrichedFinding = {
  productId: string;
  productName: string;
  finding: ProductConflictFinding;
  ruleA?: BusinessRule;
  ruleB?: BusinessRule;
};

type ProductGroup = {
  productId: string;
  productName: string;
  conflicts: EnrichedFinding[];
  criticalCount: number;
  mediumCount: number;
};

type SortMode = "critical-first" | "most-conflicts" | "name-asc";

const PRODUCTS_PER_PAGE = 5;

export default function ProductConflictReportPage() {
  const router = useRouter();
  const products = useAppStore((s) => s.products);
  const allRules = useAppStore((s) => s.rules);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const currentUserName = useAppStore((s) => s.currentUser.name);
  const userScope = useUserScope();

  // Same in-scope filter Repository itself applies — a conflict involving a
  // rule this user can't open should never surface here either.
  const rules = useMemo(
    () => allRules.filter((r) => isRuleInScope(r, userScope, productRuleMappings, currentUserName)),
    [allRules, userScope, productRuleMappings, currentUserName]
  );
  const ruleById = useMemo(() => new Map(rules.map((r) => [r.id, r])), [rules]);

  const flat = useMemo(() => {
    const out: EnrichedFinding[] = [];
    for (const p of products) {
      const findings = detectProductRuleConflicts(p.id, rules, productRuleMappings);
      for (const finding of findings) {
        out.push({
          productId: p.id,
          productName: p.name,
          finding,
          ruleA: ruleById.get(finding.ruleAId),
          ruleB: ruleById.get(finding.ruleBId),
        });
      }
    }
    return out;
  }, [products, rules, productRuleMappings, ruleById]);

  const [search, setSearch] = useState("");
  const [productFilters, setProductFilters] = useState<string[]>([]);
  const [kindFilters, setKindFilters] = useState<string[]>([]);
  const [severityFilters, setSeverityFilters] = useState<string[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("critical-first");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<EnrichedFinding | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const productOptions = useMemo(
    () =>
      Array.from(new Map(flat.map((f) => [f.productId, f.productName])).entries()).map(([value, label]) => ({
        value,
        label,
      })),
    [flat]
  );
  const kindOptions = useMemo(
    () =>
      Array.from(new Set(flat.map((f) => f.finding.kind))).map((k) => ({ value: k, label: KIND_LABEL[k] ?? k })),
    [flat]
  );
  const severityOptions = useMemo(
    () => Array.from(new Set(flat.map((f) => f.finding.severity))).map((s) => ({ value: s, label: s })),
    [flat]
  );
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    for (const f of flat) {
      if (f.ruleA?.category) cats.add(f.ruleA.category);
      if (f.ruleB?.category) cats.add(f.ruleB.category);
    }
    return Array.from(cats).map((c) => ({ value: c, label: c }));
  }, [flat]);
  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    for (const f of flat) {
      if (f.ruleA?.status) statuses.add(f.ruleA.status);
      if (f.ruleB?.status) statuses.add(f.ruleB.status);
    }
    return Array.from(statuses).map((s) => ({ value: s, label: s }));
  }, [flat]);

  const filteredFlat = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flat.filter((f) => {
      if (productFilters.length && !productFilters.includes(f.productId)) return false;
      if (kindFilters.length && !kindFilters.includes(f.finding.kind)) return false;
      if (severityFilters.length && !severityFilters.includes(f.finding.severity)) return false;
      if (categoryFilters.length) {
        const cats = [f.ruleA?.category, f.ruleB?.category].filter(Boolean) as string[];
        if (!cats.some((c) => categoryFilters.includes(c))) return false;
      }
      if (statusFilters.length) {
        const statuses = [f.ruleA?.status, f.ruleB?.status].filter(Boolean) as string[];
        if (!statuses.some((s) => statusFilters.includes(s))) return false;
      }
      if (q) {
        const haystack = `${f.productName} ${f.finding.ruleAId} ${f.finding.ruleBId} ${f.finding.ruleAName ?? ""} ${f.finding.ruleBName ?? ""} ${f.finding.reason}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [flat, productFilters, kindFilters, severityFilters, categoryFilters, statusFilters, search]);

  const groups = useMemo(() => {
    const byProduct = new Map<string, ProductGroup>();
    for (const f of filteredFlat) {
      let g = byProduct.get(f.productId);
      if (!g) {
        g = { productId: f.productId, productName: f.productName, conflicts: [], criticalCount: 0, mediumCount: 0 };
        byProduct.set(f.productId, g);
      }
      g.conflicts.push(f);
      if (f.finding.severity === "Critical") g.criticalCount++;
      else g.mediumCount++;
    }
    const list = Array.from(byProduct.values());
    for (const g of list) {
      g.conflicts.sort((a, b) => (a.finding.severity === b.finding.severity ? 0 : a.finding.severity === "Critical" ? -1 : 1));
    }
    switch (sortMode) {
      case "most-conflicts":
        list.sort((a, b) => b.conflicts.length - a.conflicts.length);
        break;
      case "name-asc":
        list.sort((a, b) => a.productName.localeCompare(b.productName));
        break;
      default:
        list.sort((a, b) => b.criticalCount - a.criticalCount || b.conflicts.length - a.conflicts.length);
    }
    return list;
  }, [filteredFlat, sortMode]);

  const hasFilters = !!(search || productFilters.length || kindFilters.length || severityFilters.length || categoryFilters.length || statusFilters.length);
  const clearAll = () => {
    setSearch("");
    setProductFilters([]);
    setKindFilters([]);
    setSeverityFilters([]);
    setCategoryFilters([]);
    setStatusFilters([]);
  };

  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    const id = setTimeout(() => setCurrentPage(1), 0);
    return () => clearTimeout(id);
  }, [search, productFilters, kindFilters, severityFilters, categoryFilters, statusFilters, sortMode]);
  const totalPages = Math.max(1, Math.ceil(groups.length / PRODUCTS_PER_PAGE));
  const pagedGroups = groups.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);

  const allCollapsed = expandedId === null;
  const toggleGroup = (productId: string) => {
    setExpandedId((prev) => (prev === productId ? null : productId));
  };
  const collapseAll = () => setExpandedId(null);

  const openDetail = (f: EnrichedFinding) => {
    setSelected(f);
    setDetailOpen(true);
  };

  const critical = filteredFlat.filter((f) => f.finding.severity === "Critical").length;
  const medium = filteredFlat.filter((f) => f.finding.severity === "Medium").length;
  const affectedProducts = new Set(filteredFlat.map((f) => f.productId)).size;

  const handleExport = () => {
    downloadCsv(
      "product_conflict_report",
      filteredFlat.map((f) => ({
        Product: f.productName,
        "Rule 1 ID": f.finding.ruleAId,
        "Rule 1 Name": f.finding.ruleAName ?? "",
        "Rule 1 Status": f.ruleA?.status ?? "",
        "Rule 2 ID": f.finding.ruleBId,
        "Rule 2 Name": f.finding.ruleBName ?? "",
        "Rule 2 Status": f.ruleB?.status ?? "",
        Category: [f.ruleA?.category, f.ruleB?.category].filter(Boolean).join(" / "),
        "Conflict Type": KIND_LABEL[f.finding.kind] ?? f.finding.kind,
        Severity: f.finding.severity,
        Description: f.finding.reason,
        Recommendation: f.finding.recommendation,
      }))
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <ShieldAlert className="size-4.5 text-muted-foreground" /> Product Rule Conflict Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Contradictory decisions, overlapping thresholds, and duplicate rules across every mapped product.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push("/repository")}>
            <ArrowLeft className="size-3.5" /> Back to Repository
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={filteredFlat.length === 0}>
            <Download className="size-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 border-b px-5 py-3 sm:px-6 lg:grid-cols-4">
        <div className="rounded-lg border p-3 text-center bg-card">
          <p className="text-xs font-medium text-muted-foreground">Total Conflicts</p>
          <p className="mt-0.5 text-xl font-bold text-foreground">{filteredFlat.length}</p>
        </div>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center">
          <p className="text-xs font-medium text-destructive">Critical</p>
          <p className="mt-0.5 text-xl font-bold text-destructive">{critical}</p>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-center">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Medium</p>
          <p className="mt-0.5 text-xl font-bold text-amber-600 dark:text-amber-400">{medium}</p>
        </div>
        <div className="rounded-lg border p-3 text-center bg-card">
          <p className="text-xs font-medium text-muted-foreground">Products Affected</p>
          <p className="mt-0.5 text-xl font-bold text-foreground">{affectedProducts}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-5 py-2.5 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by product, rule, or reason..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-64 pl-8" />
        </div>
        <MultiSelect label="Product" options={productOptions} selected={productFilters} onChange={setProductFilters} />
        <MultiSelect label="Conflict Type" options={kindOptions} selected={kindFilters} onChange={setKindFilters} />
        <MultiSelect label="Severity" options={severityOptions} selected={severityFilters} onChange={setSeverityFilters} />
        <MultiSelect label="Rule Category" options={categoryOptions} selected={categoryFilters} onChange={setCategoryFilters} />
        <MultiSelect label="Rule Status" options={statusOptions} selected={statusFilters} onChange={setStatusFilters} />
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="h-9 rounded-md border bg-background px-2.5 text-sm text-foreground"
          aria-label="Sort by"
        >
          <option value="critical-first">Sort: Most Critical First</option>
          <option value="most-conflicts">Sort: Most Conflicts First</option>
          <option value="name-asc">Sort: Product Name (A–Z)</option>
        </select>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm" onClick={collapseAll} disabled={groups.length === 0 || allCollapsed}>
          Collapse All
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-sm" onClick={clearAll}>
            Clear all
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">{filteredFlat.length} conflicts</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 px-5 py-4 sm:px-6">
          {groups.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              <ShieldAlert className="size-6 text-muted-foreground/40" />
              <span>No conflicts match the current filters.</span>
            </div>
          )}

          {pagedGroups.map((g) => {
            const isCollapsed = expandedId !== g.productId;
            return (
              <div key={g.productId} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleGroup(g.productId)}
                  className="flex w-full items-center justify-between gap-3 bg-slate-50/80 px-4 py-2.5 text-left hover:bg-slate-100/80"
                >
                  <span className="flex items-center gap-2">
                    <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} />
                    <span className="font-semibold">{g.productName}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    {g.criticalCount > 0 && (
                      <Badge variant="destructive" className="h-5 rounded-full px-2 text-[10px] font-bold">
                        {g.criticalCount} Critical
                      </Badge>
                    )}
                    {g.mediumCount > 0 && (
                      <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] font-bold">
                        {g.mediumCount} Medium
                      </Badge>
                    )}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead className="border-b bg-slate-50/40 text-sm text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Rule 1</th>
                          <th className="px-3 py-2 text-left font-medium">Rule 2</th>
                          <th className="px-3 py-2 text-left font-medium">Category</th>
                          <th className="px-3 py-2 text-left font-medium">Conflict Type</th>
                          <th className="px-3 py-2 text-left font-medium">Severity</th>
                          <th className="px-3 py-2 text-left font-medium">Description</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                          <th className="px-3 py-2 text-left font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {g.conflicts.map((f, i) => (
                          <tr key={i} className="cursor-pointer hover:bg-accent/30" onClick={() => openDetail(f)}>
                            <td className="px-3 py-2 font-mono text-sm">
                              {f.finding.ruleAId}
                              <span className="ml-1.5 font-sans text-muted-foreground">{f.finding.ruleAName}</span>
                            </td>
                            <td className="px-3 py-2 font-mono text-sm">
                              {f.finding.ruleBId}
                              <span className="ml-1.5 font-sans text-muted-foreground">{f.finding.ruleBName}</span>
                            </td>
                            <td className="px-3 py-2 text-sm text-muted-foreground">
                              {[f.ruleA?.category, f.ruleB?.category].filter(Boolean).join(" / ") || "—"}
                            </td>
                            <td className="px-3 py-2 text-sm">{KIND_LABEL[f.finding.kind] ?? f.finding.kind}</td>
                            <td className="px-3 py-2">
                              <Badge variant={f.finding.severity === "Critical" ? "destructive" : "secondary"}>{f.finding.severity}</Badge>
                            </td>
                            <td className="max-w-[280px] truncate px-3 py-2 text-sm text-muted-foreground" title={f.finding.reason}>
                              {f.finding.reason}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <div className="flex flex-col gap-0.5">
                                {f.ruleA && <StatusBadge status={f.ruleA.status} />}
                                {f.ruleB && <StatusBadge status={f.ruleB.status} />}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1.5 text-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetail(f);
                                }}
                              >
                                <Eye className="size-3.5" /> View Details
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PRODUCTS_PER_PAGE + 1} to {Math.min(currentPage * PRODUCTS_PER_PAGE, groups.length)} of {groups.length} products
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="mr-1 size-3.5" /> Previous
                </Button>
                <div className="px-2 text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Next <ChevronRight className="ml-1 size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Badge variant={selected.finding.severity === "Critical" ? "destructive" : "secondary"}>
                    {selected.finding.severity}
                  </Badge>
                  {selected.productName}
                </SheetTitle>
                <SheetDescription>
                  Rule {selected.finding.ruleAId} ({selected.finding.ruleAName}) vs Rule {selected.finding.ruleBId} ({selected.finding.ruleBName})
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4 pb-4">
                <div className="grid grid-cols-2 gap-2 rounded border bg-muted/30 p-2.5 font-mono text-sm">
                  <div>
                    <span className="block font-sans text-sm text-muted-foreground">Rule {selected.finding.ruleAId}</span>
                    <span className="text-foreground">{selected.finding.conditionA || selected.finding.ruleAId}</span>
                    {selected.finding.decisionA && (
                      <span className="mt-0.5 block font-semibold text-primary">Decision: {selected.finding.decisionA}</span>
                    )}
                    {selected.ruleA && (
                      <div className="mt-1.5 flex items-center gap-2 font-sans text-sm">
                        <StatusBadge status={selected.ruleA.status} />
                        <span className="text-muted-foreground">{selected.ruleA.category}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="block font-sans text-sm text-muted-foreground">Rule {selected.finding.ruleBId}</span>
                    <span className="text-foreground">{selected.finding.conditionB || selected.finding.ruleBId}</span>
                    {selected.finding.decisionB && (
                      <span className="mt-0.5 block font-semibold text-destructive">Decision: {selected.finding.decisionB}</span>
                    )}
                    {selected.ruleB && (
                      <div className="mt-1.5 flex items-center gap-2 font-sans text-sm">
                        <StatusBadge status={selected.ruleB.status} />
                        <span className="text-muted-foreground">{selected.ruleB.category}</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Reason:</strong> {selected.finding.reason}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Recommendation:</strong> {selected.finding.recommendation}
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
