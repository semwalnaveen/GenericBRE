"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Sparkles, GripVertical } from "lucide-react";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentRulesPanel, RecentActivityPanel, RecentDeploymentsPanel } from "@/components/dashboard/recent-panels";
import { DomainDistributionChart, RuleStatusChart, SimulationResultsChart, ExecutionTimelineChart } from "@/components/dashboard/charts";
import { DemoScenariosPanel } from "@/components/dashboard/demo-scenarios";
import {
  DraftRulesPanel,
  RulesAwaitingReviewPanel,
  ApprovalQueuePanel,
  RuleConflictsPanel,
  ExecutionLogsPanel,
  DecisionLookupPanel,
  BatchRunsPanel,
} from "@/components/dashboard/persona-widgets";
import { WIDGET_LABELS, WIDGET_REQUIRED_CAPABILITY } from "@/components/dashboard/manage-widgets-sheet";
import { DashboardControls } from "@/components/dashboard/dashboard-controls";
import { HeroBanner } from "@/components/dashboard/hero-banner";
import { Button } from "@/components/ui/button";
import { ProgressScoreWidget, DistributionDonutWidget, PerformanceListWidget } from "@/components/dashboard/premium-widgets";
import { useAppStore, useEffectiveCapabilities } from "@/lib/store";
import { DEFAULT_DASHBOARD_CONFIGS } from "@/lib/dashboards";
import { useDashboardLayout, WIDGET_SIZE_SPAN } from "@/lib/dashboard-layout";
import { WidgetDef, WidgetSize } from "@/lib/types";
import { downloadCsv } from "@/lib/csv";
import { useTranslate } from "@/lib/use-translate";

// The render function for every widget except `kpis` (which stays pinned,
// full-width, outside the reorderable/resizable set — see DASHBOARD_WIDGET_DEFS
// below). Every one of these is built on Base UI's <ScrollArea> or otherwise
// needs a genuinely fixed card height, not max-height — ScrollArea's internal
// Viewport is styled `height: 100%`, and a CSS percentage height only
// resolves against an ancestor with an explicit `height`; one derived from
// max-height/flex-grow doesn't count, per spec.
const WIDGET_RENDERERS: Record<string, () => React.ReactNode> = {
  "quick-actions": () => <QuickActions />,
  "recent-rules": () => <RecentRulesPanel />,
  "recent-activity": () => <RecentActivityPanel />,
  "domain-distribution": () => <DomainDistributionChart />,
  "rule-status": () => <RuleStatusChart />,
  "recent-deployments": () => <RecentDeploymentsPanel />,
  "demo-scenarios": () => <DemoScenariosPanel />,
  "draft-rules": () => <DraftRulesPanel />,
  "rules-awaiting-review": () => <RulesAwaitingReviewPanel />,
  "approval-queue": () => <ApprovalQueuePanel />,
  "rule-conflicts": () => <RuleConflictsPanel />,
  "execution-logs": () => <ExecutionLogsPanel />,
  "decision-lookup": () => <DecisionLookupPanel />,
  "simulation-results": () => <SimulationResultsChart />,
  "execution-timeline": () => <ExecutionTimelineChart />,
  "batch-runs": () => <BatchRunsPanel />,
};

const WIDGET_DEFAULT_SIZE: Record<string, WidgetSize> = { "demo-scenarios": "LG", "execution-timeline": "SM" };

