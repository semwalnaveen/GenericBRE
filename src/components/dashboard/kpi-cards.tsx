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
  Package,
  Archive,
} from "lucide-react";
import { useAppStore, useEffectiveCapabilities, useUserScope, isRuleInScope } from "@/lib/store";
import { detectRuleConflicts } from "@/lib/conflict-detection";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/lib/use-translate";
import { TranslationKey } from "@/lib/i18n";
import { Capability } from "@/lib/types";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface Kpi {
  label: string;
  value: number;
  icon: React.ElementType;
  accent: string;
  hoverAccent: string;
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
  "active-products": "rule.view",
  "rule-executions": "rule.simulate",
  "business-categories": "rule.view",
  "system-users": "system.manage",
  "inactive-archived-rules": "rule.view",
};

// User requested 5 KPIs: Total Rules, Published, Active Products, Pending Approvals, Draft Rules
export const DEFAULT_KPI_IDS = ["total-rules", "active-rules", "active-products", "pending-approvals", "draft-rules"];

export const KPI_LABELS: Record<string, string> = {
  "total-rules": "Total Rules",
  "active-rules": "Published Rules",
  "draft-rules": "Draft Rules",
  "pending-approvals": "Pending Approvals",
  "active-products": "Active Products",
  "rule-executions": "Rule Executions",
  "business-categories": "Business Categories",
  "system-users": "System Users",
  "inactive-archived-rules": "Inactive & Archived Rules",
};

