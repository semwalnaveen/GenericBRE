"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { LogoLockup } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);

  // Expand/collapse only via the explicit toggle button below — no
  // expand-on-hover. Hover-to-expand isn't standard sidebar behavior (it
  // fights click-through and causes layout jumps on accidental mouse-over).
  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 230 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="sidebar-glass relative z-30 hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
      style={{ height: "100%" }}
    >
      <div className="bg-scoped-layer bg-scoped-layer--sidebar" />
      <div className="flex h-14 items-center border-b border-sidebar-border/30 px-3">
        <LogoLockup collapsed={collapsed} />
      </div>

      <SidebarNav collapsed={collapsed} />

      <div className="border-t border-sidebar-border p-2.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground dark:hover:bg-sidebar-accent"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>
    </motion.aside>
  );
}
