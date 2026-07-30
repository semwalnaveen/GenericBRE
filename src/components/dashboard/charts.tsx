"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useAppStore, useScopedRules } from "@/lib/store";
import { PanelHeader } from "./recent-panels";
import { RuleStatus } from "@/lib/types";
import { colorForIndustry } from "@/lib/industries";

const STATUS_COLORS: Record<RuleStatus, string> = {
  Published: "var(--chart-1)",
  Approved: "var(--chart-1)",
  Draft: "var(--chart-4)",
  "Pending Approval": "var(--chart-3)",
  Rejected: "var(--chart-5)",
  Inactive: "var(--chart-2)",
  Archived: "var(--chart-5)",
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
  const rules = useScopedRules();
  const industries = useAppStore((s) => s.industries);
  const router = useRouter();

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rules) counts[r.domain] = (counts[r.domain] ?? 0) + 1;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rules]);

  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
        <PanelHeader title="Domain Distribution" />
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No rules in the current selection.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Domain Distribution" />
      <div className="flex flex-1 items-center gap-3 p-2.5">
        <div className="h-28 w-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={38}
                outerRadius={62}
                paddingAngle={3}
                cursor="pointer"
                isAnimationActive={false}
                onClick={(d) => router.push(`/repository?domain=${d.name}`)}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={colorForIndustry(industries, d.name)} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {data.map((d) => (
            <button
              key={d.name}
              onClick={() => router.push(`/repository?domain=${d.name}`)}
              className="flex items-center justify-between rounded-md px-1.5 py-1 text-left hover:bg-accent/60 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full" style={{ backgroundColor: colorForIndustry(industries, d.name) }} />
                {d.name}
              </span>
              <span className="text-sm font-semibold tabular-nums">{d.value}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RuleStatusChart() {
  const rules = useScopedRules();
  const router = useRouter();

  const data = useMemo(() => {
    const order: RuleStatus[] = ["Published", "Approved", "Pending Approval", "Draft", "Rejected", "Inactive", "Archived"];
    const counts: Record<string, number> = {};
    for (const r of rules) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return order.map((name) => ({ name, value: counts[name] ?? 0 }));
  }, [rules]);
  const hasData = rules.length > 0;

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Rule Status Breakdown" />
      {hasData ? (
        // Recharts' ResponsiveContainer measures its parent's actual pixel
        // height to size the SVG — needs a genuinely definite ancestor
        // height (the dashboard grid wrapper now gives every card a fixed
        // 240px card, so flex-1 + min-h-0 resolves correctly here).
        <div className="min-h-0 flex-1 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={28} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                cursor="pointer"
                isAnimationActive={false}
                onClick={(d) => router.push(`/repository?status=${d.name}`)}
              >
                {data.map((d) => (
                  <Cell key={d.name} fill={STATUS_COLORS[d.name as RuleStatus]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No rules in the current selection.
        </div>
      )}
    </div>
  );
}

export function SimulationResultsChart() {
  const simulations = useAppStore((s) => s.simulations);
  const domainFilter = useAppStore((s) => s.globalFilters.domains);
  const filtered = domainFilter.length ? simulations.filter((s) => domainFilter.includes(s.domain)) : simulations;
  const router = useRouter();

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of filtered) counts[s.outcome] = (counts[s.outcome] ?? 0) + 1;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);
  const hasData = filtered.length > 0;

  const COLORS: Record<string, string> = {
    "Approved": "var(--chart-1)",
    "Rejected": "var(--chart-5)",
    "Review Required": "var(--chart-4)"
  };

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Simulation Outcomes" />
      {hasData ? (
        <div className="flex flex-1 items-center gap-3 p-2.5">
          <div className="h-28 w-28 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={3}
                  cursor="pointer"
                  isAnimationActive={false}
                  onClick={() => router.push(`/simulator`)}
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={COLORS[d.name] || "var(--chart-2)"} stroke="var(--card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            {data.map((d) => (
              <div key={d.name} className="flex items-center justify-between rounded-md px-1.5 py-1 text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[d.name] || "var(--chart-2)" }} />
                  {d.name}
                </span>
                <span className="font-semibold tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No simulation history.
        </div>
      )}
    </div>
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
