import { DashboardConfig } from "./types";

function widgets(ids: string[]): DashboardConfig["widgets"] {
  return ids.map((id, order) => ({ id, visible: true, order }));
}

// Each of the 6 seed personas gets a dashboard built around what that
// functional role actually does day to day — not one shared layout. Widget
// ids are still checked against the signed-in user's own effectiveCapabilities()
// at render time (WIDGET_REQUIRED_CAPABILITY, dashboard/page.tsx), so this
// list is a ceiling ("what this role's dashboard offers"), not a guarantee.

// Rule Creator (usr-ananya-verma) — Maker: creates/edits/tests rules and
// submits for approval, can't approve her own work or publish directly.
// Manager-approved reference layout: chart-first (Rule Status, Monthly
// Activity, Product Distribution, Draft Rules all render as
// donut/bar charts, not plain lists), Product Conflict Summary (grouped by
// product, not individual rule pairs — see persona-widgets.tsx) as the one
// operational list, Quick Actions last. Every other persona below follows this same
// chart-forward visual pattern — a max of one or two list-style panels,
// charts everywhere a chart is meaningful — with the actual widget/KPI
// *choices* swapped for what that role does.
const RULE_CREATOR_WIDGETS = widgets(["kpis", "rule-status", "monthly-activity", "domain-distribution", "product-conflict-summary", "draft-rules", "quick-actions"]);
const RULE_CREATOR_KPIS = ["total-rules", "active-rules", "active-products", "pending-approvals", "draft-rules"];

// Product Rule Manager (usr-rohan-mehta) — maps approved rules to products
// and configures execution sequence/pricing; doesn't author rule logic.
// Three charts (Product Distribution, Rule Status, Monthly Activity) plus
// his two real operational surfaces: Recent Deployments (what just shipped)
// and Rule Conflicts (what to resolve before mapping).
const PRODUCT_MANAGER_WIDGETS = widgets(["kpis", "domain-distribution", "rule-status", "monthly-activity", "rule-conflicts", "recent-deployments", "quick-actions"]);
const PRODUCT_MANAGER_KPIS = ["total-rules", "active-products", "active-rules", "pending-approvals", "draft-rules", "inactive-archived-rules"];

// Rule Approver (usr-kavita-rao) — Checker: reviews and approves/rejects
// what Makers submit, can't create or modify business rules herself. Monthly
// Activity's Approved-vs-Created split is directly her own approval velocity,
// not just background chart filler. Approval Queue is the one list that has
// to stay — it's the actual work she does every day, and no chart replaces
// "here's what's waiting on me."
const RULE_APPROVER_WIDGETS = widgets(["kpis", "rule-status", "monthly-activity", "domain-distribution", "approval-queue", "product-conflict-summary", "quick-actions"]);
const RULE_APPROVER_KPIS = ["total-rules", "pending-approvals", "active-rules", "active-products", "draft-rules"];

// Rule Tester (usr-arjun-nair): simulate-only persona — rule.view + rule.simulate,
// no rule.create/edit/publish. Its "charts" are already the simulator's own
// outputs (Simulation Outcomes, Execution Timeline) rather than the rule-
// catalogue charts every other role gets — those describe content he can't
// author, these describe what he actually produced. Execution Logs, Decision
// Lookup, and Batch Runs have no chart equivalent worth forcing.
const RULE_TESTER_WIDGETS = widgets(["kpis", "domain-distribution", "monthly-activity", "simulation-results", "execution-logs", "rule-status", "quick-actions"]);
// Pending Approvals / Draft Rules dropped — this persona can't approve or
// author, so both would only ever read as noise. Rule Executions (simulation
// count) takes their place as the one number that's actually this role's own
// output.
const RULE_TESTER_KPIS = ["total-rules", "active-rules", "active-products", "draft-rules", "pending-approvals"];

