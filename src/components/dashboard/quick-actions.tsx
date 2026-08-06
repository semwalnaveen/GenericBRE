"use client";

import { useRouter } from "next/navigation";
import { Plus, Library, Grid3x3, FlaskConical, Settings, UserCheck, ChevronRight, ShieldCheck, Users, History, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore, useEffectiveCapabilities } from "@/lib/store";
import { Capability } from "@/lib/types";
import { PanelHeader } from "./recent-panels";

interface Action {
  label: string;
  desc: string;
  icon: LucideIcon;
  href: string;
  accent: string;
}

export const DEFAULT_ACTION_IDS = ["create-rule", "open-repository", "decision-matrix", "run-simulator"];

export const ACTION_LABELS: Record<string, string> = {
  "create-rule": "Create Rule",
  "open-repository": "Open Repository",
  "decision-matrix": "Decision Matrix",
  "run-simulator": "Run Simulator",
  "view-approvals": "View Approvals",
  "configuration-studio": "Configuration Studio",
  "manage-users": "Manage Users",
  "view-audit-log": "View Audit Log",
};

// User Access Mapping gate per action — mirrors the requiredCapability each
// destination's nav.ts entry already enforces, so a Quick Action never
// offers a shortcut the sidebar itself would hide. "decision-matrix" stays
// ungated, matching its nav.ts entry (no requiredCapability there either).
const ACTION_REQUIRED_CAPABILITY: Partial<Record<string, Capability>> = {
  "create-rule": "rule.create",
  "open-repository": "rule.view",
  "run-simulator": "rule.simulate",
  "view-approvals": "rule.publish",
  "configuration-studio": "config.manage",
  "manage-users": "system.manage",
  "view-audit-log": "config.manage",
};

const ACTION_REGISTRY: Record<string, Action> = {
  "create-rule": { label: ACTION_LABELS["create-rule"], desc: "Start a new no-code rule", icon: Plus, href: "/rule-builder", accent: "bg-primary text-primary-foreground" },
  "open-repository": { label: ACTION_LABELS["open-repository"], desc: "Browse the full catalogue", icon: Library, href: "/repository", accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  "decision-matrix": { label: ACTION_LABELS["decision-matrix"], desc: "Edit pricing & threshold slabs", icon: Grid3x3, href: "/matrix", accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  "run-simulator": { label: ACTION_LABELS["run-simulator"], desc: "Test a live customer scenario", icon: FlaskConical, href: "/simulator", accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  "view-approvals": { label: ACTION_LABELS["view-approvals"], desc: "Rules submitted and awaiting review", icon: UserCheck, href: "/repository?status=Pending Approval", accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  "configuration-studio": { label: ACTION_LABELS["configuration-studio"], desc: "Manage metadata, roles & dashboards", icon: Settings, href: "/configuration-studio", accent: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
  "manage-users": { label: ACTION_LABELS["manage-users"], desc: "Add, edit or deactivate platform users", icon: Users, href: "/configuration-studio?tab=users", accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  "view-audit-log": { label: ACTION_LABELS["view-audit-log"], desc: "Trace every change with full attribution", icon: History, href: "/audit-log", accent: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
};

export function QuickActions() {
  const router = useRouter();
  const dashboardConfigs = useAppStore((s) => s.dashboardConfigs);
  const userId = useAppStore((s) => s.currentUser.userId);
  const capabilities = useEffectiveCapabilities();

  const ids = dashboardConfigs[userId]?.quickActions?.length ? dashboardConfigs[userId].quickActions! : DEFAULT_ACTION_IDS;
  const actions = ids
    .filter((id) => {
      const req = ACTION_REQUIRED_CAPABILITY[id];
      return !req || capabilities.has(req);
    })
    .map((id) => ACTION_REGISTRY[id])
    .filter((a): a is Action => !!a);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Quick Actions" />
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2.5">
        {actions.map((a, i) => (
          <motion.button
            key={a.label}
            onClick={() => router.push(a.href)}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            whileTap={{ scale: 0.98 }}
            className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/60"
          >
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${a.accent}`}>
              <a.icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight truncate" title={a.label}>{a.label}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate" title={a.desc}>{a.desc}</p>
            </div>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
          </motion.button>
        ))}
        {actions.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
            <ShieldCheck className="size-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">No quick actions available for your role.</p>
          </div>
        )}
      </div>
    </div>
  );
}
