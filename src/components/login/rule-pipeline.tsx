"use client";

import { useEffect, useState } from "react";
import { Check, FileCheck2 } from "lucide-react";
import { useReducedMotion } from "./use-reduced-motion";

// A small, deterministic loop of BRE-flavored checks — not tied to any real
// rule data (unlike the KPI row above it, which is) — purely to make the
// login hero read as "a decision engine evaluating rules in real time"
// rather than a static screenshot. Mirrors a real Home Loan underwriting
// pass: age -> credit -> income -> collateral, then Approved.
const PIPELINE_STEPS = ["Applicant Age", "Credit Score", "Income (FOIR)", "LTV Ratio"];

const STEP_MS = 550; // time each step spends "evaluating" before it passes
const HOLD_TICKS = 3; // ~1.65s holding on the Approved state
const GAP_TICKS = 1; // brief blank beat before the next pass starts

function usePipelinePhase(stepCount: number, reduceMotion: boolean) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setTick((t) => t + 1), STEP_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  if (reduceMotion) {
    // Static end-state only
    return { activeIndex: -1, passedCount: stepCount, approved: true };
  }

  // To loop infinitely, we mod the tick by the total cycle length.
  // stepCount + HOLD_TICKS is the active phase. After that, we reset.
  const cycleLength = stepCount + HOLD_TICKS;
  const currentTick = tick % cycleLength;

  if (currentTick < stepCount) {
    return { activeIndex: currentTick, passedCount: currentTick, approved: false };
  }

  return { activeIndex: -1, passedCount: stepCount, approved: true };
}

export function RulePipeline() {
  const reduceMotion = useReducedMotion();
  const { activeIndex, passedCount, approved } = usePipelinePhase(PIPELINE_STEPS.length, reduceMotion);

  return (
    <div aria-hidden="true" className="mt-3 rounded-lg border border-sidebar-border bg-sidebar/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-sidebar-foreground/55">
        <FileCheck2 className="size-3" />
        <span className="text-sm font-medium">Live Evaluation — Home Loan Application</span>
      </div>

      <div className="mt-2 flex flex-col">
        {PIPELINE_STEPS.map((label, i) => {
          const passed = i < passedCount;
          const active = i === activeIndex;
          return (
            <div key={label}>
              <div className="flex items-center gap-2.5 py-0.5">
                <span
                  className={`ucrm-motion-safe flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                    passed
                      ? "border-emerald-400/70 bg-emerald-400/20"
                      : active
                        ? "border-sidebar-primary bg-sidebar-primary/20"
                        : "border-sidebar-border bg-sidebar/40"
                  }`}
                  style={active ? { animation: "ucrmNodePulse 1.1s ease-out infinite" } : undefined}
                >
                  {passed && (
                    <Check
                      className="ucrm-motion-safe size-2.5 text-emerald-400"
                      style={{ animation: "ucrmCheckPop 0.35s ease-out" }}
                    />
                  )}
                </span>
                <span className={`text-sm transition-colors duration-300 ${passed || active ? "text-sidebar-foreground/85" : "text-sidebar-foreground/45"}`}>
                  {label}
                </span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="ml-[7px] h-2 w-px overflow-hidden bg-sidebar-border">
                  {i === passedCount - 1 && (
                    // The connector right below the step that *just* passed —
                    // a short traveling glow into the next node.
                    <div
                      className="ucrm-motion-safe h-full w-full"
                      style={{
                        background: "linear-gradient(180deg, transparent, var(--sidebar-primary), transparent)",
                        backgroundSize: "100% 200%",
                        animation: "ucrmConnectorFlow 0.55s linear",
                      }}
                    />
                  )}
                  {i < passedCount - 1 && <div className="h-full w-full bg-emerald-400/50" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 h-7">
        {approved && (
          <div
            className="ucrm-motion-safe flex w-fit items-center gap-1.5 rounded-md border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-1"
            style={{ animation: "ucrmApprovedReveal 0.4s ease-out" }}
          >
            <Check className="size-3 text-emerald-400" />
            <span className="text-sm font-semibold tracking-wide text-emerald-400">APPROVED</span>
          </div>
        )}
      </div>
    </div>
  );
}