// Rule Viewer (usr-divya-iyer) — read-only: dashboards, rules, approval
// history, audit logs. Charts suit a pure observer even better than a lists —
// nothing here is "her queue" to act on, so Rule Status/Product
// Distribution/Monthly Activity read as the org-wide picture she's here to
// watch. Recent Activity + Execution Logs cover her two audit-trail
// responsibilities (approval history, audit logs) — no chart replaces those.
const RULE_VIEWER_WIDGETS = widgets(["kpis", "rule-status", "monthly-activity", "domain-distribution", "recent-activity", "execution-logs", "quick-actions"]);
// Inactive & Archived stands in for the org-wide health number a read-only
// observer cares about, in place of Pending Approvals (not her queue) or
// Draft Rules (not her output).
const RULE_VIEWER_KPIS = ["total-rules", "active-rules", "active-products", "inactive-archived-rules", "draft-rules"];

// System Administrator (usr-vikram-chawla, and usr-ved-prakash as the same
// role reached by name-fallback in dashboard/page.tsx) — user/access/product/
// platform administration, not rule authoring. Three charts for platform-wide
// health (Rule Status, Product Distribution, Monthly Activity) plus Product
// Conflict Summary (needs attention, org-wide — bypasses the per-user product
// scope like every other System Admin surface) and Recent Activity (the full
// audit trail — this is the one role that should see everyone's actions, not
// just rule events).
const SYSTEM_ADMIN_WIDGETS = widgets(["kpis", "rule-status", "domain-distribution", "monthly-activity", "product-conflict-summary", "recent-activity", "quick-actions"]);
const SYSTEM_ADMIN_KPIS = ["total-rules", "active-products", "pending-approvals", "system-users"];

export const DEFAULT_DASHBOARD_CONFIGS: Record<string, DashboardConfig> = {
  "usr-ananya-verma": {
    userId: "usr-ananya-verma",
    landingRoute: "/dashboard",
    widgets: RULE_CREATOR_WIDGETS,
    kpis: RULE_CREATOR_KPIS,
    quickActions: ["create-rule", "open-repository", "run-simulator"],
  },
  "usr-rohan-mehta": {
    userId: "usr-rohan-mehta",
    landingRoute: "/dashboard",
    widgets: widgets(["kpis", "rule-status", "monthly-activity", "rules-published-per-product", "product-conflict-summary", "draft-rules", "quick-actions"]),
    kpis: PRODUCT_MANAGER_KPIS,
    quickActions: ["decision-matrix", "view-approvals", "open-repository"],
  },
  "usr-kavita-rao": {
    userId: "usr-kavita-rao",
    landingRoute: "/dashboard",
    widgets: RULE_APPROVER_WIDGETS,
    kpis: RULE_APPROVER_KPIS,
    quickActions: ["view-approvals", "open-repository"],
  },
  "usr-arjun-nair": {
    userId: "usr-arjun-nair",
    landingRoute: "/dashboard",
    widgets: RULE_TESTER_WIDGETS,
    kpis: RULE_TESTER_KPIS,
    quickActions: ["run-simulator", "open-repository"],
  },
  "usr-divya-iyer": {
    userId: "usr-divya-iyer",
    landingRoute: "/dashboard",
    widgets: RULE_VIEWER_WIDGETS,
    kpis: RULE_VIEWER_KPIS,
    quickActions: ["open-repository"],
  },
  "usr-vikram-chawla": {
    userId: "usr-vikram-chawla",
    landingRoute: "/dashboard",
    widgets: SYSTEM_ADMIN_WIDGETS,
    kpis: SYSTEM_ADMIN_KPIS,
    quickActions: ["manage-users", "view-audit-log", "configuration-studio"],
  },
  "usr-ved-prakash": {
    userId: "usr-ved-prakash",
    landingRoute: "/dashboard",
    widgets: SYSTEM_ADMIN_WIDGETS,
    kpis: SYSTEM_ADMIN_KPIS,
    quickActions: ["manage-users", "view-audit-log", "configuration-studio"],
  },
};
