"use client";

import { useEffect, useState } from "react";

// Shared by every login-hero animation (rule pipeline, KPI count-up) so
// prefers-reduced-motion is checked once, consistently, instead of each
// component re-implementing its own matchMedia listener.
export function useReducedMotion(): boolean {
  // Lazy initializer (not an effect + setState) so the very first render
  // already reflects the OS setting instead of always starting "false".
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return reduced;
}
