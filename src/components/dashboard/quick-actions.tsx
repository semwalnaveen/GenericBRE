"use client";

import { useRouter } from "next/navigation";
import { Plus, Library, Grid3x3, FlaskConical, Settings, UserCheck, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
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
};

const ACTION_REGISTRY: Record<string, Action> = {
  "create-rule": { label: ACTION_LABELS["create-rule"], desc: "Start a new no-code rule", icon: Plus, href: "/rule-builder", accent: "bg-primary text-primary-foreground" },
  "open-repository": { label: ACTION_LABELS["open-repository"], desc: "Browse the full catalogue", icon: Library, href: "/repository", accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  "decision-matrix": { label: ACTION_LABELS["decision-matrix"], desc: "Edit pricing & threshold slabs", icon: Grid3x3, href: "/matrix", accent: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  "run-simulator": { label: ACTION_LABELS["run-simulator"], desc: "Test a live customer scenario", icon: FlaskConical, href: "/simulator", accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  "view-approvals": { label: ACTION_LABELS["view-approvals"], desc: "Rules submitted and awaiting review", icon: UserCheck, href: "/repository?status=Testing", accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  "configuration-studio": { label: ACTION_LABELS["configuration-studio"], desc: "Manage metadata, roles & dashboards", icon: Settings, href: "/configuration-studio", accent: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
};

export function QuickActions() {
  const router = useRouter();
  const dashboardConfigs = useAppStore((s) => s.dashboardConfigs);
  const userId = useAppStore((s) => s.currentUser.userId);

  const ids = dashboardConfigs[userId]?.quickActions?.length ? dashboardConfigs[userId].quickActions! : DEFAULT_ACTION_IDS;
  const actions = ids.map((id) => ACTION_REGISTRY[id]).filter((a): a is Action => !!a);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card shadow-sm">
      <PanelHeader title="Quick Actions" />
      <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto p-2.5">
        {actions.map((a, i) => (
          <motion.button
            key={a.label}
            onClick={() => router.push(a.href)}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            className="flex flex-col items-start gap-1.5 rounded-xl border bg-card p-3 text-left transition-shadow hover:shadow-md"
          >
            <span className={`flex size-7 items-center justify-center rounded-lg ${a.accent}`}>
              <a.icon className="size-3.5" />
            </span>
            <div className="min-w-0 w-full">
              <p className="text-sm font-semibold leading-tight truncate" title={a.label}>{a.label}</p>
              <p className="text-sm text-muted-foreground leading-tight mt-0.5 truncate" title={a.desc}>{a.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
