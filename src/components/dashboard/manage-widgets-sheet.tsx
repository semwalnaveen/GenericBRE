import { Capability } from "@/lib/types";

// The dashboard's own widget management now lives in dashboard-controls.tsx
// (the generic DashboardControls + useDashboardLayout system). This file
// just keeps the shared id → label registry that both DashboardControls'
// widgetDefs and Configuration Studio's per-role Dashboard Management admin
// screen (dashboard-management-manager.tsx) draw their labels from.
export const WIDGET_LABELS: Record<string, string> = {
  kpis: "KPI Cards",
  "quick-actions": "Quick Actions",
  "recent-rules": "Recently Modified Rules",
  "recent-activity": "Recent Activity",
  "domain-distribution": "Product Distribution",
  "rule-status": "Rule Status Breakdown",
  "recent-deployments": "Recent Deployments",
  "demo-scenarios": "Preconfigured Demo Scenarios",
  "draft-rules": "Draft Rules",
  "rules-awaiting-review": "Rules Awaiting Review",
  "approval-queue": "Approval Queue",
  "rule-conflicts": "Rule Conflicts",
  "execution-logs": "Execution Logs",
  "decision-lookup": "Decision Lookup",
  "simulation-results": "Simulation Outcomes",
  "execution-timeline": "Execution Timeline",
  "batch-runs": "Batch Runs",
};

// User Access Mapping gate per widget — an admin can curate which widgets a
// role's dashboard *offers* (DashboardConfig.widgets, set in Configuration
// Studio → Dashboard Management), but that list is a ceiling, not a
// guarantee: this map is the floor, checked against the signed-in user's own
// effectiveCapabilities() at render time (see dashboard/page.tsx). Approval
// surfaces need rule.publish (the Maker-Checker "checker" grant — see
// capabilities.ts's rule.publish → "rule.approve" label); simulation-only
// widgets need rule.simulate; everything else needs baseline rule.view.
// Undefined/omitted = visible to any signed-in user regardless of grants.
export const WIDGET_REQUIRED_CAPABILITY: Partial<Record<string, Capability>> = {
  "recent-rules": "rule.view",
  "recent-activity": "rule.view",
  "domain-distribution": "rule.view",
  "rule-status": "rule.view",
  "recent-deployments": "rule.view",
  "demo-scenarios": "rule.simulate",
  "draft-rules": "rule.view",
  "rules-awaiting-review": "rule.publish",
  "approval-queue": "rule.publish",
  "rule-conflicts": "rule.view",
  "execution-logs": "rule.view",
  "decision-lookup": "rule.view",
  "simulation-results": "rule.simulate",
  "execution-timeline": "rule.simulate",
  "batch-runs": "rule.simulate",
};
