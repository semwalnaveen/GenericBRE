"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { format, subMonths, startOfMonth, isSameMonth } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend } from "recharts";
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
  "Pending Deletion": "bg-orange-500",
};

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[], label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)] backdrop-blur-2xl dark:border-white/10 dark:bg-black/50">
      {label && <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          {entry.color && <div className="size-2 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}` }} />}
          <span className="font-semibold">{entry.name}</span>
          <span className="ml-auto font-bold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DomainDistributionChart() {
  // Was reading s.rules directly — the one dashboard chart that didn't go
  // through useScopedRules(), so it kept showing every product's full count
  // regardless of the signed-in user's own category/product access.
  const rules = useScopedRules();
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
      <div className="flex h-full flex-col premium-card overflow-hidden">
        <PanelHeader title="Product Distribution" />
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No mapped rules in the current selection.
        </div>
      </div>
    );
  }

  const PRODUCT_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
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
    Published: "var(--chart-1)",
    Approved: "var(--chart-2)",
    Draft: "var(--chart-3)",
    "Pending Approval": "var(--chart-4)",
    Rejected: "var(--chart-5)",
    Inactive: "var(--muted-foreground)",
    Archived: "var(--muted)",
    "Pending Deletion": "var(--destructive)",
  };

  const donutData = data.map((d) => ({
    name: d.name,
    value: d.value,
    color: STATUS_COLORS_HEX[d.name as RuleStatus] || "var(--muted)",
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
    "Approved": "var(--chart-1)",
    "Rejected": "var(--chart-5)",
    "Review Required": "var(--chart-3)"
  };
  const BG_COLORS: Record<string, string> = {
    "Approved": "bg-emerald-50",
    "Rejected": "bg-red-50",
    "Review Required": "bg-amber-50"
  };

  if (!hasData) {
    return (
      <div className="flex h-full flex-col premium-card overflow-hidden">
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
    <div className="flex h-full flex-col premium-card overflow-hidden">
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

export function MonthlyRulesChart() {
  const rules = useScopedRules();
  
  const data = useMemo(() => {
    const result = [];
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const monthStart = startOfMonth(d);
      
      let created = 0;
      let approved = 0;
      
      for (const r of rules) {
        if (r.createdAt && isSameMonth(new Date(r.createdAt), monthStart)) {
          created++;
        }
        if ((r.status === "Published" || r.status === "Approved") && r.updatedAt && isSameMonth(new Date(r.updatedAt), monthStart)) {
          approved++;
        }
      }
      
      result.push({
        month: format(monthStart, "MMM"),
        Created: created,
        Approved: approved
      });
    }
    return result;
  }, [rules]);

  const hasData = rules.length > 0;

  return (
    <div className="flex h-full flex-col premium-card overflow-hidden">
      <PanelHeader title="Monthly Activity" />
      {hasData ? (
        <div className="min-h-0 flex-1 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1}/>
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.4}/>
                </linearGradient>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={1}/>
                  <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.4}/>
                </linearGradient>
                <filter id="bar-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={10} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={45} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.1 }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} iconType="circle" iconSize={8} />
              <Bar dataKey="Created" fill="url(#colorCreated)" filter="url(#bar-glow)" radius={[4, 4, 0, 0]} barSize={14} className="transition-all duration-300 hover:opacity-80" />
              <Bar dataKey="Approved" fill="url(#colorApproved)" filter="url(#bar-glow)" radius={[4, 4, 0, 0]} barSize={14} className="transition-all duration-300 hover:opacity-80" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No activity found in the last 6 months.
        </div>
      )}
    </div>
  );
}

export function RulesPublishedPerProductChart() {
  const rules = useScopedRules();
  const products = useAppStore((s) => s.products);
  const mappings = useAppStore((s) => s.productRuleMappings);

  const data = useMemo(() => {
    // Only count "Published" rules
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

  return (
    <div className="flex h-full flex-col premium-card overflow-hidden">
      <PanelHeader title="Rules Published per Product" />
      {data.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No published rules mapped to products.
        </div>
      ) : (
        <div className="flex-1 p-4 pb-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
              <defs>
                <linearGradient id="colorPublished" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1}/>
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.4}/>
                </linearGradient>
                <filter id="bar-glow-pub" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={(val) => val.replace(/^prod-/i, '').split(/[\s-]+/).map((w: string) => w.charAt(0).toUpperCase()).join('')}
                dy={10}
                interval={0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
                dx={-5}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.1 }} />
              <Bar
                dataKey="value"
                name="Published Rules"
                fill="url(#colorPublished)"
                filter="url(#bar-glow-pub)"
                radius={[4, 4, 0, 0]}
                maxBarSize={50}
                className="transition-all duration-300 hover:opacity-80"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
