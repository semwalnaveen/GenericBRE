"use client";

import { Pause, Play, X, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function BatchProgressBar({
  processed,
  total,
  elapsedMs,
  paused,
  onTogglePause,
  onCancel,
}: {
  processed: number;
  total: number;
  elapsedMs: number;
  paused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
}) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const rate = elapsedMs > 0 ? processed / (elapsedMs / 1000) : 0;
  const remaining = total - processed;
  const etaSeconds = rate > 0 ? Math.max(0, Math.round(remaining / rate)) : null;

  return (
    <div className="space-y-2.5 rounded-xl border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <Loader2 className="size-3.5 animate-spin text-primary" />
          {paused ? "Paused" : "Processing"} row {processed.toLocaleString()} of {total.toLocaleString()} ({pct}%)
          {etaSeconds !== null && !paused && <span className="text-muted-foreground font-normal">· ETA {etaSeconds}s</span>}
        </span>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onTogglePause}>
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-destructive hover:text-destructive" onClick={onCancel}>
            <X className="size-3" /> Cancel
          </Button>
        </div>
      </div>
      <Progress value={pct} />
    </div>
  );
}
