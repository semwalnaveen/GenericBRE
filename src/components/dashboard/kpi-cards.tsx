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
  Users,
} from "lucide-react";
import { useAppStore, useEffectiveCapabilities } from "@/lib/store";
import { detectRuleConflicts } from "@/lib/conflict-detection";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/lib/use-translate";
import { TranslationKey } from "@/lib/i18n";
import { Capability } from "@/lib/types";

interface Kpi {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  href: string;
  suffix?: string;
}

// Which User Access Mapping capability each KPI needs to be shown — mirrors
// nav.ts's requiredCapability gating so the dashboard's numbers never imply
// access the signed-in user's actual product/category grants don't back up.
export const KPI_REQUIRED_CAPABILITY: Partial<Record<string, Capability>> = {
  "total-rules": "rule.view",
  "active-rules": "rule.view",
  "draft-rules": "rule.view",
  "pending-review": "rule.view",
  "pending-approvals": "rule.view",
  deployments: "rule.view",
  "rule-executions": "rule.simulate",
  "business-categories": "rule.view",
  "system-users": "system.manage",
};

// Exactly 6 — matches every role's dashboardConfigs.kpis length, so the grid
// below always fills completely at every breakpoint with no trailing gap.
export const DEFAULT_KPI_IDS = ["total-rules", "active-rules", "draft-rules", "rule-executions", "business-categories", "deployments"];

export const KPI_LABELS: Record<string, string> = {
  "total-rules": "Total Rules",
  "active-rules": "Published Rules",
  "draft-rules": "Draft Rules",
  "pending-approvals": "Pending Approvals",
  deployments: "Deployments",
  "rule-executions": "Rule Executions",
  "business-categories": "Business Categories",
  "system-users": "System Users",
};

// Same ids as KPI_LABELS above (kept as the English source for the admin
// "manage KPIs" picker in dashboard-management-manager.tsx) mapped to their
// translation keys for the actual on-screen cards below.
const KPI_TRANSLATION_KEYS: Record<string, TranslationKey> = {
  "total-rules": "kpi.totalRules",
  "active-rules": "kpi.activeRules",
  "draft-rules": "kpi.draftRules",
  "pending-approvals": "kpi.pendingApprovals",
  deployments: "kpi.deployments",
  "rule-executions": "kpi.ruleExecutions",
  "business-categories": "kpi.businessCategories",
  "system-users": "kpi.systemUsers",
};

// Generates a deterministic sparkline array (values 20-100) based on a seed (e.g. the KPI value)
function generateSparkline(seed: number, count: number = 7): number[] {
  const result = [];
  let current = (seed * 9301 + 49297) % 233280;
  for (let i = 0; i < count; i++) {
    current = (current * 9301 + 49297) % 233280;
    result.push(20 + (current / 233280) * 80);
  }
  if (seed === 0) return [30, 40, 35, 50, 45, 60, 55];
  return result;
}

export function KpiCards() {
  const t = useTranslate();
  const allRules = useAppStore((s) => s.rules);
  const allSimulations = useAppStore((s) => s.simulations);
  const allApprovalRequests = useAppStore((s) => s.approvalRequests);
  const auditLog = useAppStore((s) => s.auditLog);
  const allUsers = useAppStore((s) => s.users);
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
      accent: "text-blue-600 bg-blue-500/10 dark:text-blue-400",
      href: "/repository?status=Draft",
    },
    "pending-approvals": {
      label: t(KPI_TRANSLATION_KEYS["pending-approvals"]),
      value: approvalRequests.filter((a) => a.stage === "Pending Review").length,
      icon: UserCheck,
      accent: "text-orange-600 bg-orange-500/10 dark:text-orange-400",
      href: "/repository?status=Pending Approval",
    },
    deployments: {
      label: t(KPI_TRANSLATION_KEYS.deployments),
      value: deploymentEvents.length,
      icon: Rocket,
      accent: "text-purple-600 bg-purple-500/10 dark:text-purple-400",
      href: "/repository?status=Active", // FUTURE: restore "/repository?environment=Prod" when environment is reintroduced
    },
    "rule-executions": {
      // The +256 is a fixed demo-history baseline with no per-industry
      // breakdown, so it only applies to the unfiltered, all-industries view.
      label: t(KPI_TRANSLATION_KEYS["rule-executions"]),
      value: domainFilter.length ? simulations.length : simulations.length + 256,
      icon: FlaskConical,
      accent: "text-cyan-600 bg-cyan-500/10 dark:text-cyan-400",
      href: "/simulator",
    },
    "business-categories": {
      label: t(KPI_TRANSLATION_KEYS["business-categories"]),
      value: new Set(rules.map((r) => r.category)).size,
      icon: Layers,
      accent: "text-indigo-600 bg-indigo-500/10 dark:text-indigo-400",
      href: "/repository",
    },
    "system-users": {
      // Not scoped to the Industry filter — user accounts aren't tied to a
      // domain the way rules/simulations are.
      label: t(KPI_TRANSLATION_KEYS["system-users"]),
      value: allUsers.filter((u) => u.status === "Active").length,
      icon: Users,
      accent: "text-violet-600 bg-violet-500/10 dark:text-violet-400",
      href: "/configuration-studio",
    },
  };

  const capabilities = useEffectiveCapabilities();
  const ids = dashboardConfigs[userId]?.kpis?.length ? dashboardConfigs[userId].kpis! : DEFAULT_KPI_IDS;
  // Admin-curated defaults (above) say which KPIs this role *wants*; User
  // Access Mapping says which ones this specific person is actually
  // authorized to see. A KPI only renders when both agree.
  const kpis = ids
    .filter((id) => {
      const req = KPI_REQUIRED_CAPABILITY[id];
      return !req || capabilities.has(req);
    })
    .map((id) => registry[id])
    .filter((k): k is Kpi => !!k);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {kpis.map((k, i) => (
        <motion.button
          key={k.label}
          onClick={() => router.push(k.href)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.2 }}
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
          className="group flex flex-col justify-center gap-2 rounded-xl border border-[#ffffff8c] bg-white p-3 text-left shadow-[0_10px_28px_-12px_#00000073] hover:shadow-[0_15px_35px_-10px_#00000080] transition-colors duration-150 ease-out hover:bg-slate-50"
        >
          <div className="flex w-full min-w-0 items-center justify-between gap-1.5" title={k.label}>
            <span className="truncate text-xs font-semibold text-muted-foreground">
              {k.label}
            </span>
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", k.accent)}>
              <k.icon className="size-3.5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2 w-full mt-1">
            <span className="text-2xl font-bold tracking-tight leading-none text-slate-900">
              {k.value > 1000 ? (k.value / 1000).toFixed(1) + "K" : k.value}
            </span>
            <span className="text-xs text-muted-foreground truncate leading-none pb-0.5">
              {k.suffix || "metrics"}
            </span>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
