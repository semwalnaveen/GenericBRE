import { cn } from "@/lib/utils";
import { DecisionOutcome, RuleStatus } from "@/lib/types";

const RULE_STATUS_STYLES: Record<RuleStatus, string> = {
  Draft: "bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/25",
  "Pending Approval": "bg-blue-500/12 text-blue-600 dark:text-blue-400 border-blue-500/25",
  Approved: "bg-violet-500/12 text-violet-600 dark:text-violet-400 border-violet-500/25",
  Rejected: "bg-red-500/12 text-red-600 dark:text-red-400 border-red-500/25",
  Published: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  Inactive: "bg-zinc-500/12 text-zinc-600 dark:text-zinc-400 border-zinc-500/25",
  Archived: "bg-zinc-900/8 text-zinc-500 dark:text-zinc-500 border-zinc-500/20",
};

const RULE_STATUS_DOT: Record<RuleStatus, string> = {
  Draft: "bg-amber-500",
  "Pending Approval": "bg-blue-500",
  Approved: "bg-violet-500",
  Rejected: "bg-red-500",
  Published: "bg-emerald-500",
  Inactive: "bg-zinc-400",
  Archived: "bg-zinc-500",
};

export function StatusBadge({ status, className }: { status: RuleStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-sm font-medium whitespace-nowrap",
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
