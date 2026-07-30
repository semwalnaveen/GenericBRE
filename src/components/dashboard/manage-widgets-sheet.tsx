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
  "domain-distribution": "Domain Distribution",
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
};
