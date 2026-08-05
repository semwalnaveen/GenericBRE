"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Search, AlertTriangle, ShieldQuestion, FileText, CheckSquare, ClipboardList, ShieldAlert, FileSearch } from "lucide-react";
import { useAppStore, useScopedRules } from "@/lib/store";
import { detectRuleConflicts } from "@/lib/conflict-detection";
import { StatusBadge } from "@/components/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { PanelHeader, ACTION_DOT, initials } from "./recent-panels";
import { cn } from "@/lib/utils";

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-3.5 py-4 text-center text-xs text-muted-foreground">{children}</p>;
}

// `owner` on a rule is a team ("Credit Risk Division"), not an individual —
// this platform has no per-user rule assignment, so this is scoped org-wide
// rather than faked as "my" rules.
export function DraftRulesPanel() {
  const rules = useScopedRules();
  const router = useRouter();
  const drafts = useMemo(
    () => rules.filter((r) => r.status === "Draft").sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [rules]
  );

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Draft Rules (org-wide)" icon={FileText} action="View all" onAction={() => router.push("/repository?status=Draft")} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y divide-border">
          {drafts.slice(0, 8).map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/rule-builder?id=${r.id}`)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0" title={r.name}>
                <p className="truncate text-xs font-bold text-foreground">{r.name}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5" title={`${r.id} · ${r.category}`}>{r.id} · {r.category}</p>
              </div>
            </button>
          ))}
          {drafts.length === 0 && <EmptyRow>No rules currently in Draft.</EmptyRow>}
        </div>
      </ScrollArea>
    </div>
  );
}

export function RulesAwaitingReviewPanel() {
  const rules = useScopedRules();
  const router = useRouter();
  const testing = useMemo(() => rules.filter((r) => r.status === "Pending Approval"), [rules]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Rules Awaiting Review" icon={CheckSquare} action="View all" onAction={() => router.push("/repository?status=Pending Approval")} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y divide-border">
          {testing.slice(0, 8).map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/repository?search=${r.id}`)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-foreground">{r.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{r.id} · {r.domain}</p>
              </div>
              <StatusBadge status={r.status} className="shrink-0 text-[11px]" />
            </button>
          ))}
          {testing.length === 0 && <EmptyRow>Nothing waiting on review right now.</EmptyRow>}
        </div>
      </ScrollArea>
    </div>
  );
}

export function ApprovalQueuePanel() {
  const rules = useScopedRules();
  const ruleIds = useMemo(() => new Set(rules.map((r) => r.id)), [rules]);
  const allApprovalRequests = useAppStore((s) => s.approvalRequests);
  const router = useRouter();
  const pending = useMemo(
    () =>
      allApprovalRequests
        .filter((a) => a.stage === "Pending Review" && ruleIds.has(a.ruleId))
        .sort((a, b) => +new Date(b.requestedAt) - +new Date(a.requestedAt)),
    [allApprovalRequests, ruleIds]
  );

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Approval Queue" icon={ClipboardList} action="View all" onAction={() => router.push("/repository?status=Pending Approval")} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y divide-border">
          {pending.slice(0, 8).map((a) => {
            const rule = rules.find((r) => r.id === a.ruleId);
            return (
              <button
                key={a.id}
                onClick={() => router.push(`/repository?search=${a.ruleId}`)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0" title={rule?.name ?? a.ruleId}>
                  <p className="truncate text-xs font-bold text-foreground">{rule?.name ?? a.ruleId}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5" title={`Requested by ${a.requestedBy} · ${formatDistanceToNow(new Date(a.requestedAt), { addSuffix: true })}`}>
                    Requested by {a.requestedBy} · {formatDistanceToNow(new Date(a.requestedAt), { addSuffix: true })}
                  </p>
                </div>
              </button>
            );
          })}
          {pending.length === 0 && <EmptyRow>No approvals pending.</EmptyRow>}
        </div>
      </ScrollArea>
    </div>
  );
}

import { PerformanceListWidget } from "./premium-widgets";

