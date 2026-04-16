import clsx from "clsx";

export function Logo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="adgen-g" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#c3ff3e" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#adgen-g)" />
        <path
          d="M10 22 L16 10 L22 22 M12.5 17.5 H19.5"
          stroke="#0a0a0d"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="font-display text-[15px] font-semibold tracking-tight text-ink-hi">
        AdGen
        <span className="ml-1 align-middle text-[10px] font-mono uppercase tracking-[0.2em] text-volt">
          /lab
        </span>
      </span>
    </span>
  );
}
