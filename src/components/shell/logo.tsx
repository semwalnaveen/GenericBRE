"use client";

import Image from "next/image";
import { useAppStore } from "@/lib/store";
import { Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoMark({ className, context = "sidebar" }: { className?: string; context?: "sidebar" | "login" }) {
  const logo = useAppStore((s) => context === "login" ? s.appearance.loginLogo : s.appearance.sidebarLogo);
  if (logo) {
    return <Image src={logo} alt="Client logo" width={32} height={32} className={cn("size-8 rounded-md object-contain", className)} priority />;
  }
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-sidebar-primary/60 text-sidebar-primary-foreground shadow-sm",
        className
      )}
    >
      <Workflow className="size-4.5" strokeWidth={2.5} />
    </div>
  );
}

export function LogoLockup({ collapsed }: { collapsed?: boolean }) {
  const appName = useAppStore((s) => s.appearance.appName);
  const tagline = useAppStore((s) => s.appearance.tagline);
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <LogoMark />
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
            {appName}
          </span>
          <span className="truncate text-sm text-sidebar-foreground/55">{tagline}</span>
        </div>
      )}
    </div>
  );
}
