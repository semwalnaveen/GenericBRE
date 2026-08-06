"use client";

import { useMemo } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Clock, ListChecks, Gauge, Hourglass } from "lucide-react";
import { BatchRowResult } from "@/lib/batch-runner";
import { BusinessRule } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Kpi {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: string;
}

export function BatchSummaryDashboard({ results }: { results: BatchRowResult[]; rules?: BusinessRule[] }) {
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
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7 mb-4">
      {kpis.map((k) => (
        <div key={k.label} className="group flex flex-col justify-center gap-0.5 rounded-xl border border-[#ffffff8c] bg-white px-3 py-1.5 text-left shadow-[0_10px_28px_-12px_#00000073]">
          <div className="flex w-full min-w-0 items-center justify-between gap-1.5" title={k.label}>
            <span className="truncate text-[11px] font-semibold text-muted-foreground">
              {k.label}
            </span>
            <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg", k.accent)}>
              <k.icon className="size-3" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 w-full pt-1">
            <span className="text-2xl font-bold tracking-tight leading-none text-slate-900 tabular-nums">
              {k.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
