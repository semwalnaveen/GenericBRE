import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// A floating capability pill — light, high-contrast surface against the
// dark hero gradient (matches the reference's white-on-blue badge style),
// positioned by the caller via className (absolute for the floating ones,
// static for the in-flow row beneath the mockup).
export function FeatureBadge({ label, className, style }: { label: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-sidebar-border bg-sidebar-accent/90 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-sidebar-foreground shadow-lg backdrop-blur-sm",
        className
      )}
    >
      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
      {label}
    </div>
  );
}
