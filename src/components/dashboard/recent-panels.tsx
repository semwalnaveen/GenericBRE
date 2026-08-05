"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, FileEdit, Clock, Rocket } from "lucide-react";
import { useAppStore, useScopedRules } from "@/lib/store";
import { StatusBadge } from "@/components/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function PanelHeader({ title, action, onAction, icon: Icon }: { title: string; action?: string; onAction?: () => void; icon?: React.ElementType }) {
  return (
    <div className="flex shrink-0 items-center justify-between bg-slate-100/80 px-4 py-3 rounded-t-xl dark:bg-muted/30">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-4 text-muted-foreground/70" />}
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      {action && (
        <button onClick={onAction} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          {action} <ArrowUpRight className="size-3" />
        </button>
      )}
    </div>
  );
}

export function RecentRulesPanel() {
  const rules = useScopedRules();
  const router = useRouter();
  const recent = [...rules].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 6);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Recently Modified Rules" icon={FileEdit} action="View all" onAction={() => router.push("/repository")} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y divide-border pb-1">
          {recent.map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/rule-builder?id=${r.id}`)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0 flex-1" title={r.name}>
                <p className="truncate text-xs font-bold text-foreground">{r.name}</p>
                <p className="truncate text-[11px] text-muted-foreground mt-0.5" title={`${r.id} · ${r.domain}`}>
                  {r.id} · {r.domain}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}
                </span>
                <StatusBadge status={r.status} className="text-[11px]" />
              </div>
            </button>
          ))}
          {recent.length === 0 && (
            <p className="px-3.5 py-6 text-center text-xs text-muted-foreground">No rules modified yet.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Shared across every audit-log-driven widget (Execution Logs, Recent
// Activity) so status coloring and user-initials chips stay consistent.
export const ACTION_DOT: Record<string, string> = {
  "Ran Simulation": "bg-blue-500",
  "Published Rule": "bg-emerald-500",
  "Disabled Rule": "bg-amber-500",
  "Save Failed": "bg-red-500",
  "Export Delivered": "bg-violet-500",
  "Created Rule": "bg-emerald-500",
  "Cloned Rule": "bg-blue-500",
  "Edited Matrix": "bg-blue-500",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

import { CleanListWidget } from "./premium-widgets";

export function RecentActivityPanel() {
  const auditLog = useAppStore((s) => s.auditLog);
  const allRules = useAppStore((s) => s.rules);
  const domainFilter = useAppStore((s) => s.globalFilters.domains);
  const scopedRules = useScopedRules();
  const scopedRuleIds = useMemo(() => new Set(scopedRules.map((r) => r.id)), [scopedRules]);
  const router = useRouter();

  const logs = useMemo(() => {
    const isRuleEvent = (entityId: string) => allRules.some((r) => r.id === entityId);
    return auditLog.filter((a) => !domainFilter.length || !isRuleEvent(a.entityId) || scopedRuleIds.has(a.entityId)).slice(0, 5);
  }, [auditLog, allRules, domainFilter, scopedRuleIds]);

  const items = logs.map((a, i) => ({
    id: a.id,
    indexNumber: i + 1,
    indexColorClass: i === 0 ? "text-amber-500" : i === 1 ? "text-blue-500" : "text-muted-foreground",
    title: a.action,
    subtitle: a.entityId,
    primaryValue: formatDistanceToNow(new Date(a.timestamp), { addSuffix: true }),
    secondaryValue: `by ${a.user}`
  }));

  return (
    <CleanListWidget
      title="Recent Activity"
      action={<span onClick={() => router.push("/audit-log")}>View all</span>}
      items={items}
      emptyMessage="No activity yet."
    />
  );
}

export function RecentDeploymentsPanel() {
  const rules = useScopedRules();
  const recent = [...rules]
    .filter((r) => r.status === "Published")
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Recent Deployments" icon={Rocket} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-0.5 p-2">
          {recent.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-2">
              <span className={cn("size-1.5 shrink-0 rounded-full", "bg-emerald-500")} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">{r.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{r.domain}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true })}
              </span>
            </div>
          ))}
          {recent.length === 0 && (
            <p className="px-3.5 py-6 text-center text-xs text-muted-foreground">No rules published yet.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
