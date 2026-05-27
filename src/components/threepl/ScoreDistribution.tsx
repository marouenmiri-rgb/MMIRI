/**
 * 10-bucket histogram of lead fit scores, rendered server-side as plain SVG.
 *
 * Visual goal: a quick "where's my pipeline weighted?" glance — bars on the
 * right (90+) feel lime/electric, mid bars (70-) volt, low bars muted.
 */
export function ScoreDistribution({ scores }: { scores: number[] }) {
  const buckets = new Array(10).fill(0) as number[];
  for (const s of scores) {
    const i = Math.min(9, Math.max(0, Math.floor(s / 10)));
    buckets[i] += 1;
  }
  const max = Math.max(1, ...buckets);

  return (
    <div className="rounded-xl2 border border-line-1 bg-base-1 p-5">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-volt">
          Fit-score distribution
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
          {scores.length} leads
        </div>
      </div>
      <div className="mt-4 flex h-28 items-end gap-1.5">
        {buckets.map((n, i) => {
          const h = (n / max) * 100;
          const color = colorForBucket(i);
          return (
            <div
              key={i}
              className="group relative flex-1"
              style={{ height: "100%" }}
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-md transition-all"
                style={{
                  height: `${h}%`,
                  background: color.bg,
                  boxShadow: n > 0 ? `0 0 10px -2px ${color.glow}` : undefined,
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 -top-6 text-center font-mono text-[10px] text-ink-dim opacity-0 group-hover:opacity-100">
                {n}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-wider text-ink-dim">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}

function colorForBucket(i: number) {
  if (i >= 9) return { bg: "#c3ff3e", glow: "rgba(195,255,62,0.5)" };
  if (i >= 7) return { bg: "#a78bfa", glow: "rgba(167,139,250,0.45)" };
  if (i >= 5) return { bg: "#f59e0b", glow: "rgba(245,158,11,0.35)" };
  return { bg: "#2a2a38", glow: "rgba(0,0,0,0)" };
}
