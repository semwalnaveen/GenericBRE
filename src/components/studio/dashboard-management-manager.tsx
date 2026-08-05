"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, LayoutDashboard, UserRound } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { DashboardConfig } from "@/lib/types";
import { WIDGET_LABELS } from "@/components/dashboard/manage-widgets-sheet";
import { WidgetReorderList } from "@/components/dashboard/widget-reorder-list";
import { KPI_LABELS, DEFAULT_KPI_IDS } from "@/components/dashboard/kpi-cards";
import { ACTION_LABELS, DEFAULT_ACTION_IDS } from "@/components/dashboard/quick-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const LANDING_ROUTES: { value: string; label: string }[] = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/rule-builder", label: "Rule Builder" },
  { value: "/repository", label: "Rule Repository" },
  { value: "/matrix", label: "Decision Matrix" },
  { value: "/simulator", label: "Rule Simulator" },
  { value: "/configuration-studio", label: "Configuration Studio" },
];

const ALL_WIDGET_IDS = Object.keys(WIDGET_LABELS);
const ALL_KPI_IDS = Object.keys(KPI_LABELS);
const ALL_ACTION_IDS = Object.keys(ACTION_LABELS);

// Cycled by card position (not tied to a fixed role id) so every role —
// including custom ones added later in Roles Manager — gets a distinct,
// consistent accent for quick visual scanning across the grid.
const ROLE_ACCENT_PALETTE: { bg: string; text: string; border: string }[] = [
  { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", border: "hover:border-blue-500/40" },
  { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", border: "hover:border-emerald-500/40" },
  { bg: "bg-violet-500/10 dark:bg-violet-500/20", text: "text-violet-600 dark:text-violet-400", border: "hover:border-violet-500/40" },
  { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", border: "hover:border-amber-500/40" },
  { bg: "bg-sky-500/10 dark:bg-sky-500/20", text: "text-sky-600 dark:text-sky-400", border: "hover:border-sky-500/40" },
  { bg: "bg-orange-500/10 dark:bg-orange-500/20", text: "text-orange-600 dark:text-orange-400", border: "hover:border-orange-500/40" },
];

function CheckboxPicker({
  allIds,
  labels,
  selected,
  onToggle,
}: {
  allIds: string[];
  labels: Record<string, string>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
      {allIds.map((id) => (
        <label
          key={id}
          className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-foreground transition-colors hover:border-border/60 hover:bg-muted/50"
        >
          <Checkbox checked={selected.includes(id)} onCheckedChange={() => onToggle(id)} />
          <span className="truncate">{labels[id] ?? id}</span>
        </label>
      ))}
    </div>
  );
}

export function DashboardManagementManager() {
  const users = useAppStore((s) => s.users);
  const dashboardConfigs = useAppStore((s) => s.dashboardConfigs);
  const setDashboardConfig = useAppStore((s) => s.setDashboardConfig);
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const configFor = (userId: string): DashboardConfig =>
    dashboardConfigs[userId] ?? {
      userId,
      landingRoute: "/dashboard",
      widgets: ALL_WIDGET_IDS.map((id, order) => ({ id, visible: true, order })),
      kpis: DEFAULT_KPI_IDS,
      quickActions: DEFAULT_ACTION_IDS,
    };

  const updateConfig = (userId: string, patch: Partial<DashboardConfig>) => {
    setDashboardConfig(userId, { ...configFor(userId), userId, ...patch });
    toast.success(`Dashboard defaults for "${users.find((u) => u.id === userId)?.name}" updated.`);
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user layouts..."
              className="h-8 pl-8 text-sm"
            />
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
            {filteredUsers.length} User Layouts
          </span>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
          <LayoutDashboard className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium text-foreground">No user layouts found</p>
          <p className="mt-0.5 text-sm text-muted-foreground">No users match your search filter.</p>
        </div>
      ) : (
        <Accordion className="gap-3">
          {filteredUsers.map((user, idx) => {
            const config = configFor(user.id);
            const Icon = UserRound;
            const accent = ROLE_ACCENT_PALETTE[idx % ROLE_ACCENT_PALETTE.length];

            const setLandingRoute = (route: string) => updateConfig(user.id, { landingRoute: route });
            const reorder = (widgets: DashboardConfig["widgets"]) => updateConfig(user.id, { widgets });
            const toggleVisible = (id: string) =>
              updateConfig(user.id, {
                widgets: config.widgets.some((w) => w.id === id)
                  ? config.widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
                  : [...config.widgets, { id, visible: true, order: config.widgets.length }],
              });
            const kpis = config.kpis?.length ? config.kpis : DEFAULT_KPI_IDS;
            const toggleKpi = (id: string) =>
              updateConfig(user.id, { kpis: kpis.includes(id) ? kpis.filter((k) => k !== id) : [...kpis, id] });
            const actions = config.quickActions?.length ? config.quickActions : DEFAULT_ACTION_IDS;
            const toggleAction = (id: string) =>
              updateConfig(user.id, { quickActions: actions.includes(id) ? actions.filter((a) => a !== id) : [...actions, id] });

            const landingLabel = LANDING_ROUTES.find((r) => r.value === config.landingRoute)?.label ?? config.landingRoute;
            const visibleWidgetCount = config.widgets.filter((w) => w.visible).length;

            return (
              <AccordionItem
                key={user.id}
                value={user.id}
                className={cn("rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl px-4 shadow-sm transition-all hover:bg-card/60 hover:shadow-md", accent.border)}
              >
                <AccordionTrigger className="py-3.5 hover:no-underline">
                  <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg shadow-2xs", accent.bg, accent.text)}>
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-tight text-foreground">{user.name}</p>
                      <p className="truncate text-sm font-medium text-muted-foreground">{user.role}</p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-1.5 text-sm text-muted-foreground sm:flex">
                      <span>{landingLabel}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{kpis.length} KPI{kpis.length === 1 ? "" : "s"}</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 border-t pt-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">Landing Route</label>
                      <Select
                        items={Object.fromEntries(LANDING_ROUTES.map((r) => [r.value, r.label]))}
                        value={config.landingRoute}
                        onValueChange={(v) => setLandingRoute((v as string) ?? "/dashboard")}
                      >
                        <SelectTrigger className="w-full text-sm bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LANDING_ROUTES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">KPI Cards</label>
                      <CheckboxPicker allIds={ALL_KPI_IDS} labels={KPI_LABELS} selected={kpis} onToggle={toggleKpi} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
