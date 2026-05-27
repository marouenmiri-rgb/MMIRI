import clsx from "clsx";

export function Logo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        style={{
          filter: "drop-shadow(0 4px 12px rgba(167,139,250,0.35))",
        }}
      >
        <defs>
          <linearGradient id="adgen-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#bca5ff" />
            <stop offset="0.5" stopColor="#7c4dff" />
            <stop offset="1" stopColor="#c3ff3e" />
          </linearGradient>
          <linearGradient id="adgen-inner" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#adgen-g)" />
        <rect x="2" y="2" width="28" height="28" rx="9" fill="url(#adgen-inner)" />
        <path
          d="M10 22 L16 10 L22 22 M12.5 17.5 H19.5"
          stroke="#0a0a10"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="font-display text-[15px] font-semibold tracking-tight text-ink-hi">
        AdGen
        <span className="ml-1.5 align-middle font-mono text-[10px] font-normal uppercase tracking-[0.22em] text-volt">
          /lab
        </span>
      </span>
    </span>
  );
}
