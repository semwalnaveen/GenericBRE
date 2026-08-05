"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                SHARED WRAPPER                              */
/* -------------------------------------------------------------------------- */

interface WidgetCardProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function WidgetCard({ title, subtitle, children, className, action }: WidgetCardProps) {
  return (
    <div className={cn("flex h-full flex-col rounded-xl border border-[#D0E4F5] bg-white shadow-sm overflow-hidden", className)}>
      <div className="flex shrink-0 items-center justify-between bg-slate-100/80 px-4 py-2.5 dark:bg-muted/30">
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {subtitle && <div className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
        {action && <div className="text-[11px] font-medium text-muted-foreground">{action}</div>}
      </div>
      <div className="flex-1 flex flex-col min-h-0 p-2 overflow-y-auto">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           PROGRESS SCORE WIDGET                            */
/* -------------------------------------------------------------------------- */

export interface LinearMetric {
  label: string;
  value: string | number;
  percentage: number; // 0 to 100
  colorClass: string; // e.g., 'bg-red-500', 'bg-emerald-500'
}

interface ProgressScoreWidgetProps {
  title: string;
  score: number;
  maxScore?: number;
  mainColorClass?: string; // e.g., 'text-red-500' (for stroke)
  action?: React.ReactNode;
  metrics: LinearMetric[];
}

export function ProgressScoreWidget({
  title,
  score,
  maxScore = 100,
  mainColorClass = "text-red-500",
  metrics,
  action,
}: ProgressScoreWidgetProps) {
  const percentage = (score / maxScore) * 100;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <WidgetCard title={title} action={action || `${score}/${maxScore}`}>
      <div className="flex items-center gap-6">
        {/* Circular Progress */}
        <div className="relative flex shrink-0 items-center justify-center">
          <svg className="size-[100px] -rotate-90 transform" viewBox="0 0 100 100">
            {/* Track */}
            <circle
              className="text-muted"
              strokeWidth="10"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="50"
              cy="50"
            />
            {/* Progress */}
            <circle
              className={cn("transition-all duration-1000 ease-out", mainColorClass)}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="50"
              cy="50"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold leading-none text-foreground">{score}</span>
            <span className="text-[10px] font-medium text-muted-foreground">/ {maxScore}</span>
          </div>
        </div>

        {/* Linear Metrics */}
        <div className="flex flex-1 flex-col justify-center gap-3">
          {metrics.map((m, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-bold text-foreground">{m.value}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000 ease-out", m.colorClass)}
                  style={{ width: `${m.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}

/* -------------------------------------------------------------------------- */
/*                         DISTRIBUTION DONUT WIDGET                          */
/* -------------------------------------------------------------------------- */

export interface DonutData {
  name: string;
  value: number;
  color: string;
  bgSoftColor: string; // e.g., 'bg-blue-50'
  percentage: string;
  absoluteText: string;
}

interface DistributionDonutWidgetProps {
  title: string;
  totalText: string;
  totalSubtext: string;
  data: DonutData[];
  action?: React.ReactNode;
}

export function DistributionDonutWidget({ title, totalText, totalSubtext, data, action }: DistributionDonutWidgetProps) {
  return (
    <WidgetCard title={title} action={action}>
      <div className="flex h-full min-h-[140px] items-center gap-6">
        {/* Donut Chart */}
        <div className="relative h-[140px] w-[120px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={56}
                paddingAngle={0}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center Text */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{totalText}</span>
            <span className="text-sm font-bold text-foreground">{totalSubtext}</span>
          </div>
        </div>

        {/* Custom Legend */}
        <div className="flex flex-1 flex-col justify-center gap-1.5">
          {data.map((item, i) => (
            <div
              key={i}
              className={cn("flex items-center justify-between rounded-lg border border-transparent px-2.5 py-1", item.bgSoftColor)}
            >
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium text-foreground">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-foreground">
                <span>{item.percentage}</span>
                <span className="text-muted-foreground font-medium">{item.absoluteText}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}

/* -------------------------------------------------------------------------- */
/*                         PROGRESS DONUT LIST WIDGET                         */
/* -------------------------------------------------------------------------- */

export interface ProgressDonutListItem {
  label: string;
  value: string | number;
  color: string;
  bgSoftColor: string;
}

interface ProgressDonutListWidgetProps {
  title: string;
  action?: React.ReactNode;
  circleValue: number | string;
  circleSubtext: string;
  circlePercentage: number;
  circleColorClass?: string;
  circleTrackColorClass?: string;
  items: ProgressDonutListItem[];
}

export function ProgressDonutListWidget({
  title,
  action,
  circleValue,
  circleSubtext,
  circlePercentage,
  circleColorClass = "text-emerald-500",
  circleTrackColorClass = "text-muted",
  items,
}: ProgressDonutListWidgetProps) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circlePercentage / 100) * circumference;

  return (
    <WidgetCard title={title} action={action}>
      <div className="flex items-center gap-6 h-[140px]">
        {/* Circular Progress */}
        <div className="relative flex shrink-0 items-center justify-center w-[120px] h-[120px]">
          <svg className="size-[110px] -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              className={circleTrackColorClass}
              strokeWidth="12"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="50"
              cy="50"
            />
            <circle
              className={cn("transition-all duration-1000 ease-out", circleColorClass)}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="50"
              cy="50"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold leading-none text-foreground">{circleValue}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{circleSubtext}</span>
          </div>
        </div>

        {/* Pill List */}
        <div className="flex flex-1 flex-col justify-center gap-2">
          {items.map((item, i) => (
            <div
              key={i}
              className={cn("flex items-center justify-between rounded-xl px-3 py-1.5", item.bgSoftColor)}
            >
              <div className="flex items-center gap-2.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium text-foreground">{item.label}</span>
              </div>
              <span className="text-xs font-bold text-foreground tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}

/* -------------------------------------------------------------------------- */
/*                            FUNNEL LIST WIDGET                              */
/* -------------------------------------------------------------------------- */

export interface FunnelListItem {
  label: string;
  value: string | number;
  percentage: number; // 0 to 100 — bar fill width
  colorClass: string; // solid bar fill, e.g. 'bg-emerald-500'
}

interface FunnelListWidgetProps {
  title: string;
  action?: React.ReactNode;
  items: FunnelListItem[];
}

// A stage-by-stage breakdown — label, value, and a full-width horizontal
// progress bar per row — for any real ordered pipeline (e.g. rule lifecycle
// stage counts). Generic like the other primitives above; callers own the
// data and the row order.
export function FunnelListWidget({ title, action, items }: FunnelListWidgetProps) {
  return (
    <WidgetCard title={title} action={action}>
      <div className="flex flex-col justify-center gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="font-bold text-foreground tabular-nums">{item.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-700 ease-out", item.colorClass)}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

/* -------------------------------------------------------------------------- */
/*                          PERFORMANCE LIST WIDGET                           */
/* -------------------------------------------------------------------------- */

export interface PerformanceStat {
  label: string;
  value: string;
}

export interface PerformanceItem {
  name: string;
  dotColor: string; // Hex color for the dot
  badgeText: string;
  badgeClass: string; // e.g., 'bg-red-100 text-red-700'
  stats: PerformanceStat[];
}

interface PerformanceListWidgetProps {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  items: PerformanceItem[];
}

export function PerformanceListWidget({ title, subtitle, items, action }: PerformanceListWidgetProps) {
  return (
    <WidgetCard title={title} subtitle={subtitle} action={action}>
      <div className="flex flex-col gap-0">
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-2 py-3",
              i !== items.length - 1 && "border-b border-border"
            )}
          >
            {/* Top Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: item.dotColor }} />
                <span className="text-xs font-bold text-foreground">{item.name}</span>
              </div>
              <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider", item.badgeClass)}>
                {item.badgeText}
              </span>
            </div>
            {/* Bottom Row - Stats Grid */}
            <div className="flex items-center gap-6 pl-3.5">
              {item.stats.map((stat, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground">{stat.label}:</span>
                  <span className="text-[11px] font-bold text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

/* -------------------------------------------------------------------------- */
/*                            CLEAN LIST WIDGET                               */
/* -------------------------------------------------------------------------- */

export interface CleanListItem {
  id: string;
  indexNumber?: string | number;
  indexColorClass?: string;
  title: string;
  subtitle: string;
  primaryValue: string;
  secondaryValue: string;
}

interface CleanListWidgetProps {
  title: string;
  action?: React.ReactNode;
  items: CleanListItem[];
  emptyMessage?: string;
}

export function CleanListWidget({ title, action, items, emptyMessage = "No data available." }: CleanListWidgetProps) {
  return (
    <div className="flex h-full w-full min-h-0 flex-col rounded-xl border border-[#D0E4F5] bg-white shadow-sm overflow-hidden">
      <div className="flex shrink-0 items-center justify-between bg-slate-100/80 px-4 py-2.5 dark:bg-muted/30">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {action && (
          <div className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            {action}
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto pb-1">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between py-1.5 px-4 hover:bg-accent/50 transition-colors",
              i !== items.length - 1 && "border-b border-border"
            )}
          >
            <div className="flex items-center gap-3">
              {item.indexNumber && (
                <span className={cn("text-[11px] font-bold w-4 text-center", item.indexColorClass || "text-muted-foreground")}>
                  {item.indexNumber}
                </span>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">{item.title}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">{item.subtitle}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-foreground">{item.primaryValue}</span>
              <span className="text-[11px] text-muted-foreground mt-0.5">{item.secondaryValue}</span>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
}
