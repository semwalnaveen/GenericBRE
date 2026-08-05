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
export const DEFAULT_DASHBOARD_CONFIGS: Record<string, DashboardConfig> = {
  "usr-ananya-verma": {
    userId: "usr-ananya-verma",
    landingRoute: "/dashboard",
    // "demo-scenarios" (industry-level canned simulator presets) removed —
    // it's demo/sales content, not a BA workflow tool, and duplicates the
    // "Run Simulator" quick action already on this dashboard.
    widgets: widgets(["kpis", "quick-actions", "simulation-results", "execution-timeline", "draft-rules", "rules-awaiting-review", "recent-rules"]),
    // "deployments"/"rule-executions" retired from every default KPI set
    // below (still selectable per-user via Configuration Studio -> Dashboard
    // Management) — backfilled with a role-relevant alternative so the row
    // still fills all 6 slots.
    kpis: ["draft-rules", "pending-review", "active-rules", "total-rules", "business-categories", "rule-conflicts"],
    quickActions: ["create-rule", "open-repository", "run-simulator"],
  },
  "usr-rohan-mehta": {
    userId: "usr-rohan-mehta",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "domain-distribution", "rule-status", "approval-queue", "recent-deployments", "recent-activity"]),
    kpis: ["active-rules", "pending-approvals", "total-rules", "business-categories", "draft-rules", "rule-conflicts"],
    quickActions: ["decision-matrix", "view-approvals", "open-repository"],
  },
  "usr-kavita-rao": {
    userId: "usr-kavita-rao",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "domain-distribution", "recent-activity", "approval-queue", "rules-awaiting-review", "rule-conflicts"]),
    kpis: ["rule-conflicts", "pending-approvals", "pending-review", "active-rules", "total-rules", "failed-simulations"],
    quickActions: ["view-approvals", "open-repository", "run-simulator"],
  },
  "usr-arjun-nair": {
    userId: "usr-arjun-nair",
    landingRoute: "/dashboard",
    // "demo-scenarios" removed — same reasoning as Ananya Verma above:
    // demo/sales content, redundant with the "Run Simulator" quick action.
    widgets: widgets(["kpis", "simulation-results", "execution-timeline", "recent-rules", "recent-activity"]),
    kpis: ["failed-simulations", "active-rules", "pending-review", "total-rules", "pending-approvals", "rule-conflicts"],
    quickActions: ["run-simulator", "open-repository"],
  },
  "usr-divya-iyer": {
    userId: "usr-divya-iyer",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "decision-lookup", "execution-logs", "recent-activity"]),
    kpis: ["failed-simulations", "total-rules", "active-rules", "pending-review", "draft-rules", "rule-conflicts"],
    quickActions: ["run-simulator", "open-repository"],
  },
  "usr-vikram-chawla": {
    userId: "usr-vikram-chawla",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "execution-logs", "domain-distribution", "rule-status", "recent-activity"]),
    kpis: ["total-rules", "active-rules", "business-categories", "pending-approvals", "rule-conflicts", "draft-rules"],
    quickActions: ["configuration-studio", "open-repository", "decision-matrix"],
  },
};
