"use client";

import { useCountUp } from "./use-count-up";
import { useReducedMotion } from "./use-reduced-motion";
import { RulePipeline } from "./rule-pipeline";
import { TerminalPrompt } from "./terminal-prompt";

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  const reduceMotion = useReducedMotion();
  const shown = useCountUp(value, 900, reduceMotion);
  return (
    <div
      className={
        accent
          ? "rounded-lg border border-sidebar-primary/40 bg-sidebar-primary/10 p-2 text-center"
          : "rounded-lg border border-sidebar-border bg-sidebar/40 p-2 text-center"
      }
    >
      <p className={`text-lg font-bold tabular-nums ${accent ? "text-sidebar-primary" : "text-sidebar-foreground"}`}>{shown}</p>
      <p className="text-sm text-sidebar-foreground/60">{label}</p>
    </div>
  );
}

// A stylized "screenshot" of the product itself — real live counts from the
// store (animated in once on mount), not placeholder content — used as the
// login hero's centerpiece in place of a literal illustration. The rule list
// that used to sit below the KPI row is now a live evaluation pipeline (see
// RulePipeline) so the hero visually communicates "decision engine
// evaluating rules" rather than reading as a static screenshot.
export function ProductMockup({
  totalRules,
  activeRules,
  simulationsRun,
}: {
  totalRules: number;
  activeRules: number;
  simulationsRun: number;
}) {
  return (
    <div className="relative w-full max-w-md">
      <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-3 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-sm">
        {/* Window chrome */}
        <div className="mb-3 flex items-center gap-1.5 px-1">
          <span className="size-2 rounded-full bg-red-400/70" />
          <span className="size-2 rounded-full bg-amber-400/70" />
          <span className="size-2 rounded-full bg-emerald-400/70" />
          <span className="ml-2 text-sm font-medium text-sidebar-foreground/60">Rule Simulator — Home Loan</span>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Total Rules" value={totalRules} />
          <Stat label="Active" value={activeRules} accent />
          <Stat label="Simulations" value={simulationsRun} />
        </div>

        <RulePipeline />
        <TerminalPrompt />
      </div>
    </div>
  );
}
