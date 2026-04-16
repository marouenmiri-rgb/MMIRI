"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

type VariantRow = {
  id: string;
  label: string;
  angle: string | null;
  scriptJson: { hook?: string; fullScript?: string } | null;
  winner: boolean;
  retired: boolean;
  postsShipped: number;
  clicks: number;
  conversions: number;
  revenueCents: number;
  cvr: number;
};

export function VariantLab({ adId }: { adId: string }) {
  const [variants, setVariants] = useState<VariantRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const r = await fetch(`/api/ads/${adId}/variants`);
    if (!r.ok) return;
    const b = await r.json();
    setVariants(b.variants ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adId]);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/ads/${adId}/variants`, { method: "POST" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, data: { winner?: boolean; retired?: boolean }) {
    await fetch(`/api/variants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await load();
  }

  const maxRevenue = Math.max(1, ...(variants ?? []).map((v) => v.revenueCents));

  return (
    <section className="card relative overflow-hidden p-6">
      <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-lime/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
              Variant lab
            </div>
            <h3 className="mt-1 font-display text-xl tracking-tight">
              Test hooks. Keep what wins. Retire what doesn't.
            </h3>
          </div>
          <button
            onClick={generate}
            disabled={busy}
            className="btn-lime h-9 px-3 text-[12px]"
          >
            {busy ? "Drafting…" : "Generate 3 variants"}
          </button>
        </div>
        {err && <p className="mt-3 text-sm text-danger">{err}</p>}

        {!variants || variants.length === 0 ? (
          <div className="mt-5 rounded-xl2 border border-dashed border-line-2 bg-base-2/50 p-6 text-center text-sm text-ink-mid">
            No variants yet. Claude will spin up three hooks from different
            psychological angles — pattern interrupt, social proof, curiosity
            gap. Ship them, track revenue, promote the winner.
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {variants.map((v) => {
              const pct =
                maxRevenue > 0 ? (v.revenueCents / maxRevenue) * 100 : 0;
              return (
                <li
                  key={v.id}
                  className={clsx(
                    "relative overflow-hidden rounded-xl2 border p-4 transition",
                    v.winner
                      ? "border-lime/60 bg-lime/5 shadow-glow-lime"
                      : v.retired
                        ? "border-line-1 bg-base-2 opacity-60"
                        : "border-line-2 bg-base-2",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={clsx(
                            "pill",
                            v.winner
                              ? "bg-lime/15 text-lime border border-lime/40"
                              : "bg-base-3 text-ink-mid border border-line-2",
                          )}
                        >
                          {v.winner ? "🏆 winner" : v.label}
                        </span>
                        {v.angle && (
                          <span className="font-mono text-[11px] text-ink-dim">
                            {v.angle}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-ink-hi">
                        “{v.scriptJson?.hook ?? "—"}”
                      </div>
                      {v.scriptJson?.fullScript && (
                        <details className="mt-1 text-[12px] text-ink-mid">
                          <summary className="cursor-pointer text-ink-dim hover:text-ink-mid">
                            full script
                          </summary>
                          <p className="mt-2 italic leading-relaxed">
                            {v.scriptJson.fullScript}
                          </p>
                        </details>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-display text-xl tracking-tight text-lime">
                        {money(v.revenueCents)}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                        {v.conversions}/{v.clicks} · CVR {(v.cvr * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Revenue bar */}
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-base-3">
                    <div
                      className="h-full bg-lime transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-ink-dim">
                      {v.postsShipped} post{v.postsShipped === 1 ? "" : "s"}
                    </span>
                    <div className="flex items-center gap-2">
                      {!v.winner && !v.retired && (
                        <button
                          onClick={() => patch(v.id, { winner: true })}
                          className="btn-ink h-7 px-2 text-[11px]"
                        >
                          Promote to winner
                        </button>
                      )}
                      {v.winner && (
                        <button
                          onClick={() => patch(v.id, { winner: false })}
                          className="btn-ink h-7 px-2 text-[11px]"
                        >
                          Unpromote
                        </button>
                      )}
                      {!v.retired ? (
                        <button
                          onClick={() => patch(v.id, { retired: true })}
                          className="btn-ink h-7 px-2 text-[11px]"
                        >
                          Retire
                        </button>
                      ) : (
                        <button
                          onClick={() => patch(v.id, { retired: false })}
                          className="btn-ink h-7 px-2 text-[11px]"
                        >
                          Revive
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function money(cents: number): string {
  const v = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: v >= 100 ? 0 : 2,
    }).format(v);
  } catch {
    return `$${v.toFixed(2)}`;
  }
}
