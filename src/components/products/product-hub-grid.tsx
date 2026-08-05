"use client";

import { useMemo, useState } from "react";
import { Package, Settings2, PlayCircle, Search, Download } from "lucide-react";
import { Product, Industry, BusinessRule, ProductRuleMapping, SimulationResult } from "@/lib/types";
import { getMappedRules } from "@/lib/product-rule-engine";
import { iconForIndustry } from "@/lib/industries";
import { downloadCsv } from "@/lib/csv";
import { OutcomeBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";

// The Product-centric card grid — shared by the Dashboard's pinned Product
// section and the standalone /products Hub page, so both stay in sync as a
// single source of truth (see ProductKpiCards in simulator/, which this
// supersedes for anywhere a full card with actions is needed rather than a
// plain select-target). `showControls` opts in the search/filter/CSV bar —
// on for the full Hub page, off for the Dashboard's compact preview panel.
export function ProductHubGrid({
  products,
  industries,
  rules,
  mappings,
  simulations,
  onConfigure,
  onRunSimulation,
  showControls,
  compact,
  limit,
}: {
  products: Product[];
  industries: Industry[];
  rules: BusinessRule[];
  mappings: ProductRuleMapping[];
  simulations: SimulationResult[];
  onConfigure: (product: Product) => void;
  onRunSimulation: (product: Product) => void;
  showControls?: boolean;
  /** Denser card (Dashboard's pinned preview) — status/count/last-updated/actions only, no sparkline or status-mix row. */
  compact?: boolean;
  /** Cap the number of cards shown (the caller is expected to offer its own "View all"). */
  limit?: number;
}) {
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState<string[]>([]);
  // Status defaults to Active-only (unchanged behavior), but — unlike the old
  // hard filter — showControls lets a user opt into seeing Inactive products
  // too, since they otherwise become permanently invisible clutter with no
  // way back for roles that can't reach Product Master (audit finding B20).
  const [statusFilter, setStatusFilter] = useState<string[]>(["Active"]);

  const base = showControls ? products : products.filter((p) => p.status === "Active");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return base.filter((p) => {
      if (showControls && statusFilter.length > 0 && !statusFilter.includes(p.status)) return false;
      if (domainFilter.length > 0 && !domainFilter.includes(p.domain)) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [base, search, domainFilter, statusFilter, showControls]);
  const visible = limit ? filtered.slice(0, limit) : filtered;

  const exportCsv = () => {
    downloadCsv(
      "products",
      filtered.map((p) => ({
        Name: p.name,
        Code: p.code,
        Domain: industries.find((i) => i.id === p.domain)?.name ?? p.domain,
        "Publish Status": p.publishStatus ?? "Draft",
        "Mapped Rules": getMappedRules(p.id, rules, mappings).length,
      }))
    );
  };

  if (base.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        No active products yet — add one in Configuration Studio → Product Master.
      </p>
    );
  }

  return (
    <div className="space-y-3.5">
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
            <div className="relative min-w-48 flex-1 sm:max-w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or code..."
                className="h-9 pl-8 text-sm bg-white"
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
            {(search !== "" || domainFilter.length > 0 || (statusFilter.length > 0 && (statusFilter.length !== 1 || statusFilter[0] !== "Active"))) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearch("");
                  setDomainFilter([]);
                  setStatusFilter(["Active"]);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-muted-foreground font-medium">{filtered.length} of {base.length} Products</span>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm shadow-2xs" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="size-3.5" /> Export CSV
            </Button>
          </div>
        </div>
      )}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
          <Package className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-foreground">No products found</p>
          <p className="mt-0.5 text-sm text-muted-foreground">No products match the selected search or filter criteria.</p>
        </div>
      )}
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4", compact && "gap-2.5")}>
        {visible.map((p) => {
          const industry = industries.find((i) => i.id === p.domain);
          const Icon = iconForIndustry(industry?.icon) ?? Package;
          const mappedRules = getMappedRules(p.id, rules, mappings);
          const mappedCount = mappedRules.length;
          const lastSim = simulations.find((s) => s.productId === p.id);
          const published = p.publishStatus === "Published";
          const lastUpdatedLabel =
            published && p.lastPublishedAt
              ? `Published ${new Date(p.lastPublishedAt).toLocaleDateString()}`
              : `Updated ${new Date(p.updatedAt).toLocaleDateString()}`;

          // Priority mix (P1..P5) among this product's mapped rules
          const priorityCounts = [1, 2, 3, 4, 5].map((pr) => mappedRules.filter((r) => r.priority === pr).length);
          const maxPriorityCount = Math.max(1, ...priorityCounts);

          // Status mix among mapped rules
          const statusMix: { status: BusinessRule["status"]; color: string }[] = [
            { status: "Published", color: "bg-emerald-500" },
            { status: "Approved", color: "bg-violet-500" },
            { status: "Draft", color: "bg-amber-500" },
            { status: "Pending Approval", color: "bg-sky-500" },
            { status: "Rejected", color: "bg-red-500" },
            { status: "Inactive", color: "bg-muted-foreground/40" },
            { status: "Archived", color: "bg-muted-foreground/20" },
          ];
          const statusDots = statusMix.flatMap(({ status, color }) =>
            Array.from({ length: Math.min(4, mappedRules.filter((r) => r.status === status).length) }, (_, i) => (
              <span key={`${status}-${i}`} className={cn("size-1.5 rounded-full", color)} />
            ))
          );

          return (
            <div
              key={p.id}
              className={cn(
                "group relative flex flex-col justify-between rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl text-left overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.1)]",
                compact ? "gap-3 p-4" : "gap-4 p-5",
                p.status === "Inactive" && "opacity-60 grayscale-[0.2]"
              )}
            >
              {/* Subtle mesh/radial gradient background */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <span 
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary ring-1 ring-primary/20 shadow-[0_0_15px_-3px_rgba(var(--primary),0.2)] transition-transform duration-300 group-hover:scale-110", 
                      compact ? "size-10" : "size-12"
                    )}
                  >
                    <Icon className={compact ? "size-5" : "size-5.5"} />
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    {/* Ghost Badge */}
                    <span 
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-xs backdrop-blur-sm transition-colors duration-300",
                        p.status === "Inactive" ? "bg-muted text-muted-foreground border-border/50" : 
                        published ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : 
                        "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                      )}
                    >
                      <span 
                        className={cn(
                          "size-1.5 rounded-full",
                          p.status === "Inactive" ? "bg-muted-foreground/50" : 
                          published ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : 
                          "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                        )} 
                      />
                      {p.status === "Inactive" ? "Inactive" : (p.publishStatus ?? "Draft")}
                    </span>
                  </div>
                </div>

                <div className="mt-4 min-w-0">
                  <p className="truncate text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary" title={p.name}>
                    {p.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1" title={`${p.code} · ${industry?.name ?? p.domain}`}>
                    <span className="truncate font-mono text-xs font-medium text-muted-foreground/90">{p.code}</span>
                    <span className="text-muted-foreground/30">•</span>
                    <span className="truncate text-xs font-medium text-muted-foreground/70">{industry?.name ?? p.domain}</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-2 space-y-2.5 border-t border-border/50 pt-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-baseline gap-1">
                    <span className="text-lg font-black tracking-tighter text-foreground">{mappedCount}</span> 
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">Rule{mappedCount === 1 ? "" : "s"}</span>
                    {compact && <span className="text-xs text-muted-foreground/50 ml-1">· {lastUpdatedLabel}</span>}
                  </span>
                  {lastSim && <OutcomeBadge outcome={lastSim.outcome} className="px-2 py-0.5 text-xs shadow-xs" />}
                </div>

                {!compact && statusDots.length > 0 && (
                  <div className="flex items-center gap-1" title="Mapped rule status mix">
                    {statusDots}
                  </div>
                )}

                {!compact && <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/50">{lastUpdatedLabel}</p>}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
