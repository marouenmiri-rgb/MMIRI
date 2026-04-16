"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PulsePoint = { day: string; cents: number };

/**
 * Revenue Pulse — the signature visual of the Revenue page.
 *
 * A 30-day SVG area chart that draws smoothly, plus a floating flash +
 * "+$X.XX" chip each time a new conversion is detected (by diffing the
 * most-recent cents total). The big number counts up from 0 to total
 * so the page feels alive the moment it loads.
 */
export function RevenuePulse({
  series,
  totalCents,
  currency = "USD",
}: {
  series: PulsePoint[];
  totalCents: number;
  currency?: string;
}) {
  const [displayCents, setDisplayCents] = useState(0);
  const [flashes, setFlashes] = useState<
    { id: number; x: number; amount: number }[]
  >([]);
  const lastTotal = useRef(totalCents);

  // Count-up animation on mount / totalCents change.
  useEffect(() => {
    const start = displayCents;
    const end = totalCents;
    const duration = 900;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCents(Math.round(start + (end - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCents]);

  // When new revenue arrives while the page is open, flash a spark.
  useEffect(() => {
    if (totalCents > lastTotal.current) {
      const delta = totalCents - lastTotal.current;
      const id = Date.now();
      setFlashes((f) => [...f, { id, x: 90 + Math.random() * 6, amount: delta }]);
      setTimeout(() => setFlashes((f) => f.filter((x) => x.id !== id)), 2400);
    }
    lastTotal.current = totalCents;
  }, [totalCents]);

  const path = useMemo(() => buildPath(series), [series]);

  return (
    <div className="relative overflow-hidden rounded-xl2 border border-line-2 bg-base-1 p-8">
      <div className="absolute inset-0 spot opacity-60" />
      <div className="grid-bg absolute inset-0 opacity-40 animate-gridShift" />

      <div className="relative grid gap-8 lg:grid-cols-[1fr_minmax(0,_460px)] lg:items-end">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            Attributed revenue · last 30 days
          </div>
          <div className="mt-4 font-display text-7xl tracking-tightest text-ink-hi">
            {formatMoney(displayCents, currency)}
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-ink-mid">
            <span className="chip-live">
              <span className="dot-live" /> live
            </span>
            <span>
              UTM-attributed to AdGen posts via{" "}
              <code className="font-mono text-volt">/s/&lt;code&gt;</code>
            </span>
          </div>
        </div>

        {/* Pulse chart */}
        <div className="relative h-32">
          <svg
            viewBox="0 0 100 36"
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            <defs>
              <linearGradient id="pulse-g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#c3ff3e" stopOpacity="0.5" />
                <stop offset="1" stopColor="#c3ff3e" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={path.area} fill="url(#pulse-g)" />
            <path
              d={path.line}
              fill="none"
              stroke="#c3ff3e"
              strokeWidth={0.8}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* baseline */}
            <line
              x1="0"
              y1="34"
              x2="100"
              y2="34"
              stroke="#2a2a38"
              strokeDasharray="1 2"
              strokeWidth="0.3"
            />
          </svg>

          {/* Floating flashes */}
          {flashes.map((f) => (
            <div
              key={f.id}
              className="absolute -translate-x-1/2 animate-float"
              style={{ left: `${f.x}%`, bottom: "20%" }}
            >
              <div className="rounded-full border border-lime bg-lime/20 px-2 py-0.5 font-mono text-[11px] text-lime">
                +{formatMoney(f.amount, currency)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildPath(series: PulsePoint[]): { line: string; area: string } {
  if (series.length < 2) return { line: "", area: "" };
  const max = Math.max(1, ...series.map((p) => p.cents));
  const w = 100;
  const h = 32; // leaves room for baseline
  const step = w / (series.length - 1);
  const pts = series.map((p, i) => {
    const x = i * step;
    const y = h - (p.cents / max) * (h - 2) - 2;
    return { x, y };
  });
  const d = pts
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
  const area = `${d} L ${pts[pts.length - 1].x} ${h + 2} L ${pts[0].x} ${h + 2} Z`;
  return { line: d, area };
}

function formatMoney(cents: number, currency: string): string {
  const value = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: value >= 100 ? 0 : 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}
