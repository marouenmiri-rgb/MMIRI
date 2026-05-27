"use client";

import { useEffect, useState } from "react";

/**
 * Compact KPI block — eyebrow label, count-up value, optional delta + footnote.
 * Used in the 3PL Finder hero row. Animates from 0 on mount so the page
 * has a sub-second sense of motion.
 */
export function KpiTile({
  label,
  value,
  prefix = "",
  suffix = "",
  delta,
  hint,
  accent = "volt",
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  accent?: "volt" | "lime" | "warn";
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const end = value;
    const duration = 900;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const accentClass =
    accent === "lime"
      ? "text-lime"
      : accent === "warn"
        ? "text-warn"
        : "text-volt";

  const formatted =
    display >= 1000
      ? display.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : String(display);

  return (
    <div className="group relative overflow-hidden rounded-xl2 border border-line-1 bg-base-1 p-5 transition hover:border-line-2">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 transition group-hover:opacity-100"
        style={{
          background:
            accent === "lime"
              ? "radial-gradient(circle, rgba(195,255,62,0.12), transparent 70%)"
              : "radial-gradient(circle, rgba(167,139,250,0.14), transparent 70%)",
        }}
      />
      <div className="relative">
        <div className={`font-mono text-[10px] uppercase tracking-[0.22em] ${accentClass}`}>
          {label}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-[34px] tracking-tightest text-ink-hi leading-none">
            {prefix}
            {formatted}
            {suffix}
          </span>
          {delta ? (
            <span
              className={`font-mono text-[11px] ${delta.positive ? "text-lime" : "text-ink-mid"}`}
            >
              {delta.value}
            </span>
          ) : null}
        </div>
        {hint ? (
          <div className="mt-2 text-[11px] text-ink-mid">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}