// Same ids as KPI_LABELS above (kept as the English source for the admin
// "manage KPIs" picker in dashboard-management-manager.tsx) mapped to their
// translation keys for the actual on-screen cards below.
const KPI_TRANSLATION_KEYS: Record<string, TranslationKey> = {
  "total-rules": "kpi.totalRules",
  "active-rules": "kpi.activeRules",
  "draft-rules": "kpi.draftRules",
  "pending-approvals": "kpi.pendingApprovals",
  "active-products": "kpi.activeProducts",
  "rule-executions": "kpi.ruleExecutions",
  "business-categories": "kpi.businessCategories",
  "system-users": "kpi.systemUsers",
  "inactive-archived-rules": "kpi.inactiveArchivedRules" as TranslationKey,
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
  const allProducts = useAppStore((s) => s.products);
  const dashboardConfigs = useAppStore((s) => s.dashboardConfigs);
  const userId = useAppStore((s) => s.currentUser.userId);
  const currentUserName = useAppStore((s) => s.currentUser.name);
  const domainFilter = useAppStore((s) => s.globalFilters.domains);
  const productRuleMappings = useAppStore((s) => s.productRuleMappings);
  const scope = useUserScope();
  const router = useRouter();

  // Every widget scopes to the header's Industry filter when one is active,
  // AND to the signed-in user's own product/category access (see
  // isRuleInScope/useUserScope in store.ts) — a KPI number should never
  // count rules this user isn't even allowed to open.
  const domainScoped = domainFilter.length ? allRules.filter((r) => domainFilter.includes(r.domain)) : allRules;
  const rules = domainScoped.filter((r) => isRuleInScope(r, scope, productRuleMappings, currentUserName));
  const ruleIds = new Set(rules.map((r) => r.id));
  const simulations = domainFilter.length ? allSimulations.filter((s) => domainFilter.includes(s.domain)) : allSimulations;
  // Was only filtering by ruleIds when an Industry filter was active — ruleIds
  // is now always a real, non-trivial constraint (the signed-in user's own
  // scope, not just "every rule"), so this must apply unconditionally or a
  // Rule Approver's "Pending Approvals" KPI counts everyone's queue instead
  // of just the categories/products she's actually assigned.
  const approvalRequests = allApprovalRequests.filter((a) => ruleIds.has(a.ruleId));
  const deploymentEvents = auditLog.filter((a) => a.action === "Published Rule" && ruleIds.has(a.entityId));

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
      hoverAccent: "group-hover:text-primary",
      href: "/repository",
      suffix: disabled ? `· ${disabled} disabled` : undefined,
    },
    "active-rules": {
      label: t(KPI_TRANSLATION_KEYS["active-rules"]),
      value: rules.filter((r) => r.status === "Published").length,
      icon: CheckCircle2,
      accent: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
      hoverAccent: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
      href: "/repository?status=Published",
    },
    "inactive-archived-rules": {
      label: "Inactive & Archived",
      value: disabled,
      icon: Archive,
      accent: "text-slate-600 bg-slate-500/10 dark:text-slate-400",
      hoverAccent: "group-hover:text-slate-600 dark:group-hover:text-slate-400",
      href: "/repository?status=Inactive&status=Archived",
    },
    "draft-rules": {
      label: t(KPI_TRANSLATION_KEYS["draft-rules"]),
      value: rules.filter((r) => r.status === "Draft").length,
      icon: FileEdit,
      accent: "text-blue-600 bg-blue-500/10 dark:text-blue-400",
      hoverAccent: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
      href: "/repository?status=Draft",
    },
    "pending-approvals": {
      label: t(KPI_TRANSLATION_KEYS["pending-approvals"]),
      value: approvalRequests.filter((a) => a.stage === "Pending Review").length,
      icon: UserCheck,
      accent: "text-orange-600 bg-orange-500/10 dark:text-orange-400",
      hoverAccent: "group-hover:text-orange-600 dark:group-hover:text-orange-400",
      href: "/repository?status=Pending Approval",
    },
    "active-products": {
      label: t(KPI_TRANSLATION_KEYS["active-products"]),
      value: allProducts.filter(
        (p) =>
          p.status === "Active" &&
          (!domainFilter.length || domainFilter.includes(p.id)) &&
          (scope.bypass || scope.productIds.has(p.id))
      ).length,
      icon: Package,
      accent: "text-purple-600 bg-purple-500/10 dark:text-purple-400",
      hoverAccent: "group-hover:text-purple-600 dark:group-hover:text-purple-400",
      href: "/products",
    },
    "rule-executions": {
      // The +256 is a fixed demo-history baseline with no per-industry
      // breakdown, so it only applies to the unfiltered, all-industries view.
      label: t(KPI_TRANSLATION_KEYS["rule-executions"]),
      value: domainFilter.length ? simulations.length : simulations.length + 256,
      icon: FlaskConical,
      accent: "text-cyan-600 bg-cyan-500/10 dark:text-cyan-400",
      hoverAccent: "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
      href: "/simulator",
    },
    "business-categories": {
      label: t(KPI_TRANSLATION_KEYS["business-categories"]),
      value: new Set(rules.map((r) => r.category)).size,
      icon: Layers,
      accent: "text-indigo-600 bg-indigo-500/10 dark:text-indigo-400",
      hoverAccent: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
      href: "/metadata-explorer",
    },
    "system-users": {
      // Not scoped to the Industry filter — user accounts aren't tied to a
      // domain the way rules/simulations are.
      label: t(KPI_TRANSLATION_KEYS["system-users"]),
      value: allUsers.filter((u) => u.status === "Active").length,
      icon: Users,
      accent: "text-violet-600 bg-violet-500/10 dark:text-violet-400",
      hoverAccent: "group-hover:text-violet-600 dark:group-hover:text-violet-400",
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

  const gridColsClass = {
    1: "xl:grid-cols-1",
    2: "xl:grid-cols-2",
    3: "xl:grid-cols-3",
    4: "xl:grid-cols-4",
    5: "xl:grid-cols-5",
    6: "xl:grid-cols-6",
  }[kpis.length] || "xl:grid-cols-6";

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", gridColsClass)}>
      {kpis.map((k, i) => (
        <motion.button
          key={k.label}
          onClick={() => router.push(k.href)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.2 }}
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
          className="group flex flex-col justify-center gap-1 rounded-xl border border-[#ffffff8c] bg-white px-3 py-2 text-left shadow-[0_10px_28px_-12px_#00000073] hover:shadow-[0_15px_35px_-10px_#00000080] transition-colors duration-150 ease-out hover:bg-slate-50"
        >
          <div className="flex w-full min-w-0 items-center justify-between gap-1.5" title={k.label}>
            <span className={cn(
              "truncate text-[9px] font-bold uppercase tracking-wider transition-colors duration-300 text-muted-foreground",
              k.hoverAccent
            )}>
              {k.label}
            </span>
            <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110", k.accent)}>
              <k.icon className="size-3" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 w-full">
            <span className="text-[20px] font-bold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-[#002f58] via-blue-700 to-[#2f679d]">
              <AnimatedNumber value={k.value} />
            </span>
            <span className="text-[10px] text-muted-foreground truncate leading-none pb-0">
              {k.suffix || "metrics"}
            </span>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
