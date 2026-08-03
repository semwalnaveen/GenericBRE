// Small decorative 4-point sparkle with a blue→purple→pink gradient facet —
// a purely cosmetic accent near the login hero's logo/headline.
export function SparkleAccent({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="sparkle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <path
        d="M32 2 L39 25 L62 32 L39 39 L32 62 L25 39 L2 32 L25 25 Z"
        fill="url(#sparkle-gradient)"
        opacity={0.9}
      />
    </svg>
  );
}
