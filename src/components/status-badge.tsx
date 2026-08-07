import { cn } from "@/lib/utils";
import { DecisionOutcome, RuleStatus } from "@/lib/types";

// Single canonical status palette — dashboard/charts.tsx's STATUS_COLORS
// mirrors these exact values so a status never renders a different colour
// depending on which screen draws it.
const RULE_STATUS_STYLES: Record<RuleStatus, string> = {
  Draft: "text-blue-600 dark:text-blue-400",
  "Pending Approval": "text-amber-600 dark:text-amber-400",
  Approved: "text-violet-600 dark:text-violet-400",
  Rejected: "text-red-600 dark:text-red-400",
  Published: "text-emerald-600 dark:text-emerald-400",
  Inactive: "text-slate-500 dark:text-slate-400",
  Archived: "text-slate-600 dark:text-slate-500",
  "Pending Deletion": "text-orange-600 dark:text-orange-400",
};

const RULE_STATUS_DOT: Record<RuleStatus, string> = {
  Draft: "bg-blue-500",
  "Pending Approval": "bg-amber-500",
  Approved: "bg-violet-500",
  Rejected: "bg-red-500",
  Published: "bg-emerald-500",
  Inactive: "bg-slate-400",
  Archived: "bg-slate-500",
  "Pending Deletion": "bg-orange-500",
};

export function StatusBadge({ status, className }: { status: RuleStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap",
        RULE_STATUS_STYLES[status],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", RULE_STATUS_DOT[status])} />
      {status}
    </span>
  );
}

// FUTURE: EnvironmentBadge removed for demo. Restore with:
// const RULE_ENVIRONMENT_STYLES: Record<RuleEnvironment, string> = {
//   Dev: "bg-violet-500/12 text-violet-600 dark:text-violet-400 border-violet-500/25",
//   UAT: "bg-sky-500/12 text-sky-600 dark:text-sky-400 border-sky-500/25",
//   Prod: "bg-orange-500/12 text-orange-600 dark:text-orange-400 border-orange-500/25",
// };
// export function EnvironmentBadge({ environment, className }: { environment: RuleEnvironment; className?: string }) { ... }

const OUTCOME_STYLES: Record<DecisionOutcome, string> = {
  Approved: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  Rejected: "bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/25",
  "Review Required": "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25",
};

export function OutcomeBadge({ outcome, className }: { outcome: DecisionOutcome; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-sm font-semibold whitespace-nowrap",
        OUTCOME_STYLES[outcome],
        className
      )}
    >
      {outcome}
    </span>
  );
}

const PRIORITY_LABEL: Record<number, string> = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Lowest",
};

export function PriorityBadge({ priority, className }: { priority: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-medium text-muted-foreground", className)}>
      <span className="font-mono text-foreground">P{priority}</span>
      <span className="text-muted-foreground/70">{PRIORITY_LABEL[priority] ?? ""}</span>
    </span>
  );
}
