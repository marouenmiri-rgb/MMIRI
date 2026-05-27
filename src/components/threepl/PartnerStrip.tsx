/**
 * Horizontal roster of affiliate 3PL partners. Each card shows commission %,
 * vertical specialty, volume range, and how many current leads matched.
 */
export type PartnerStripItem = {
  id: string;
  name: string;
  vertical: string | null;
  geo: string | null;
  commissionBps: number;
  minOrdersPerMonth: number | null;
  maxOrdersPerMonth: number | null;
  matchedLeadCount: number;
  topVerticalFitsHint?: string;
};

export function PartnerStrip({ items }: { items: PartnerStripItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl2 border border-line-1 bg-base-1 p-5">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-volt">
          Affiliate roster
        </div>
        <a
          href="/threepl/partners"
          className="font-mono text-[10px] uppercase tracking-wider text-ink-mid hover:text-ink-hi"
        >
          Manage →
        </a>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((p) => {
          const pct = (p.commissionBps / 100).toFixed(p.commissionBps % 100 ? 1 : 0);
          const min = p.minOrdersPerMonth ?? 0;
          const max = p.maxOrdersPerMonth ?? null;
          const range = max ? `${min}-${max.toLocaleString()}` : `${min}+`;
          return (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-xl2 border border-line-1 bg-base-2 p-4 transition hover:-translate-y-0.5 hover:border-volt/40 hover:shadow-glow"
            >
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 transition group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(circle, rgba(167,139,250,0.18), transparent 70%)",
                }}
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[15px] tracking-tight text-ink-hi">
                    {p.name}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                    {p.vertical ?? "general"} · {p.geo ?? "—"} · {range}/mo
                  </div>
                </div>
                <div className="rounded-lg border border-lime/30 bg-lime/10 px-2 py-1 font-mono text-[11px] tracking-tight text-lime">
                  {pct}%
                </div>
              </div>
              <div className="relative mt-4 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                  Matched
                </div>
                <div className="font-display text-[20px] tracking-tightest text-ink-hi">
                  {p.matchedLeadCount}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
