import { DashboardConfig } from "./types";

function widgets(ids: string[]): DashboardConfig["widgets"] {
  return ids.map((id, order) => ({ id, visible: true, order }));
}

// Seed data only — fully editable at runtime via Configuration Studio →
// Dashboard Management. Keyed per-user (AppUser.id): each user's landing
// route is their primary module, their widget set favors the panels most
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
    kpis: ["draft-rules", "pending-review", "active-rules", "rule-executions", "total-rules", "business-categories"],
    quickActions: ["create-rule", "open-repository", "run-simulator"],
  },
  "usr-rohan-mehta": {
    userId: "usr-rohan-mehta",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "domain-distribution", "rule-status", "approval-queue", "recent-deployments", "recent-activity"]),
    kpis: ["active-rules", "pending-approvals", "deployments", "rule-executions", "total-rules", "business-categories"],
    quickActions: ["decision-matrix", "view-approvals", "open-repository"],
  },
  "usr-kavita-rao": {
    userId: "usr-kavita-rao",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "rule-conflicts", "approval-queue", "rules-awaiting-review", "domain-distribution", "recent-activity"]),
    kpis: ["rule-conflicts", "pending-approvals", "pending-review", "active-rules", "total-rules", "deployments"],
    quickActions: ["view-approvals", "open-repository", "run-simulator"],
  },
  "usr-arjun-nair": {
    userId: "usr-arjun-nair",
    landingRoute: "/simulator",
    // "demo-scenarios" removed — same reasoning as Ananya Verma above:
    // demo/sales content, redundant with the "Run Simulator" quick action.
    widgets: widgets(["kpis", "simulation-results", "execution-timeline", "recent-rules", "recent-activity"]),
    kpis: ["rule-executions", "failed-simulations", "active-rules", "pending-review", "total-rules", "deployments"],
    quickActions: ["run-simulator", "open-repository"],
  },
  "usr-divya-iyer": {
    userId: "usr-divya-iyer",
    landingRoute: "/simulator",
    widgets: widgets(["kpis", "decision-lookup", "execution-logs", "recent-activity"]),
    kpis: ["rule-executions", "failed-simulations", "deployments", "total-rules", "active-rules", "pending-review"],
    quickActions: ["run-simulator", "open-repository"],
  },
  "usr-vikram-chawla": {
    userId: "usr-vikram-chawla",
    landingRoute: "/configuration-studio",
    widgets: widgets(["kpis", "execution-logs", "domain-distribution", "rule-status", "recent-activity"]),
    kpis: ["total-rules", "active-rules", "business-categories", "deployments", "rule-executions", "pending-approvals"],
    quickActions: ["configuration-studio", "open-repository", "decision-matrix"],
  },
};
