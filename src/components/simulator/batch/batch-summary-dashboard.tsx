"use client";

import { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { CheckCircle2, XCircle, AlertTriangle, Clock, ListChecks, Gauge, Hourglass } from "lucide-react";
import { BatchRowResult } from "@/lib/batch-runner";
import { BusinessRule } from "@/lib/types";
import { cn } from "@/lib/utils";

const OUTCOME_COLORS: Record<string, string> = {
  Approved: "var(--chart-1)",
  Rejected: "var(--chart-5)",
  "Review Required": "var(--chart-3)",
  Error: "var(--chart-4)",
};

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-2.5 py-1.5 text-sm shadow-md">
      <span className="font-medium">{payload[0].name}</span>: {payload[0].value}
    </div>
  );
}

interface Kpi {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: string;
}

export function BatchSummaryDashboard({ results, rules }: { results: BatchRowResult[]; rules: BusinessRule[] }) {
  const stats = useMemo(() => {
    const total = results.length;
    const passed = results.filter((r) => r.status === "Success" && r.outcome === "Approved").length;
    const failed = results.filter((r) => r.status === "Success" && r.outcome === "Rejected").length;
    const review = results.filter((r) => r.status === "Success" && r.outcome === "Review Required").length;
    const errors = results.filter((r) => r.status === "Error").length;
    const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
    const avgExecutionMs = total > 0 ? totalDuration / total : 0;
    const totalRulesExecuted = results.reduce((sum, r) => sum + (r.decision?.flatTrace.length ?? 0), 0);
    const avgRulesPerRecord = total > 0 ? totalRulesExecuted / total : 0;
    return { total, passed, failed, review, errors, totalDuration, avgExecutionMs, totalRulesExecuted, avgRulesPerRecord };
  }, [results]);

  const decisionDistribution = useMemo(() => {
    const rows = [
      { name: "Approved", value: stats.passed },
      { name: "Rejected", value: stats.failed },
      { name: "Review Required", value: stats.review },
      { name: "Error", value: stats.errors },
    ];
    return rows.filter((r) => r.value > 0);
  }, [stats]);

  const executionTimeBuckets = useMemo(() => {
    const buckets = [
      { name: "<5ms", max: 5, value: 0 },
      { name: "5-10ms", max: 10, value: 0 },
      { name: "10-25ms", max: 25, value: 0 },
      { name: "25-50ms", max: 50, value: 0 },
      { name: "50ms+", max: Infinity, value: 0 },
    ];
    for (const r of results) {
      const bucket = buckets.find((b) => r.durationMs <= b.max);
      if (bucket) bucket.value += 1;
    }
    return buckets;
  }, [results]);

  const topFailureReasons = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of results) {
      if (r.status === "Error") {
        const key = r.errorMessage ?? "Unknown error";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      } else if (r.outcome === "Rejected" && r.decision) {
        const key = r.decision.summary;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name: name.length > 40 ? `${name.slice(0, 40)}…` : name, value }));
  }, [results]);

  const topTriggeredRules = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of results) {
      for (const ruleId of r.decision?.triggeredRules ?? []) {
        counts.set(ruleId, (counts.get(ruleId) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([ruleId, value]) => ({ name: rules.find((r) => r.id === ruleId)?.name ?? ruleId, value }));
  }, [results, rules]);

  const kpis: Kpi[] = [
    { label: "Total Records", value: stats.total.toLocaleString(), icon: ListChecks, accent: "text-primary bg-primary/10" },
    { label: "Passed", value: stats.passed.toLocaleString(), icon: CheckCircle2, accent: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400" },
    { label: "Failed", value: stats.failed.toLocaleString(), icon: XCircle, accent: "text-red-600 bg-red-500/10 dark:text-red-400" },
    { label: "Warnings", value: (stats.review + stats.errors).toLocaleString(), icon: AlertTriangle, accent: "text-amber-600 bg-amber-500/10 dark:text-amber-400" },
    { label: "Avg Execution Time", value: `${stats.avgExecutionMs.toFixed(1)}ms`, icon: Clock, accent: "text-violet-600 bg-violet-500/10 dark:text-violet-400" },
    {
      label: "Total Duration",
      value: stats.totalDuration >= 1000 ? `${(stats.totalDuration / 1000).toFixed(2)}s` : `${stats.totalDuration.toFixed(0)}ms`,
      icon: Hourglass,
      accent: "text-teal-600 bg-teal-500/10 dark:text-teal-400",
    },
    { label: "Avg Rules / Record", value: stats.avgRulesPerRecord.toFixed(1), icon: Gauge, accent: "text-blue-600 bg-blue-500/10 dark:text-blue-400" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        {kpis.map((k) => (
          <div key={k.label} className="flex h-20 flex-col justify-between gap-1 rounded-lg border bg-card px-2.5 py-2 shadow-2xs">
            <div className="flex items-center justify-between gap-1.5">
              <span className="truncate text-sm font-semibold uppercase tracking-wide text-muted-foreground">{k.label}</span>
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", k.accent)}>
                <k.icon className="size-3" />
              </span>
            </div>
            <p className="text-lg font-bold tabular-nums leading-none">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex flex-col rounded-xl border bg-card p-3.5 shadow-xs">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Decision Distribution</p>
          {decisionDistribution.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={decisionDistribution} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={3} isAnimationActive={false}>
                      {decisionDistribution.map((d) => (
                        <Cell key={d.name} fill={OUTCOME_COLORS[d.name]} stroke="var(--card)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                {decisionDistribution.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: OUTCOME_COLORS[d.name] }} />
                      {d.name}
                    </span>
                    <span className="font-semibold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyChart />
          )}
        </div>

        <ChartCard title="Execution Time Distribution" data={executionTimeBuckets} color="var(--chart-2)" />
        <ChartCard title="Top Failure Reasons" data={topFailureReasons} color="var(--chart-5)" horizontal />
        <ChartCard title="Rule Trigger Frequency" data={topTriggeredRules} color="var(--chart-1)" horizontal />
      </div>
    </div>
  );
}

function EmptyChart() {
  return <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No data to chart yet.</div>;
}

function ChartCard({
  title,
  data,
  color,
  horizontal,
}: {
  title: string;
  data: { name: string; value: number }[];
  color: string;
  horizontal?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-3.5 shadow-xs">
      <p className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {data.length > 0 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 4, right: 8, left: horizontal ? 4 : -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={!horizontal} vertical={horizontal} />
              {horizontal ? (
                <>
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={10} width={110} stroke="var(--muted-foreground)" />
                </>
              ) : (
                <>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} stroke="var(--muted-foreground)" />
                </>
              )}
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="value" radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} fill={color} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart />
      )}
    </div>
  );
}
