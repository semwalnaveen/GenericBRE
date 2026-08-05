"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function ConfigStudioNav<T extends string>({
  groups,
  activeSection,
  onSelect,
}: {
  groups: ConfigStudioNavGroup<T>[];
  roadmap: RoadmapItem[];
  activeSection: T;
  onSelect: (id: T) => void;
}) {
  const activeGroup = useMemo(() => {
    return groups.find((g) => g.items.some((i) => i.id === activeSection)) ?? groups[0];
  }, [groups, activeSection]);

  return (
    <div className="flex shrink-0 flex-col border-b bg-card/40">
      {/* Tier 1: Groups */}
      <div className="flex flex-wrap items-center gap-6 px-5 pt-2 sm:px-6">
        {groups.map((group) => {
          const isActive = activeGroup.label === group.label;
          return (
            <button
              key={group.label}
              onClick={() => onSelect(group.items[0].id)}
              className={cn(
                "relative pb-2 text-sm font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {group.label}
              {isActive && (
                <motion.div
                  layoutId="activeConfigGroup"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tier 2: Items within the active group */}
      {activeGroup.items.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 bg-muted/10 px-5 py-1.5 sm:px-6">
          {activeGroup.items.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1 text-xs transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm hover:scale-[1.02]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
