"use client";

import { Search, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ApplicationQuickPick {
  id: string;
  applicantName: string;
  productName: string;
}

export function ApplicationSearch({
  value,
  onChange,
  loading,
  quickPicks,
  onPick,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  loading: boolean;
  quickPicks: ApplicationQuickPick[];
  onPick: (id: string) => void;
  invalid: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs space-y-3">
      <div>
        <label htmlFor="application-id" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Application ID
        </label>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Enter an application ID to fetch its data and auto-identify the product. No manual product selection or JSON needed.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="application-id"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type Application ID to auto-search (e.g. APP000124)..."
          aria-invalid={invalid}
          className={cn("h-10 pl-9 font-mono text-sm pr-10", invalid && "border-destructive focus-visible:ring-destructive/40")}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {invalid && <p className="mt-1.5 text-sm font-medium text-destructive">Enter a valid Application ID to continue.</p>}
      </div>

      {quickPicks.length > 0 && (
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-sm font-medium text-muted-foreground">Sample applications</p>
          <div className="flex flex-wrap gap-1.5">
            {quickPicks.map((q) => (
              <button
                key={q.id}
                onClick={() => onPick(q.id)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-sm transition-colors hover:bg-accent disabled:opacity-50"
                title={`${q.applicantName} · ${q.productName}`}
              >
                <span className="font-mono font-medium text-foreground">{q.id}</span>
                <span className="text-muted-foreground">· {q.productName}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