export default function DashboardPage() {
  const router = useRouter();
  const t = useTranslate();
  const rules = useAppStore((s) => s.rules);
  const showInsights = useAppStore((s) => s.appearance.showInsights);
  const currentUser = useAppStore((s) => s.currentUser);
  const userId = currentUser.userId;
  const dashboardConfigs = useAppStore((s) => s.dashboardConfigs);
  const domainFilter = useAppStore((s) => s.globalFilters.domains);
  const [editMode, setEditMode] = useState(false);

  // The widget catalog for this page is scoped to the current role's
  // admin-configured defaults (Configuration Studio → Dashboard Management,
  // BRD §5.3) — a Business Analyst can reorder/hide/resize the widgets
  // curated for them, not reveal a different persona's widgets entirely.
  // That admin list is a ceiling, not a guarantee: it's further filtered
  // against the signed-in user's own User Access Mapping grants below, so a
  // widget never renders content (e.g. Approval Queue) the user's actual
  // capabilities don't back up.
  const capabilities = useEffectiveCapabilities();
  
  let userConfig = dashboardConfigs[userId];
  if (!userConfig || !userConfig.widgets?.length) {
    userConfig = currentUser.role === "System Administrator" 
      ? DEFAULT_DASHBOARD_CONFIGS["usr-ved-prakash"] 
      : DEFAULT_DASHBOARD_CONFIGS["usr-ananya-verma"];
  }

  const roleWidgets = (userConfig?.widgets ?? []).filter((w) => {
    const req = WIDGET_REQUIRED_CAPABILITY[w.id];
    return !req || capabilities.has(req);
  });
  const widgetDefs: WidgetDef[] = roleWidgets
    .filter((w) => w.visible && w.id !== "kpis")
    .map((w) => ({
      id: w.id,
      label: WIDGET_LABELS[w.id] ?? w.id,
      defaultSize: WIDGET_DEFAULT_SIZE[w.id] ?? "SM",
      defaultOrder: w.order,
    }));
  const dashboardKey = `bre-overview-v3:${userId}`;
  const { visibleWidgets, reorder } = useDashboardLayout(dashboardKey, widgetDefs);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const handleGridDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const ids = visibleWidgets.map((w) => w.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggedId);
    reorder(ids);
    setDraggedId(null);
  };

  const pendingReview = rules.filter((r) => r.status === "Pending Approval").length;
  const criticalDrafts = rules.filter((r) => r.status === "Draft" && r.priority === 1).length;

  const exportSummary = () => {
    // Mirrors the same domain-scoped set the widgets above actually display
    // (audit finding B17) rather than the full, unfiltered rule catalog.
    const scopedRules = domainFilter.length ? rules.filter((r) => domainFilter.includes(r.domain)) : rules;
    downloadCsv(
      "bre_dashboard_summary",
      scopedRules.map((r) => ({
        RuleID: r.id,
        Name: r.name,
        Domain: r.domain,
        Category: r.category,
        Priority: r.priority,
        Status: r.status,
        Owner: r.owner,
        UpdatedAt: r.updatedAt,
      }))
    );
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <HeroBanner
          name={currentUser.name.split(" ")[0]}
          actions={
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-white/90 hover:bg-white/10 hover:text-white"
                onClick={exportSummary}
              >
                <Download className="size-3.5" /> {t("dashboard.export")}
              </Button>
              <DashboardControls
                dashboardKey={dashboardKey}
                widgetDefs={widgetDefs}
                editMode={editMode}
                onEditModeChange={setEditMode}
                triggerClassName="border-white/20 bg-transparent text-white/90 hover:bg-white/10 hover:text-white"
              />
            </>
          }
        >
          <KpiCards />
        </HeroBanner>

        <div className="px-4 py-4 sm:px-5">
          <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-6">
            {visibleWidgets.map((w) => {
              const render = WIDGET_RENDERERS[w.id];
              if (!render) return null;
              return (
                <div
                  key={w.id}
                  onDragOver={(e) => editMode && e.preventDefault()}
                  onDrop={() => editMode && handleGridDrop(w.id)}
                  className={`flex h-[240px] max-h-[240px] select-none flex-col gap-1.5 ${WIDGET_SIZE_SPAN[w.size]} ${
                    editMode ? "rounded-xl outline-dashed outline-2 outline-primary/30" : ""
                  }`}
                >
                  {editMode && (
                    <div
                      draggable
                      onDragStart={() => setDraggedId(w.id)}
                      onDragEnd={() => setDraggedId(null)}
                      className="flex shrink-0 cursor-grab items-center justify-center gap-1.5 rounded-t-lg bg-primary/10 py-1 text-sm font-medium text-primary active:cursor-grabbing"
                    >
                      <GripVertical className="size-3.5" /> Drag to reorder
                    </div>
                  )}
                  <div className="min-h-0 flex-1">{render()}</div>
                </div>
              );
            })}
            {visibleWidgets.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                All widgets are hidden. Open Dashboard Controls → Manage Widgets to bring some back.
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
