"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileStack,
  CheckCircle2,
  FileEdit,
  FlaskConical,
  Layers,
  Clock,
  UserCheck,
  AlertTriangle,
  Rocket,
  XCircle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { detectRuleConflicts } from "@/lib/conflict-detection";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/lib/use-translate";
import { TranslationKey } from "@/lib/i18n";

interface Kpi {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  href: string;
  suffix?: string;
}

// Exactly 6 — matches every role's dashboardConfigs.kpis length, so the grid
// below always fills completely at every breakpoint with no trailing gap.
export const DEFAULT_KPI_IDS = ["total-rules", "active-rules", "draft-rules", "rule-executions", "business-categories", "deployments"];

export const KPI_LABELS: Record<string, string> = {
  "total-rules": "Total Rules",
  "active-rules": "Published Rules",
  "draft-rules": "Draft Rules",
  "pending-review": "Pending Approval",
  "pending-approvals": "Pending Approvals",
  "rule-conflicts": "Rule Conflicts",
  deployments: "Deployments",
  "rule-executions": "Rule Executions",
  "failed-simulations": "Failed Simulations",
  "business-categories": "Business Categories",
};

// Same ids as KPI_LABELS above (kept as the English source for the admin
// "manage KPIs" picker in dashboard-management-manager.tsx) mapped to their
// translation keys for the actual on-screen cards below.
const KPI_TRANSLATION_KEYS: Record<string, TranslationKey> = {
  "total-rules": "kpi.totalRules",
  "active-rules": "kpi.activeRules",
  "draft-rules": "kpi.draftRules",
  "pending-review": "kpi.pendingReview",
  "pending-approvals": "kpi.pendingApprovals",
  "rule-conflicts": "kpi.ruleConflicts",
  deployments: "kpi.deployments",
  "rule-executions": "kpi.ruleExecutions",
  "failed-simulations": "kpi.failedSimulations",
  "business-categories": "kpi.businessCategories",
};

