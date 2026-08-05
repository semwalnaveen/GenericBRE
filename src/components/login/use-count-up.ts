"use client";

import { useEffect, useState } from "react";

const STEP_MS = 30; // ~30 discrete ticks over a typical 900ms duration

// Animates 0 -> target once on mount (login hero KPI row). Runs once, not in
// a loop — matches the spec's "run once on page load", unlike the rule
// pipeline below it which loops continuously. Interval-driven (not
// requestAnimationFrame) so the count still advances in a backgrounded/
// unfocused tab instead of silently freezing — a plain KPI tick-up doesn't
// need per-frame smoothness, so the coarser cadence is an acceptable trade.
export function useCountUp(target: number, durationMs: number, skip: boolean): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (skip) return; // reduced motion (or already-settled) — render `target` directly below, no animation loop
    const start = Date.now();
    const id = setInterval(() => {
      const progress = Math.min((Date.now() - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress >= 1) clearInterval(id);
    }, STEP_MS);
    return () => clearInterval(id);
    // Intentionally re-runs only when target/skip change (e.g. store hydrates
    // with real counts) — durationMs is a constant, not worth chasing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, skip]);

  return skip ? target : value;
}
