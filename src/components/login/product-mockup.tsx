import { CheckCircle2 } from "lucide-react";

const STATUS_DOT: Record<string, string> = {
  Published: "bg-emerald-400",
  "Pending Approval": "bg-amber-400",
  Draft: "bg-blue-400",
};

export interface MockupRule {
  id: string;
  name: string;
  status: string;
}

// A stylized "screenshot" of the product itself — real live counts and real
// rule names/statuses from the store, not placeholder content — used as the
// login hero's centerpiece in place of a literal illustration.
export function ProductMockup({
  totalRules,
  activeRules,
  simulationsRun,
  sampleRules,
}: {
  totalRules: number;
  activeRules: number;
  simulationsRun: number;
  sampleRules: MockupRule[];
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
          <div className="rounded-lg border border-sidebar-border bg-sidebar/40 p-2 text-center">
            <p className="text-lg font-bold text-sidebar-foreground">{totalRules}</p>
            <p className="text-sm text-sidebar-foreground/60">Total Rules</p>
          </div>
          <div className="rounded-lg border border-sidebar-primary/40 bg-sidebar-primary/10 p-2 text-center">
            <p className="text-lg font-bold text-sidebar-primary">{activeRules}</p>
            <p className="text-sm text-sidebar-foreground/60">Active</p>
          </div>
          <div className="rounded-lg border border-sidebar-border bg-sidebar/40 p-2 text-center">
            <p className="text-lg font-bold text-sidebar-foreground">{simulationsRun}</p>
            <p className="text-sm text-sidebar-foreground/60">Simulations</p>
          </div>
        </div>

        {/* Mini rule list */}
        <div className="mt-3 space-y-1.5">
          {sampleRules.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-md bg-sidebar/30 px-2.5 py-1.5">
              <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[r.status] ?? "bg-white/40"}`} />
              <span className="truncate text-sm text-sidebar-foreground/80">{r.name}</span>
              <span className="ml-auto shrink-0 font-mono text-sm text-sidebar-foreground/45">{r.id}</span>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
}
