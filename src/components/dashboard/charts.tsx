"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { useAppStore, useScopedRules } from "@/lib/store";
import { PanelHeader } from "./recent-panels";
import { RuleStatus } from "@/lib/types";
import { colorForIndustry } from "@/lib/industries";
import { DistributionDonutWidget, ProgressScoreWidget, PerformanceListWidget, FunnelListWidget } from "./premium-widgets";

// Mirrors status-badge.tsx's RULE_STATUS_DOT exactly — one canonical colour
// per status, so a rule reads the same whether it's a badge, a table row, or
// a chart segment. Used by FunnelListWidget's bars below.
const STATUS_BAR_COLORS: Record<RuleStatus, string> = {
  Published: "bg-emerald-500",
  Approved: "bg-violet-500",
  Draft: "bg-blue-500",
  "Pending Approval": "bg-amber-500",
  Rejected: "bg-red-500",
  Inactive: "bg-slate-400",
  Archived: "bg-slate-500",
};

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-sm shadow-md">
      <span className="font-medium">{payload[0].name}</span>: {payload[0].value}
    </div>
  );
}

export function DomainDistributionChart() {
  const rules = useAppStore((s) => s.rules);
  const products = useAppStore((s) => s.products);
  const mappings = useAppStore((s) => s.productRuleMappings);

  const data = useMemo(() => {
    // Only count "Published" rules as requested
    const publishedRuleIds = new Set(rules.filter(r => r.status === "Published").map((r) => r.id));
    const counts: Record<string, number> = {};
    
    for (const m of mappings) {
      if (m.active && publishedRuleIds.has(m.ruleId)) {
        counts[m.productId] = (counts[m.productId] ?? 0) + 1;
      }
    }
    
    const result = Object.entries(counts).map(([productId, value]) => {
      const product = products.find((p) => p.id === productId);
      return {
        name: product?.name || productId,
        value,
      };
    });
    
    return result.sort((a, b) => b.value - a.value);
  }, [rules, products, mappings]);

  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
        <PanelHeader title="Product Distribution" />
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No mapped rules in the current selection.
        </div>
      </div>
    );
  }

  const PRODUCT_COLORS = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#06b6d4", // cyan-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#f97316", // orange-500
  ];

  const totalMappings = data.reduce((acc, d) => acc + d.value, 0);

  const donutData = data.map((d, i) => ({
    name: d.name,
    value: d.value,
    color: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
    bgSoftColor: "bg-slate-50",
    percentage: `${Math.round((d.value / totalMappings) * 100)}%`,
    absoluteText: d.value.toString()
  }));

  return (
    <DistributionDonutWidget
      title="Product Distribution"
      totalText="RULES"
      totalSubtext={totalMappings.toString()}
      data={donutData}
    />
  );
}

export function RuleStatusChart() {
  const rules = useScopedRules();
  const router = useRouter();

  const data = useMemo(() => {
    const order: RuleStatus[] = ["Published", "Approved", "Pending Approval", "Draft", "Rejected", "Inactive", "Archived"];
    const counts: Record<string, number> = {};
    for (const r of rules) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return order.map((name) => ({ name, value: counts[name] ?? 0 })).filter(d => d.value > 0);
  }, [rules]);
  const hasData = rules.length > 0;

  if (!hasData) {
    return (
      <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
        <PanelHeader title="Rule Status Breakdown" />
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No rules in the current selection.
        </div>
      </div>
    );
  }

  const STATUS_COLORS_HEX: Record<RuleStatus, string> = {
    Published: "#10b981", // emerald-500
    Approved: "#8b5cf6", // violet-500
    Draft: "#3b82f6", // blue-500
    "Pending Approval": "#f59e0b", // amber-500
    Rejected: "#ef4444", // red-500
    Inactive: "#94a3b8", // slate-400
    Archived: "#64748b", // slate-500
  };

  const donutData = data.map((d) => ({
    name: d.name,
    value: d.value,
    color: STATUS_COLORS_HEX[d.name as RuleStatus] || "#94a3b8",
    bgSoftColor: "bg-slate-50",
    percentage: `${Math.round((d.value / rules.length) * 100)}%`,
    absoluteText: d.value.toString()
  }));

  return (
    <DistributionDonutWidget
      title="Rule Status Breakdown"
      totalText="RULES"
      totalSubtext={rules.length.toString()}
      data={donutData}
    />
  );
}

export function SimulationResultsChart() {
  const simulations = useAppStore((s) => s.simulations);
  const domainFilter = useAppStore((s) => s.globalFilters.domains);
  const filtered = domainFilter.length ? simulations.filter((s) => domainFilter.includes(s.domain)) : simulations;

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of filtered) counts[s.outcome] = (counts[s.outcome] ?? 0) + 1;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);
  const hasData = filtered.length > 0;

  const COLORS: Record<string, string> = {
    "Approved": "#10b981", // emerald-500
    "Rejected": "#ef4444", // red-500
    "Review Required": "#f59e0b" // amber-500
  };
  const BG_COLORS: Record<string, string> = {
    "Approved": "bg-emerald-50",
    "Rejected": "bg-red-50",
    "Review Required": "bg-amber-50"
  };

  if (!hasData) {
    return (
      <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
        <PanelHeader title="Simulation Outcomes" />
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No simulations in the current selection.
        </div>
      </div>
    );
  }

  const donutData = data.map(d => ({
    name: d.name,
    value: d.value,
    color: COLORS[d.name] || "#3b82f6",
    bgSoftColor: BG_COLORS[d.name] || "bg-blue-50",
    percentage: `${Math.round((d.value / filtered.length) * 100)}%`,
    absoluteText: d.value.toString()
  }));

  return (
    <DistributionDonutWidget
      title="Simulation Outcomes"
      totalText="TOTAL"
      totalSubtext={filtered.length.toString()}
      data={donutData}
    />
  );
}

export function ExecutionTimelineChart() {
  const simulations = useAppStore((s) => s.simulations);
  const domainFilter = useAppStore((s) => s.globalFilters.domains);
  const filtered = domainFilter.length ? simulations.filter((s) => domainFilter.includes(s.domain)) : simulations;

  const data = useMemo(() => {
    // Group by day (YYYY-MM-DD)
    const counts: Record<string, number> = {};
    for (const s of filtered) {
      const day = s.timestamp.split("T")[0];
      counts[day] = (counts[day] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);
  const hasData = data.length > 0;

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Execution Timeline" />
      {hasData ? (
        <div className="min-h-0 flex-1 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="count" stroke="var(--chart-1)" fillOpacity={1} fill="url(#colorCount)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No simulation history.
        </div>
      )}
    </div>
  );
}
