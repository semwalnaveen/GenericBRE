"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Search, AlertTriangle, ShieldQuestion } from "lucide-react";
import { useAppStore, useScopedRules } from "@/lib/store";
import { detectRuleConflicts } from "@/lib/conflict-detection";
import { StatusBadge } from "@/components/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { PanelHeader, ACTION_DOT, initials } from "./recent-panels";
import { cn } from "@/lib/utils";

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-3.5 py-4 text-center text-sm text-muted-foreground">{children}</p>;
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
      <PanelHeader title="Draft Rules (org-wide)" action="View all" onAction={() => router.push("/repository?status=Draft")} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y">
          {drafts.slice(0, 8).map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/rule-builder?id=${r.id}`)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-sm text-muted-foreground">{r.id} · {r.category}</p>
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
      <PanelHeader title="Rules Awaiting Review" action="View all" onAction={() => router.push("/repository?status=Testing")} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y">
          {testing.slice(0, 8).map((r) => (
            <button
              key={r.id}
              onClick={() => router.push(`/repository?search=${r.id}`)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-sm text-muted-foreground">{r.id} · {r.domain}</p>
              </div>
              <StatusBadge status={r.status} className="shrink-0" />
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
      <PanelHeader title="Approval Queue" action="View all" onAction={() => router.push("/repository?status=Testing")} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y">
          {pending.slice(0, 8).map((a) => {
            const rule = rules.find((r) => r.id === a.ruleId);
            return (
              <button
                key={a.id}
                onClick={() => router.push(`/repository?search=${a.ruleId}`)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{rule?.name ?? a.ruleId}</p>
                  <p className="text-sm text-muted-foreground">
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

export function RuleConflictsPanel() {
  const rules = useScopedRules();
  const router = useRouter();
  const conflicts = useMemo(() => detectRuleConflicts(rules), [rules]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Rule Conflicts" />
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y">
          {conflicts.slice(0, 8).map((c, i) => (
            <button
              key={`${c.ruleAId}-${c.ruleBId}-${i}`}
              onClick={() => router.push(`/repository?search=${c.ruleAId}`)}
              className="flex w-full items-start gap-2.5 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.ruleAId} vs {c.ruleBId}</p>
                <p className="text-sm text-muted-foreground">{c.reason} (on {c.field})</p>
              </div>
            </button>
          ))}
          {conflicts.length === 0 && <EmptyRow>No conflicts detected among Active rules.</EmptyRow>}
        </div>
      </ScrollArea>
    </div>
  );
}

const OPERATIONAL_ACTIONS = new Set(["Ran Simulation", "Published Rule", "Disabled Rule", "Export Delivered"]);

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

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Execution Logs" action="View audit log" onAction={() => router.push("/audit-log")} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y">
          {logs.map((a) => (
            <button
              key={a.id}
              onClick={() => router.push("/audit-log")}
              className="flex w-full items-center gap-2 px-3.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", ACTION_DOT[a.action] ?? "bg-muted-foreground")} />
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="font-medium">{a.action}</span>{" "}
                <span className="font-mono text-sm text-muted-foreground">{a.entityId}</span>
              </span>
              <span
                className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
                title={a.user}
              >
                {initials(a.user)}
              </span>
              <span className="w-14 shrink-0 text-right text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(a.timestamp))}
              </span>
            </button>
          ))}
          {logs.length === 0 && <EmptyRow>No execution activity logged yet.</EmptyRow>}
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
      <PanelHeader title="Decision Lookup" />
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
