"use client";

import { useState } from "react";
import { MoreVertical, LayoutGrid, Pencil, RotateCcw, Save, CheckCircle2 } from "lucide-react";
import { WidgetDef } from "@/lib/types";
import { useDashboardLayout } from "@/lib/dashboard-layout";
import { WidgetReorderList } from "@/components/dashboard/widget-reorder-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface DashboardControlsResult {
  editMode: boolean;
}

// Self-contained, reusable dashboard-customization control: give it a
// unique dashboardKey and the page's widget catalog, drop it next to any
// page header's other actions, and it handles everything — the trigger,
// the dropdown, the "Manage Widgets" drawer, drag-reorder, visibility, and
// persistence. Nothing about it is specific to any one page.
export function DashboardControls({
  dashboardKey,
  widgetDefs,
  editMode,
  onEditModeChange,
  triggerClassName,
}: {
  dashboardKey: string;
  widgetDefs: WidgetDef[];
  editMode: boolean;
  onEditModeChange: (v: boolean) => void;
  /** Override the trigger button's variant styling — e.g. to sit legibly on
   *  the dashboard's dark hero banner instead of the default light card. */
  triggerClassName?: string;
}) {
  const { layout, totalCount, visibleCount, reorder, toggleVisibility, resetLayout } = useDashboardLayout(
    dashboardKey,
    widgetDefs
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const defLabels = Object.fromEntries(widgetDefs.map((d) => [d.id, d.label]));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              title="Dashboard controls"
              aria-label="Dashboard controls"
              className={triggerClassName}
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Dashboard Controls</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setDrawerOpen(true)}>
            <LayoutGrid className="size-4" />
            Manage Widgets
            <DropdownMenuShortcut>
              <Badge variant="secondary">{totalCount}</Badge>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onEditModeChange(!editMode)}
            className={cn(editMode && "bg-primary/10 text-primary")}
          >
            <Pencil className="size-4" />
            {editMode ? "Exit Edit Mode" : "Edit Layout"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={resetLayout}>
            <RotateCcw className="size-4" />
            Reset Layout
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Save className="size-4" />
            Save Layout
            <DropdownMenuShortcut>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Auto
              </Badge>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Manage Widgets</SheetTitle>
            <SheetDescription>
              {visibleCount} of {totalCount} visible · Drag to reorder
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4">
            <WidgetReorderList
              items={layout.map((w) => ({ id: w.id, visible: !w.hidden, order: w.order }))}
              labels={defLabels}
              onReorder={(items) => reorder(items.map((i) => i.id))}
              onToggleVisible={toggleVisibility}
            />
          </div>

          <SheetFooter>
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5 shrink-0" />
              Changes auto-saved on this device
            </div>
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={resetLayout}>
              <RotateCcw className="size-3.5" /> Reset to Default Layout
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
