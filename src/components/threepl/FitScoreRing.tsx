"use client";

import { useEffect, useState } from "react";

/**
 * Animated circular fit-score ring. Colors grade with score:
 *   90+  lime
 *   70+  volt
 *   50+  amber
 *   <50  ink-mid
 *
 * The numeric value counts up from 0 to `score` on mount so the dashboard
 * has a small heartbeat the first time a lead row paints.
 */
export function FitScoreRing({
  score,
  size = 92,
  stroke = 8,
  label = "fit",
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const end = score;
    const duration = 700;
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
  }, [score]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - display / 100);
  const tone = colorFor(score);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.2s ease-out",
            filter: `drop-shadow(0 0 8px ${tone.glow})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display tracking-tightest leading-none"
          style={{ color: tone.text, fontSize: size * 0.32 }}
        >
          {display}
        </span>
        <span
          className="mt-1 font-mono uppercase tracking-[0.22em] text-ink-dim"
          style={{ fontSize: size * 0.09 }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function colorFor(score: number) {
  if (score >= 90)
    return {
      stroke: "#c3ff3e",
      text: "#d4ff66",
      glow: "rgba(195,255,62,0.35)",
    };
  if (score >= 70)
    return {
      stroke: "#a78bfa",
      text: "#b8a1fb",
      glow: "rgba(167,139,250,0.35)",
    };
  if (score >= 50)
    return {
      stroke: "#f59e0b",
      text: "#fbbf24",
      glow: "rgba(245,158,11,0.35)",
    };
  return {
    stroke: "#4a4a5a",
    text: "#a7a7b8",
    glow: "rgba(74,74,90,0.0)",
  };
}
