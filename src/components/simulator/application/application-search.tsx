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
  onFetch,
  loading,
  quickPicks,
  onPick,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  onFetch: () => void;
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="application-id"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) onFetch();
            }}
            placeholder="e.g. APP000124"
            disabled={loading}
            aria-invalid={invalid}
            className={cn("h-10 pl-8 font-mono text-sm", invalid && "border-destructive focus-visible:ring-destructive/40")}
          />
          {invalid && <p className="mt-1 text-sm text-destructive">Enter an Application ID to continue.</p>}
        </div>
        <Button onClick={onFetch} disabled={loading} className="h-10 gap-1.5 text-sm font-semibold shrink-0">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {loading ? "Fetching Application…" : "Fetch Details"}
        </Button>
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
