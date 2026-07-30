"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronsLeft, ChevronsRight, type LucideIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export interface ConfigStudioNavItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
}
export interface ConfigStudioNavGroup<T extends string> {
  label: string;
  items: ConfigStudioNavItem<T>[];
}
interface RoadmapItem {
  icon: LucideIcon;
  label: string;
  desc: string;
}

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 72;
// Below this, the rail auto-collapses regardless of the saved preference,
// and the toggle opens an overlay instead of resizing in place — the one
// real behavioral branch in the responsive spec (Desktop/Laptop both just
// honor the saved/default-expanded preference; nothing differs between them).
const AUTO_COLLAPSE_BELOW = 992;

function NavButton<T extends string>({
  item,
  active,
  collapsed,
  onSelect,
}: {
  item: ConfigStudioNavItem<T>;
  active: boolean;
  collapsed: boolean;
  onSelect: (id: T) => void;
}) {
  const button = (
    <button
      onClick={() => onSelect(item.id)}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-none text-left text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {active && (
        <span
          className={cn(
            "absolute top-1/2 h-4.5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary",
            collapsed ? "left-0" : "-left-2"
          )}
        />
      )}
      <item.icon className="size-3.5 shrink-0" />
      {!collapsed && <span className="truncate" title={item.label}>{item.label}</span>}
    </button>
  );

  if (!collapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function NavContent<T extends string>({
  groups,
  roadmap,
  activeSection,
  collapsed,
  openGroup,
  onOpenGroupChange,
  onSelect,
}: {
  groups: ConfigStudioNavGroup<T>[];
  roadmap: RoadmapItem[];
  activeSection: T;
  collapsed: boolean;
  openGroup: string | null;
  onOpenGroupChange: (label: string | null) => void;
  onSelect: (id: T) => void;
}) {
  if (collapsed) {
    return (
      <div className="space-y-1">
        {groups.flatMap((g) => g.items).map((item) => (
          <NavButton key={item.id} item={item} active={activeSection === item.id} collapsed onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <Accordion
      value={openGroup ? [openGroup] : []}
      onValueChange={(v) => onOpenGroupChange((v[0] as string) ?? null)}
      className="gap-1"
    >
      {groups.map((group) => {
        if (group.items.length === 1) {
          const item = group.items[0];
          return (
            <div key={group.label} className="border-b border-border/40 py-1 last:border-b-0">
              <NavButton item={item} active={activeSection === item.id} collapsed={false} onSelect={onSelect} />
            </div>
          );
        }
        return (
          <AccordionItem key={group.label} value={group.label} className="border-b border-border/40 py-1 last:border-b-0">
            <AccordionTrigger className="rounded-none px-2 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:no-underline [&_svg]:size-3.5">
              {group.label}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-0.5 pl-2">
                {group.items.map((item) => (
                  <NavButton key={item.id} item={item} active={activeSection === item.id} collapsed={false} onSelect={onSelect} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}

      {roadmap.length > 0 && (
        <AccordionItem value="__roadmap" className="border-b-0">
          <AccordionTrigger className="rounded-none px-2 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:no-underline [&_svg]:size-3.5">
            Roadmap
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-0.5 pl-2">
              {roadmap.map((u) => (
                <div key={u.label} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground/50">
                  <u.icon className="size-3.5 shrink-0" />
                  <span className="truncate">{u.label}</span>
                  <Badge variant="secondary" className="ml-auto shrink-0 text-sm opacity-70">Planned</Badge>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}

function CollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-end border-t p-2">
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={onToggle}
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              aria-expanded={!collapsed}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            />
          }
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </TooltipTrigger>
        <TooltipContent side="right">{collapsed ? "Expand" : "Collapse"}</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function ConfigStudioNav<T extends string>({
  groups,
  roadmap,
  activeSection,
  onSelect,
}: {
  groups: ConfigStudioNavGroup<T>[];
  roadmap: RoadmapItem[];
  activeSection: T;
  onSelect: (id: T) => void;
}) {
  const preferCollapsed = useAppStore((s) => s.configStudioNavCollapsed);
  const setPreferCollapsed = useAppStore((s) => s.setConfigStudioNavCollapsed);

  const activeGroupLabel = groups.find((g) => g.items.some((i) => i.id === activeSection))?.label ?? groups[0]?.label ?? null;
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroupLabel);
  const [isNarrow, setIsNarrow] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < AUTO_COLLAPSE_BELOW);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Narrow viewports always render collapsed in-flow; anything wider honors
  // the user's saved preference (default expanded).
  const collapsed = isNarrow ? true : preferCollapsed;

  const toggleCollapse = useCallback(() => {
    if (isNarrow) {
      setOverlayOpen((v) => !v);
      return;
    }
    setPreferCollapsed(!preferCollapsed);
  }, [isNarrow, preferCollapsed, setPreferCollapsed]);

  const handleSelect = (id: T) => {
    onSelect(id);
    if (isNarrow) setOverlayOpen(false);
  };

  return (
    <>
      {/* Always-present in-flow rail. On narrow viewports this stays a
          static 72px icon rail — it never itself becomes fixed/overlaid, so
          opening the overlay below never shifts the content pane's width. */}
      <motion.nav
        aria-label="Configuration Studio sections"
        animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex shrink-0 flex-col overflow-hidden border-r bg-card/40"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
          <NavContent
            groups={groups}
            roadmap={roadmap}
            activeSection={activeSection}
            collapsed={collapsed}
            openGroup={openGroup}
            onOpenGroupChange={setOpenGroup}
            onSelect={handleSelect}
          />
        </div>
        <CollapseToggle collapsed={collapsed} onToggle={toggleCollapse} />
      </motion.nav>

      {/* Tablet-only overlay clone — a separate fixed-position panel, so it
          never fights the in-flow rail's own width/animation above. */}
      {isNarrow && overlayOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOverlayOpen(false)} aria-hidden />
          <motion.nav
            aria-label="Configuration Studio sections (expanded)"
            initial={{ x: -EXPANDED_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: -EXPANDED_WIDTH }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ width: EXPANDED_WIDTH }}
            className="fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card shadow-xl"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
              <NavContent
                groups={groups}
                roadmap={roadmap}
                activeSection={activeSection}
                collapsed={false}
                openGroup={openGroup}
                onOpenGroupChange={setOpenGroup}
                onSelect={handleSelect}
              />
            </div>
            <CollapseToggle collapsed={false} onToggle={toggleCollapse} />
          </motion.nav>
        </>
      )}
    </>
  );
}
