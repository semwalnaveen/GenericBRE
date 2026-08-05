import { DashboardConfig } from "./types";

function widgets(ids: string[]): DashboardConfig["widgets"] {
  return ids.map((id, order) => ({ id, visible: true, order }));
}

// Seed data only — fully editable at runtime via Configuration Studio →
// Dashboard Management. Keyed per-user (AppUser.id): every user lands on
// /dashboard by default regardless of role (still per-user configurable via
// the Landing Route dropdown), while their widget set favors the panels most
// relevant to that person's responsibilities, and their KPIs/Quick Actions
// surface the numbers and shortcuts they act on. Every user's `kpis` list is
// exactly 6 — the grid (see KpiCards) divides evenly into 6 at every
// breakpoint (2 → 3 → 6 columns), so the KPI row always fills completely.
// Role-based redesign: every user's `widgets` list is capped at 6 real
// (non-"kpis") entries, each chosen for that person's actual job function —
// no filler, no widget without real business value. "quick-actions" is now
// included for every role (previously only Ananya's config actually
// rendered it, despite everyone having `quickActions` data configured).
export const DEFAULT_DASHBOARD_CONFIGS: Record<string, DashboardConfig> = {
  "usr-ananya-verma": {
    // Business Analyst (Maker): what she's drafting, what she's recently
    // touched, and whether her rules pass simulation before submitting them.
    userId: "usr-ananya-verma",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "quick-actions", "draft-rules", "recent-rules", "simulation-results", "execution-timeline", "recent-activity"]),
    // "deployments"/"rule-executions" retired from every default KPI set
    // below (still selectable per-user via Configuration Studio -> Dashboard
    // Management) — backfilled with a role-relevant alternative so the row
    // still fills all 6 slots.
    kpis: ["draft-rules", "pending-approvals", "active-rules", "total-rules", "business-categories", "deployments"],
    quickActions: ["create-rule", "open-repository", "run-simulator"],
  },
  "usr-rohan-mehta": {
    // Product Manager: product/domain health, conflict detection, and his
    // own approval queue (he holds rule.publish for Pricing) + deployment
    // status — no generic activity feed diluting the product view.
    userId: "usr-rohan-mehta",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "quick-actions", "domain-distribution", "rule-status", "rule-conflicts", "approval-queue", "recent-deployments"]),
    kpis: ["active-rules", "pending-approvals", "total-rules", "business-categories", "draft-rules", "deployments"],
    quickActions: ["decision-matrix", "view-approvals", "open-repository"],
  },
  "usr-kavita-rao": {
    // Checker + Risk Manager (she holds rule.publish for Eligibility and
    // Risk & Fraud): her approval queue, the review backlog, conflicts as a
    // risk signal, and domain exposure.
    userId: "usr-kavita-rao",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "quick-actions", "approval-queue", "rules-awaiting-review", "rule-conflicts", "domain-distribution", "recent-activity"]),
    kpis: ["deployments", "pending-approvals", "draft-rules", "active-rules", "total-rules", "business-categories"],
    quickActions: ["view-approvals", "open-repository", "run-simulator"],
  },
  "usr-arjun-nair": {
    // Underwriter + Claims Manager (rule.publish across Underwriting,
    // Claims, Collateral): decision/simulation results, his real review
    // queue (previously missing despite him holding publish rights), and
    // quick lookup.
    userId: "usr-arjun-nair",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "quick-actions", "simulation-results", "execution-timeline", "rules-awaiting-review", "recent-rules", "decision-lookup"]),
    kpis: ["business-categories", "active-rules", "draft-rules", "total-rules", "pending-approvals", "deployments"],
    quickActions: ["run-simulator", "open-repository"],
  },
  "usr-divya-iyer": {
    // Operations: the operational audit trail, quick lookup, simulation
    // outcomes, and batch test run history (real BatchRunSummary data,
    // previously not surfaced on any dashboard).
    userId: "usr-divya-iyer",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "quick-actions", "execution-logs", "simulation-results", "decision-lookup", "recent-activity", "batch-runs"]),
    kpis: ["rule-executions", "total-rules", "active-rules", "pending-approvals", "draft-rules", "deployments"],
    quickActions: ["run-simulator", "open-repository"],
  },
  "usr-ved-prakash": {
    // System Administrator: platform-wide audit trail, rule-base integrity
    // checks (conflicts), user management usage.
    userId: "usr-ved-prakash",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "quick-actions", "execution-logs", "rule-conflicts", "rule-status", "domain-distribution", "recent-activity"]),
    // "draft-rules" swapped for "system-users" (real active-user count) —
    // a better fit for an admin's KPI row than drafts, which he doesn't own.
    kpis: ["total-rules", "active-rules", "business-categories", "pending-approvals", "deployments", "system-users"],
    quickActions: ["manage-users", "view-audit-log", "system-settings"],
  },
};
