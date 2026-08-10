// Dashboard-only greeting banner. Fixed navy-blue gradient (matches the
// reference dashboard's own inspected banner styling) — deliberately
// independent of the --sidebar token (which is white by default) and of the
// app's own light/dark toggle, same as the login page's fixed hero. The KPI
// strip now lives *inside* this banner (passed as `children`) rather than
// floating below it, sharing the same gradient surface.
export function HeroBanner({
  name,
  actions,
  children,
}: {
  name: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="relative ml-0 mr-1 mt-2 overflow-hidden rounded-2xl border border-sidebar-primary/20 text-sidebar-primary-foreground shadow-md sm:ml-0 sm:mr-2"
      style={{
        background: "linear-gradient(90deg, color-mix(in oklch, var(--sidebar-primary) 85%, white), color-mix(in oklch, var(--sidebar-primary) 75%, black))"
      }}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-[10px] pb-[6px] sm:px-5">
          <div className="min-w-0">
            {/* Explicit text color, not inherited: globals.css's base `h1 {
                color: var(--foreground) }` rule wins over inherited color
                regardless of the parent's text class, so without this the
                greeting renders near-black instead of the intended off-white. */}
            <h1 className="text-lg font-semibold tracking-tight text-sidebar-primary-foreground sm:text-xl">
              Hi, <span className="font-bold opacity-90">{name}</span> 👋
            </h1>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        <div className="px-4 pb-3 sm:px-5">{children}</div>
      </div>
    </div>
  );
}
