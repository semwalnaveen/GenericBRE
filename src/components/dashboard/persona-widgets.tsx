"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Search, AlertTriangle, ShieldQuestion, FileText, CheckSquare, ClipboardList, ShieldAlert, FileSearch, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore, useScopedRules, useAccessibleProducts } from "@/lib/store";
import { detectRuleConflicts } from "@/lib/conflict-detection";
import { detectProductRuleConflicts } from "@/lib/product-conflict-detection";
import { StatusBadge } from "@/components/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { PanelHeader, ACTION_DOT, initials } from "./recent-panels";
import { cn } from "@/lib/utils";
import { DistributionDonutWidget } from "./premium-widgets";

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-3.5 py-4 text-center text-xs text-muted-foreground">{children}</p>;
}

// `owner` on a rule is a team ("Credit Risk Division"), not an individual —
// this platform has no per-user rule assignment, so this is scoped org-wide
// rather than faked as "my" rules.
export function DraftRulesPanel() {
  const rules = useScopedRules();
  const drafts = useMemo(() => rules.filter((r) => r.status === "Draft"), [rules]);
  
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of drafts) {
      const cat = r.category || "Uncategorized";
      if (cat.toLowerCase() === "risk & fraud") continue;
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [drafts]);

  const donutData = useMemo(() => {
    const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6"];
    return data.map((d, i) => ({
      name: d.name,
      value: d.value,
      color: CHART_COLORS[i % CHART_COLORS.length],
      bgSoftColor: "bg-slate-50",
      percentage: drafts.length > 0 ? `${Math.round((d.value / drafts.length) * 100)}%` : "0%",
      absoluteText: d.value.toString()
    }));
  }, [data, drafts]);

  return (
    <DistributionDonutWidget
      title="Draft Rules (org-wide)"
      totalText="DRAFTS"
      totalSubtext={drafts.length.toString()}
      data={donutData}
      action="View all"
    />
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
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5" title={`Requested by ${a.requestedBy} for ${a.requestType === "delete" ? "Deletion" : "Publish"} · ${formatDistanceToNow(new Date(a.requestedAt), { addSuffix: true })}`}>
                    Requested by {a.requestedBy} for {a.requestType === "delete" ? "Deletion" : "Publish"} · {formatDistanceToNow(new Date(a.requestedAt), { addSuffix: true })}
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
        items={items}
      />
    </div>
  );
}

// Product-level rollup for Product Manager-style personas — governance over
// entire products, not individual rule pairs, so unlike RuleConflictsPanel
// (rule-vs-rule, org-wide) this groups by product and shows one row per
// product the signed-in user is actually authorized to manage (see
// useAccessibleProducts — bypasses to "every product" for System/Product
// Admin scope, otherwise only their own Active User Access Mapping rows).
// Severity/counts come straight from the unmodified detectProductRuleConflicts
// — this only re-presents its output, never recomputes conflict logic.
const PRODUCT_STATUS_STYLES: Record<"Healthy" | "Warning" | "Critical", { dot: string; badge: string }> = {
  Healthy: { dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  Warning: { dot: "bg-amber-500", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  Critical: { dot: "bg-red-500", badge: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

export function ProductConflictSummaryPanel() {
  const products = useAccessibleProducts();
  const rules = useScopedRules();
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const router = useRouter();

  const summary = useMemo(() => {
    return products
      .map((p) => {
        const findings = detectProductRuleConflicts(p.id, rules, productRuleMappings);
        const criticalCount = findings.filter((f) => f.severity === "Critical").length;
        const mediumCount = findings.filter((f) => f.severity === "Medium").length;
        const total = criticalCount + mediumCount;
        const status: "Healthy" | "Warning" | "Critical" = criticalCount > 0 ? "Critical" : mediumCount > 0 ? "Warning" : "Healthy";
        return { productId: p.id, productName: p.name, total, criticalCount, mediumCount, status };
      })
      .sort((a, b) => b.criticalCount - a.criticalCount || b.total - a.total);
  }, [products, rules, productRuleMappings]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader
        title="Product Conflicts"
        icon={ShieldAlert}
        action="View Full Report"
        onAction={() => router.push("/repository/conflicts")}
      />
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y divide-border">
          {summary.map((s) => {
            const style = PRODUCT_STATUS_STYLES[s.status];
            const badgeText = s.total === 0 ? "No Conflicts" : s.criticalCount > 0 ? `${s.criticalCount} Critical` : `${s.mediumCount} Medium`;
            return (
              <button
                key={s.productId}
                onClick={() => router.push(`/repository/conflicts?product=${s.productId}`)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} />
                  <p className="truncate text-xs font-bold text-foreground">{s.productName}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold", style.badge)}>
                  {badgeText}
                </span>
              </button>
            );
          })}
          {summary.length === 0 && <EmptyRow>No products assigned to your role yet.</EmptyRow>}
        </div>
      </ScrollArea>
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
  const [query, setQuery] = useState("RL-101");
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

export function PendingApplicationsPanel() {
  const applications = useAppStore((s) => s.applications);
  const products = useAppStore((s) => s.products);

  const pendingApps = useMemo(() => {
    return applications
      .filter((app) => ["Submitted", "Under Review", "Pending Documents"].includes(app.status))
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
      .slice(0, 10); // Show top 10 oldest first
  }, [applications]);

  const getProductName = (id: string) => products.find((p) => p.id === id)?.name || id;

  const calculateSLA = (submittedAt: string) => {
    const hoursElapsed = (new Date().getTime() - new Date(submittedAt).getTime()) / (1000 * 60 * 60);
    const slaHours = 72; // 3 days
    const remaining = Math.max(0, slaHours - hoursElapsed);
    
    if (remaining === 0) return { text: "Overdue", color: "text-destructive" };
    if (remaining < 24) return { text: `${Math.floor(remaining)}h left`, color: "text-amber-600 dark:text-amber-400" };
    return { text: `${Math.floor(remaining)}h left`, color: "text-muted-foreground" };
  };

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Pending Applications" action="View all" onAction={() => {}} />
      <div className="flex-1 overflow-auto">
        {pendingApps.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
            No pending applications.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-card/95 backdrop-blur">
              <tr className="border-b text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3 font-medium">Application ID</th>
                <th className="px-4 py-3 font-medium">Applicant Name</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Decision Status</th>
                <th className="px-4 py-3 font-medium">SLA Remaining</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pendingApps.map((app) => {
                const sla = calculateSLA(app.submittedAt);
                return (
                  <tr key={app.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{app.id}</td>
                    <td className="px-4 py-3 text-foreground">{app.applicantName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{getProductName(app.productId)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        app.status === "Under Review" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                        : app.status === "Pending Documents" ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${sla.color}`}>{sla.text}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                        Open Review
                        <ArrowRight className="size-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
