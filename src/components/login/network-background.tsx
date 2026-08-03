// Faint ambient texture for the login page's branding panel — a sparse
// scatter of dust specks over a barely-visible grid, sitting behind the
// product mockup + floating capability badges (the actual visual focus).
// Built from the panel's own --sidebar-foreground token so it stays legible
// against whatever background color the panel is given.
export function NetworkBackground({ className }: { className?: string }) {
  const dust: [number, number, number][] = [
    [30, 60, 1], [340, 30, 1], [600, 20, 1.4], [760, 45, 1], [1010, 55, 1.2],
    [1130, 90, 1], [1240, 175, 1.6], [880, 210, 1], [700, 330, 1.2], [960, 300, 1],
    [1050, 470, 1], [1180, 555, 1.3], [500, 545, 1], [610, 490, 1], [130, 555, 1],
    [780, 555, 1], [1350, 195, 1], [1470, 370, 1], [90, 150, 1], [420, 610, 1],
  ];

  return (
    <svg
      viewBox="0 0 1500 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" style={{ stroke: "var(--sidebar-foreground)" }} strokeOpacity={0.05} strokeWidth={1} />
        </pattern>
      </defs>

      <rect x="0" y="0" width="1500" height="700" fill="url(#grid)" />

      <g style={{ fill: "var(--sidebar-foreground)" }} fillOpacity={0.35}>
        {dust.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} />
        ))}
      </g>
    </svg>
  );
}