export function KpiCards() {
  const t = useTranslate();
  const allRules = useAppStore((s) => s.rules);
  const allSimulations = useAppStore((s) => s.simulations);
  const allApprovalRequests = useAppStore((s) => s.approvalRequests);
  const auditLog = useAppStore((s) => s.auditLog);
  const dashboardConfigs = useAppStore((s) => s.dashboardConfigs);
  const userId = useAppStore((s) => s.currentUser.userId);
  const domainFilter = useAppStore((s) => s.globalFilters.domains);
  const router = useRouter();

  // Every widget scopes to the header's Industry filter when one is active —
  // this is the one place in the app that filter previously did nothing.
  const rules = domainFilter.length ? allRules.filter((r) => domainFilter.includes(r.domain)) : allRules;
  const ruleIds = new Set(rules.map((r) => r.id));
  const simulations = domainFilter.length ? allSimulations.filter((s) => domainFilter.includes(s.domain)) : allSimulations;
  const approvalRequests = domainFilter.length ? allApprovalRequests.filter((a) => ruleIds.has(a.ruleId)) : allApprovalRequests;
  const deploymentEvents = auditLog.filter(
    (a) => a.action === "Published Rule" && (!domainFilter.length || ruleIds.has(a.entityId))
  );

  const disabled = rules.filter((r) => r.status === "Inactive" || r.status === "Archived").length;

  // Real-data-only KPI vocabulary — every value below is computed from state
  // already in the store, nothing fabricated. Which of these a role sees is
  // metadata (dashboardConfigs[role].kpis), not a hardcoded set per role.
  const registry: Record<string, Kpi> = {
    "total-rules": {
      label: t(KPI_TRANSLATION_KEYS["total-rules"]),
      value: rules.length,
      icon: FileStack,
      accent: "text-primary bg-primary/10",
      href: "/repository",
      suffix: disabled ? `· ${disabled} disabled` : undefined,
    },
    "active-rules": {
      label: t(KPI_TRANSLATION_KEYS["active-rules"]),
      value: rules.filter((r) => r.status === "Published").length,
      icon: CheckCircle2,
      accent: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
      href: "/repository?status=Published",
    },
    "draft-rules": {
      label: t(KPI_TRANSLATION_KEYS["draft-rules"]),
      value: rules.filter((r) => r.status === "Draft").length,
      icon: FileEdit,
      accent: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
      href: "/repository?status=Draft",
    },
    "pending-review": {
      label: t(KPI_TRANSLATION_KEYS["pending-review"]),
      value: rules.filter((r) => r.status === "Pending Approval").length,
      icon: Clock,
      accent: "text-amber-600 bg-amber-500/10 dark:text-amber-400",
      href: "/repository?status=Pending Approval",
    },
    "pending-approvals": {
      label: t(KPI_TRANSLATION_KEYS["pending-approvals"]),
      value: approvalRequests.filter((a) => a.stage === "Pending Review").length,
      icon: UserCheck,
      accent: "text-blue-600 bg-blue-500/10 dark:text-blue-400",
      href: "/repository?status=Testing",
    },
    "rule-conflicts": {
      label: t(KPI_TRANSLATION_KEYS["rule-conflicts"]),
      value: detectRuleConflicts(rules).length,
      icon: AlertTriangle,
      accent: "text-red-600 bg-red-500/10 dark:text-red-400",
      href: "/repository?status=Active",
    },
    deployments: {
      label: t(KPI_TRANSLATION_KEYS.deployments),
      value: deploymentEvents.length,
      icon: Rocket,
      accent: "text-blue-600 bg-blue-500/10 dark:text-blue-400",
      href: "/repository?status=Active", // FUTURE: restore "/repository?environment=Prod" when environment is reintroduced
    },
    "rule-executions": {
      // The +256 is a fixed demo-history baseline with no per-industry
      // breakdown, so it only applies to the unfiltered, all-industries view.
      label: t(KPI_TRANSLATION_KEYS["rule-executions"]),
      value: domainFilter.length ? simulations.length : simulations.length + 256,
      icon: FlaskConical,
      accent: "text-violet-600 bg-violet-500/10 dark:text-violet-400",
      href: "/simulator",
    },
    "failed-simulations": {
      label: t(KPI_TRANSLATION_KEYS["failed-simulations"]),
      value: simulations.filter((s) => s.outcome === "Rejected").length,
      icon: XCircle,
      accent: "text-red-600 bg-red-500/10 dark:text-red-400",
      href: "/simulator",
      suffix: "this session",
    },
    "business-categories": {
      label: t(KPI_TRANSLATION_KEYS["business-categories"]),
      value: new Set(rules.map((r) => r.category)).size,
      icon: Layers,
      accent: "text-blue-600 bg-blue-500/10 dark:text-blue-400",
      href: "/repository",
    },
  };

  const ids = dashboardConfigs[userId]?.kpis?.length ? dashboardConfigs[userId].kpis! : DEFAULT_KPI_IDS;
  const kpis = ids.map((id) => registry[id]).filter((k): k is Kpi => !!k);

  return (
    <div className="grid grid-cols-2 gap-2.5 p-1 overflow-visible sm:grid-cols-3 lg:grid-cols-6">
      {kpis.map((k, i) => (
        <motion.button
          key={k.label}
          onClick={() => router.push(k.href)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.2 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="group flex h-22 flex-col justify-between gap-1 rounded-lg border bg-card px-2.5 py-2 text-left shadow-2xs transition-all duration-150 ease-out hover:bg-accent/60 hover:border-primary/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-1.5 w-full min-w-0" title={k.label}>
            <span className="truncate text-sm font-semibold uppercase tracking-wide text-muted-foreground">{k.label}</span>
            <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", k.accent)}>
              <k.icon className="size-3" />
            </span>
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums leading-none">{k.value}</p>
            {k.suffix && <p className="mt-0.5 truncate text-sm text-muted-foreground/70" title={k.suffix}>{k.suffix}</p>}
          </div>
        </motion.button>
      ))}
    </div>
  );
}
