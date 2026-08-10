"use client";

import { useEffect, useState } from "react";
import { Check, X, FileCheck2 } from "lucide-react";
import { useReducedMotion } from "./use-reduced-motion";

// A small, deterministic loop of BRE-flavored checks — not tied to any real
// rule data (unlike the KPI row above it, which is) — purely to make the
// login hero read as "a decision engine evaluating rules in real time"
// rather than a static screenshot. Deliberately industry-agnostic (no loan/
// underwriting fields) — this is the generic engine, not a vertical demo.
const PIPELINE_STEPS = ["Eligibility Check", "Risk Score", "Compliance", "Conflict Check"];

// Three outcomes, rotated cycle-to-cycle rather than randomized — a fixed
// rotation is just as visually "different every time" as true randomness
// here, and stays predictable/testable. failIndex: -1 means every step
// passes; otherwise the step at that index fails and nothing after it runs.
const OUTCOMES: { failIndex: number; label: string; tone: "pass" | "warn" | "fail" }[] = [
  { failIndex: -1, label: "APPROVED", tone: "pass" },
  { failIndex: 1, label: "MANUAL REVIEW", tone: "warn" },
  { failIndex: 2, label: "REJECTED", tone: "fail" },
];

const TONE_CLASSES: Record<string, string> = {
  pass: "border-emerald-400/40 bg-emerald-400/15 text-emerald-400",
  warn: "border-amber-400/40 bg-amber-400/15 text-amber-400",
  fail: "border-red-400/40 bg-red-400/15 text-red-400",
};

const STEP_MS = 550; // time each step spends "evaluating" before it passes
const HOLD_TICKS = 3; // ~1.65s holding on the outcome badge
const GAP_TICKS = 1; // brief blank beat before the next pass starts

function usePipelinePhase(stepCount: number, reduceMotion: boolean) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setTick((t) => t + 1), STEP_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  if (reduceMotion) {
    // Static end-state only — the friendliest one, no motion.
    return { activeIndex: -1, passedCount: stepCount, failedIndex: -1, outcome: OUTCOMES[0] };
  }

  // Fixed cycle length regardless of which outcome is playing — the failing
  // scenarios just stop advancing early and hold on the failure instead of
  // continuing, so every cycle still takes the same wall-clock time.
  const cycleLength = stepCount + HOLD_TICKS + GAP_TICKS;
  const cycleNumber = Math.floor(tick / cycleLength);
  const outcome = OUTCOMES[cycleNumber % OUTCOMES.length];
  const phase = tick % cycleLength;

  if (phase < GAP_TICKS) {
    return { activeIndex: -1, passedCount: 0, failedIndex: -1, outcome: null };
  }
  const p = phase - GAP_TICKS;
  const failAt = outcome.failIndex;

  if (p < stepCount) {
    if (failAt !== -1 && p >= failAt) {
      // Reached (or already past) the failing step — freeze here, nothing
      // further evaluates, until the hold phase reveals the outcome.
      return { activeIndex: -1, passedCount: failAt, failedIndex: failAt, outcome: null };
    }
    return { activeIndex: p, passedCount: p, failedIndex: -1, outcome: null };
  }

  const passedCount = failAt === -1 ? stepCount : failAt;
  return { activeIndex: -1, passedCount, failedIndex: failAt === -1 ? -1 : failAt, outcome };
}

export function RulePipeline() {
  const reduceMotion = useReducedMotion();
  const { activeIndex, passedCount, failedIndex, outcome } = usePipelinePhase(PIPELINE_STEPS.length, reduceMotion);

  return (
    <div aria-hidden="true" className="mt-3 rounded-lg border border-sidebar-border bg-sidebar/30 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-sidebar-foreground/55">
        <FileCheck2 className="size-3" />
        <span className="text-sm font-medium">Live Rule Evaluation</span>
      </div>

      <div className="mt-2 flex flex-col">
        {PIPELINE_STEPS.map((label, i) => {
          const passed = i < passedCount;
          const failed = i === failedIndex;
          const active = i === activeIndex;
          return (
            <div key={label}>
              <div className="flex items-center gap-2.5 py-0.5">
                <span
                  className={`ucrm-motion-safe flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                    failed
                      ? "border-red-400/70 bg-red-400/20"
                      : passed
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
                  {failed && (
                    <X
                      className="ucrm-motion-safe size-2.5 text-red-400"
                      style={{ animation: "ucrmCheckPop 0.35s ease-out" }}
                    />
                  )}
                </span>
                <span
                  className={`text-sm transition-colors duration-300 ${
                    failed
                      ? "text-red-300"
                      : passed || active
                        ? "text-sidebar-foreground/85"
                        : "text-sidebar-foreground/45"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="ml-[7px] h-2 w-px overflow-hidden bg-sidebar-border">
                  {i === passedCount - 1 && failedIndex === -1 && (
                    // The connector right below the step that *just* passed —
                    // a short traveling glow into the next node. Skipped once
                    // a step has failed (execution stopped, nothing flows on).
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
        {outcome && (
          <div
            key={outcome.label}
            className={`ucrm-motion-safe flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 ${TONE_CLASSES[outcome.tone]}`}
            style={{ animation: "ucrmApprovedReveal 0.4s ease-out" }}
          >
            {outcome.tone === "fail" ? <X className="size-3" /> : <Check className="size-3" />}
            <span className="text-sm font-semibold tracking-wide">{outcome.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
