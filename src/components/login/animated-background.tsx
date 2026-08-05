"use client";

import { useMemo, useState, useEffect } from "react";
import { useReducedMotion } from "./use-reduced-motion";

export function AnimatedBackground() {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-calculate random positions and delays so they remain stable across renders
  const stars = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() > 0.8 ? "2px" : "1px",
      delay: `${Math.random() * 5}s`,
      duration: `${2 + Math.random() * 4}s`,
    }));
  }, []);

  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      bottom: `${Math.random() * 20}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${10 + Math.random() * 10}s`,
    }));
  }, []);

  const nodes = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      top: `${10 + Math.random() * 80}%`,
      left: `${10 + Math.random() * 80}%`,
      delay: `${Math.random() * 5}s`,
    }));
  }, []);

  if (reduceMotion || !mounted) {
    return null; // Or return a completely static grid, but the login page already has a static gradient.
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft Radial Glow */}
      <div 
        className="absolute inset-0 bg-sidebar-primary/5 opacity-50 mix-blend-screen"
        style={{ animation: "breRadialGlow 30s ease-in-out infinite" }}
      >
        <div className="absolute left-1/4 top-1/4 h-[50vh] w-[50vw] rounded-full bg-emerald-400/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[40vh] w-[40vw] rounded-full bg-sidebar-primary/10 blur-[100px]" />
      </div>

      {/* Twinkling Stars */}
      {stars.map((star) => (
        <div
          key={`star-${star.id}`}
          className="absolute rounded-full bg-white/70"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            animation: `breTwinkle ${star.duration} ease-in-out infinite ${star.delay}`,
          }}
        />
      ))}

      {/* Floating Particles */}
      {particles.map((p) => (
        <div
          key={`particle-${p.id}`}
          className="absolute h-1 w-1 rounded-full bg-sidebar-primary/40 blur-[1px]"
          style={{
            left: p.left,
            bottom: p.bottom,
            animation: `breFloatUp ${p.duration} linear infinite ${p.delay}`,
          }}
        />
      ))}

      {/* BRE Rule Flow - Pulsing Nodes and Data Streams */}
      <div className="absolute inset-0 opacity-30 mix-blend-screen">
        {nodes.map((node) => (
          <div
            key={`node-${node.id}`}
            className="absolute h-2 w-2 rounded-full border border-sidebar-primary/50 bg-sidebar-primary/20"
            style={{
              top: node.top,
              left: node.left,
              animation: `breNodePulse 4s ease-in-out infinite ${node.delay}`,
            }}
          />
        ))}

        {/* Abstract flow lines */}
        <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <path d="M 0,200 C 200,200 300,400 500,400 S 700,100 1000,100" fill="none" stroke="currentColor" className="text-sidebar-primary" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M 0,600 C 300,600 400,200 800,200 S 900,500 1200,500" fill="none" stroke="currentColor" className="text-emerald-400" strokeWidth="1" strokeDasharray="4 4" />
        </svg>

        {/* Moving data packets along lines (simplified via absolute positioning across screen) */}
        <div className="absolute top-[30%] h-px w-[100px] bg-gradient-to-r from-transparent via-sidebar-primary to-transparent" style={{ animation: "breDataStream 8s linear infinite" }} />
        <div className="absolute top-[60%] h-px w-[150px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" style={{ animation: "breDataStream 12s linear infinite 4s" }} />
      </div>

      {/* Shooting Star */}
      <div 
        className="absolute top-0 left-0 h-px w-[100px] bg-gradient-to-r from-transparent via-white to-transparent opacity-0 mix-blend-screen"
        style={{
          boxShadow: "0 0 10px 1px rgba(255,255,255,0.3)",
          animation: "breShootingStar 12s linear infinite",
        }}
      />
    </div>
  );
}
