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
      className="relative overflow-hidden text-[#f3f8fb] !border-none !rounded-none !border-b !border-[#ffffff1a] !shadow-[0_12px_32px_-20px_#02143259]"
      style={{ background: "linear-gradient(90deg, #2f679d, #002f58)" }}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-[10px] pb-[6px] sm:px-5">
          <div className="min-w-0">
            {/* Explicit text color, not inherited: globals.css's base `h1 {
                color: var(--foreground) }` rule wins over inherited color
                regardless of the parent's text class, so without this the
                greeting renders near-black instead of the intended off-white. */}
            <h1 className="text-lg font-semibold tracking-tight text-[#f3f8fb] sm:text-xl">Hi, {name} 👋</h1>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        <div className="px-4 pb-3 sm:px-5">{children}</div>
      </div>
    </div>
  );
}
