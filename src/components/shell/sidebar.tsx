"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { LogoLockup } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const storeCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setStoreCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const [isHovered, setIsHovered] = useState(false);

  const collapsed = storeCollapsed && !isHovered;

  return (
    <motion.aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ width: collapsed ? 56 : 230 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="sidebar-glass relative z-30 ml-2 mr-3 mt-2 mb-3 hidden shrink-0 flex-col overflow-hidden rounded-3xl border border-white/40 bg-sidebar/70 text-sidebar-foreground shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)] backdrop-blur-xl md:flex dark:border-white/10 dark:bg-black/20"
      style={{ height: "calc(100vh - 20px)" }}
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
          onClick={() => setStoreCollapsed(!storeCollapsed)}
          className="w-full justify-center text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground dark:hover:bg-sidebar-accent"
        >
          {storeCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>
    </motion.aside>
  );
}