export function RuleConflictsPanel() {
  const rules = useScopedRules();
  const router = useRouter();
  const conflicts = useMemo(() => detectRuleConflicts(rules), [rules]);

  if (conflicts.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
        <PanelHeader title="Rule Conflicts" icon={ShieldAlert} />
        <EmptyRow>No conflicts detected among Active rules.</EmptyRow>
      </div>
    );
  }

  const items = conflicts.slice(0, 8).map((c, i) => ({
    name: `${c.ruleAId} vs ${c.ruleBId}`,
    dotColor: "#f59e0b",
    badgeText: "Conflict",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    stats: [
      { label: "Reason", value: c.reason },
      { label: "Field", value: c.field }
    ]
  }));

  return (
    <div className="h-full overflow-y-auto">
      <PerformanceListWidget
        title="Rule Conflicts"
        subtitle="Active conflicts detected"
        items={items}
      />
    </div>
  );
}

const OPERATIONAL_ACTIONS = new Set(["Ran Simulation", "Published Rule", "Disabled Rule", "Export Delivered"]);

import { CleanListWidget } from "./premium-widgets";

export function ExecutionLogsPanel() {
  const auditLog = useAppStore((s) => s.auditLog);
  const allRules = useAppStore((s) => s.rules);
  const domainFilter = useAppStore((s) => s.globalFilters.domains);
  const scopedRules = useScopedRules();
  const router = useRouter();
  const scopedRuleIds = useMemo(() => new Set(scopedRules.map((r) => r.id)), [scopedRules]);
  const logs = useMemo(() => {
    const isRuleEvent = (entityId: string) => allRules.some((r) => r.id === entityId);
    return auditLog
      .filter((a) => OPERATIONAL_ACTIONS.has(a.action))
      .filter((a) => !domainFilter.length || !isRuleEvent(a.entityId) || scopedRuleIds.has(a.entityId))
      .slice(0, 5);
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
      title="Execution Logs"
      action={<span onClick={() => router.push("/audit-log")}>View all</span>}
      items={items}
      emptyMessage="No executions recorded yet."
    />
  );
}

export function BatchRunsPanel() {
  const batchRuns = useAppStore((s) => s.batchRuns);
  const products = useAppStore((s) => s.products);
  const domainFilter = useAppStore((s) => s.globalFilters.domains);
  const router = useRouter();

  // batchRuns has no `domain` field of its own (only productId) — resolve it
  // via Products so this widget respects the header's Industry filter the
  // same way every other dashboard widget does.
  const productDomain = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) map.set(p.id, p.domain);
    return map;
  }, [products]);

  const recent = useMemo(() => {
    const scoped = domainFilter.length
      ? batchRuns.filter((b) => domainFilter.includes(productDomain.get(b.productId) ?? ""))
      : batchRuns;
    return scoped.slice(0, 6); // already newest-first — addBatchRunSummary unshifts
  }, [batchRuns, domainFilter, productDomain]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Batch Runs" icon={FileSearch} action="View all" onAction={() => router.push("/simulator")} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y divide-border">
          {recent.map((b) => (
            <div key={b.id} className="flex items-center gap-2.5 px-3.5 py-2">
              <span className={cn("size-1.5 shrink-0 rounded-full", b.failed > 0 ? "bg-red-500" : "bg-emerald-500")} />
              <div className="min-w-0 flex-1" title={b.fileName}>
                <p className="truncate text-xs font-bold text-foreground">{b.fileName}</p>
                <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                  {b.productName} · {b.passed}/{b.totalRows} passed
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(b.startedAt), { addSuffix: true })}
              </span>
            </div>
          ))}
          {recent.length === 0 && <EmptyRow>No batch runs yet.</EmptyRow>}
        </div>
      </ScrollArea>
    </div>
  );
}

export function DecisionLookupPanel() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const go = () => {
    if (!query.trim()) return;
    router.push(`/repository?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Decision Lookup" icon={Search} />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <ShieldQuestion className="size-6 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Look up a rule ID or name to see its decision history in the Repository.</p>
        <div className="flex w-full max-w-72 gap-1.5">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go()}
            placeholder="e.g. RL-101"
            className="h-8 text-sm"
          />
          <button
            onClick={go}
            className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-card hover:bg-accent"
            aria-label="Search"
          >
            <Search className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
