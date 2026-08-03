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
    <div className={cn("flex h-full flex-col rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden", className)}>
      <div className="flex shrink-0 items-center justify-between px-4 py-2.5 border-b border-transparent">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {subtitle && <div className="mt-0.5 text-[11px] text-slate-500">{subtitle}</div>}
        </div>
        {action && <div className="text-[11px] font-medium text-slate-500">{action}</div>}
      </div>
      <div className="flex-1 flex flex-col min-h-0 p-4 overflow-y-auto">{children}</div>
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
              className="text-slate-100"
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
            <span className="text-xl font-bold leading-none text-slate-800">{score}</span>
            <span className="text-[10px] font-medium text-slate-400">/ {maxScore}</span>
          </div>
        </div>

        {/* Linear Metrics */}
        <div className="flex flex-1 flex-col justify-center gap-3">
          {metrics.map((m, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{m.label}</span>
                <span className="font-bold text-slate-800">{m.value}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
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
      <div className="flex items-center gap-6 h-[140px]">
        {/* Donut Chart */}
        <div className="relative h-full w-[120px] shrink-0">
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{totalText}</span>
            <span className="text-sm font-bold text-slate-800">{totalSubtext}</span>
          </div>
        </div>

        {/* Custom Legend */}
        <div className="flex flex-1 flex-col justify-center gap-2">
          {data.map((item, i) => (
            <div
              key={i}
              className={cn("flex items-center justify-between rounded-lg border border-transparent px-2.5 py-1.5", item.bgSoftColor)}
            >
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-medium text-slate-700">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-800">
                <span>{item.percentage}</span>
                <span className="text-slate-500 font-medium">{item.absoluteText}</span>
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
  circleTrackColorClass = "text-slate-100",
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
            <span className="text-xl font-bold leading-none text-slate-800">{circleValue}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">{circleSubtext}</span>
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
                <span className="text-xs font-medium text-slate-700">{item.label}</span>
              </div>
              <span className="text-xs font-bold text-slate-800 tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>
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
              i !== items.length - 1 && "border-b border-slate-100"
            )}
          >
            {/* Top Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: item.dotColor }} />
                <span className="text-sm font-semibold text-slate-800">{item.name}</span>
              </div>
              <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider", item.badgeClass)}>
                {item.badgeText}
              </span>
            </div>
            {/* Bottom Row - Stats Grid */}
            <div className="flex items-center gap-6 pl-3.5">
              {item.stats.map((stat, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">{stat.label}:</span>
                  <span className="text-[10px] font-bold text-slate-700">{stat.value}</span>
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
}

export function CleanListWidget({ title, action, items }: CleanListWidgetProps) {
  return (
    <div className="flex h-full w-full min-h-0 flex-col rounded-xl border border-slate-200/60 bg-white shadow-sm overflow-hidden">
      <div className="flex shrink-0 items-center justify-between bg-blue-50/50 px-4 py-2.5 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {action && (
          <div className="text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">
            {action}
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between py-1.5 px-4 hover:bg-slate-50/50 transition-colors",
              i !== items.length - 1 && "border-b border-slate-100"
            )}
          >
            <div className="flex items-center gap-3">
              {item.indexNumber && (
                <span className={cn("text-[11px] font-bold w-4 text-center", item.indexColorClass || "text-slate-400")}>
                  {item.indexNumber}
                </span>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">{item.title}</span>
                <span className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-slate-800">{item.primaryValue}</span>
              <span className="text-[11px] text-slate-500 mt-0.5">{item.secondaryValue}</span>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="py-6 text-center text-xs text-slate-500">No data available.</div>
        )}
      </div>
    </div>
  );
}
