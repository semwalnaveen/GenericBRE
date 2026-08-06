"use client";

import { useEffect, useMemo, useState } from "react";

const VIEW_W = 1500;
const VIEW_H = 700;
const R = 42; // hex "radius", center to vertex
const HEX_W = Math.sqrt(3) * R;
const HEX_H = 2 * R;
const V_SPACING = HEX_H * 0.75;

function hexPoints(cx: number, cy: number): string {
  return [
    [cx, cy - R],
    [cx - HEX_W / 2, cy - R / 2],
    [cx - HEX_W / 2, cy + R / 2],
    [cx, cy + R],
    [cx + HEX_W / 2, cy + R / 2],
    [cx + HEX_W / 2, cy - R / 2],
  ]
    .map((p) => p.join(","))
    .join(" ");
}

// Hand-picked (not random) — a handful of tiny particles scattered between
// hex cells, deliberately sparse ("a few", per spec) and fixed so there's no
// randomness to cause a server/client hydration mismatch. Duration/delay
// vary per point so they don't all drift in lockstep.
const PARTICLES: [number, number, number, number][] = [
  // x, y, durationSeconds, delaySeconds
  [220, 140, 9, 0], [640, 90, 11, 2.5], [1080, 180, 8.5, 1],
  [340, 420, 10, 4], [860, 380, 9.5, 1.8], [1230, 470, 11.5, 3.2],
  [500, 590, 8, 0.6], [980, 60, 10.5, 2,],
];

// Enterprise honeycomb backdrop for the login panel — a low-opacity hex
// lattice (computed, not a tiled SVG <pattern>, so there's no seam-alignment
// risk at the panel edges), a handful of hexes softly shimmering in small
// clusters, a slow light sweep crossing the whole grid, and a few tiny
// drifting particles between cells — all behind the product mockup +
// floating capability badges (the actual visual focus, untouched here).
type Glow = { delay: number; dur: number };

export function NetworkBackground({ className }: { className?: string }) {
  // Pure math, no randomness — identical on server and first client render.
  const hexes = useMemo(() => {
    const list: { cx: number; cy: number }[] = [];
    let row = 0;
    for (let y = -HEX_H; y < VIEW_H + HEX_H; y += V_SPACING) {
      const offsetX = row % 2 === 0 ? 0 : HEX_W / 2;
      for (let x = -HEX_W; x < VIEW_W + HEX_W; x += HEX_W) {
        list.push({ cx: x + offsetX, cy: y });
      }
      row++;
    }
    return list;
  }, []);

  // Random glow picks belong in an effect, not useMemo: Math.random() during
  // render is impure (React's rules-of-hooks purity check flags it) and
  // would also mismatch between the server-rendered and first client-rendered
  // markup. An effect only ever runs client-side, after hydration, so this
  // naturally avoids both problems without a manual "mounted" gate.
  const [glowing, setGlowing] = useState<Map<number, Glow>>(new Map());
  useEffect(() => {
    // The setState call is deferred into the timeout callback rather than
    // made synchronously in the effect body — a lone direct setState() call
    // here would trigger React's "avoid cascading renders" lint rule even
    // though there's nothing to cascade (this only ever runs once per
    // mount). Deliberately setTimeout, not requestAnimationFrame: RAF is
    // suspended by the browser for tabs/panes that aren't actively
    // compositing frames (e.g. backgrounded), which would leave this glow
    // set permanently empty in that state; a timer keeps firing regardless.
    const id = setTimeout(() => {
      const picks = new Map<number, Glow>();
      for (let i = 0; i < hexes.length; i++) {
        // Sparser (was 3.5%) and slower (was 4-8s) — fewer points glowing at
        // once, each one lingering longer, reads as a calm shimmer instead
        // of a field of blinking lights.
        if (Math.random() < 0.02) {
          const delay = Math.random() * 8;
          const dur = 6 + Math.random() * 5;
          picks.set(i, { delay, dur });
          // Light the next hex in iteration order too, sharing timing, so
          // glows read as small clusters rather than single isolated cells.
          if (i + 1 < hexes.length) picks.set(i + 1, { delay, dur });
        }
      }
      setGlowing(picks);
    }, 0);
    return () => clearTimeout(id);
  }, [hexes]);

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          {/* Fades the lattice out toward the panel's edges instead of cutting
              off hard at the boundary — the flat, edge-to-edge grid was the
              main thing reading as "busy" rather than refined. Centered
              slightly left/up of middle, roughly where the headline + product
              card sit, so the texture is quietest right behind the content. */}
          <radialGradient id="hexVignette" cx="38%" cy="42%" r="72%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="55%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="hexVignetteMask">
            <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#hexVignette)" />
          </mask>
        </defs>
        <g
          style={{ stroke: "var(--sidebar-foreground)" }}
          strokeOpacity={0.045}
          strokeWidth={1}
          fill="none"
          mask="url(#hexVignetteMask)"
        >
          {hexes.map((h, i) => {
            const glow = glowing.get(i);
            return (
              <polygon
                key={i}
                points={hexPoints(h.cx, h.cy)}
                className={glow ? "ucrm-motion-safe" : undefined}
                style={
                  glow
                    ? { stroke: "var(--sidebar-primary)", animation: `ucrmHexShimmer ${glow.dur}s ease-in-out infinite ${glow.delay}s` }
                    : undefined
                }
              />
            );
          })}
        </g>
        <g mask="url(#hexVignetteMask)" style={{ fill: "var(--sidebar-primary)" }}>
          {PARTICLES.map(([x, y, dur, delay], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={1.6}
              className="ucrm-motion-safe"
              style={{ animation: `ucrmParticleDrift ${dur}s ease-in-out infinite ${delay}s` }}
            />
          ))}
        </g>
      </svg>

      {/* Slow light sweep — one translating gradient band, transform + opacity
          only (no left/background-position), so it's a single GPU-composited
          layer regardless of the 322-hex grid beneath it. mix-blend-mode:
          screen only ever brightens what's underneath, never obscures it, so
          it can pass over content without hurting legibility — though in
          practice it sits behind every real element here (this component is
          the first, deepest child of the panel), same as the rest of the
          background. */}
      <div
        aria-hidden="true"
        className="ucrm-motion-safe pointer-events-none absolute inset-y-0"
        style={{
          left: "-35%",
          width: "35%",
          background: "linear-gradient(90deg, transparent, rgba(94,234,212,0.14), transparent)",
          mixBlendMode: "screen",
          animation: "ucrmHexWave 10s linear infinite",
        }}
      />
    </div>
  );
}
