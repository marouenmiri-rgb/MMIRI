"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Logo } from "./Logo";

type Tier = "FREE" | "STARTER" | "STUDIO" | "SCALE" | "AGENCY";

type Plan = {
  tier: Tier;
  label: string;
  blurb: string;
  tagline: string;
  cadence: "mo" | "yr" | "revenue";
  priceUsd: number | "revenue_share";
  highlights: string[];
  limits: {
    adsPerMonth: number;
    postsPerMonth: number;
    revenueShareBps?: number;
  };
  color: "volt" | "lime" | "ink";
};

type Props = {
  plans: Plan[];
  hasStripe: boolean;
};

const HEADLINE = [
  { tier: "STARTER" as Tier, headline: "For solo founders" },
  { tier: "STUDIO" as Tier, headline: "For creative teams" },
  { tier: "SCALE" as Tier, headline: "Aligned incentives" },
];

/**
 * The defining pricing interaction. A single slider sets "expected monthly
 * revenue" and every plan card recomputes in real time:
 *  - Starter / Studio / Agency show flat price and implied take rate at that
 *    revenue.
 *  - Scale shows 5% of revenue — the only plan that scales with outcomes.
 * The card with the lowest total cost glows, so the user instantly sees
 * which tier is right for their scale.
 */
export function PricingComparator({ plans, hasStripe }: Props) {
  const [revenueUsd, setRevenueUsd] = useState(5000);
  const [busyTier, setBusyTier] = useState<Tier | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const shown = plans.filter(
    (p) => p.tier === "STARTER" || p.tier === "STUDIO" || p.tier === "SCALE",
  );

  const costsUsd = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of shown) {
      m[p.tier] =
        p.priceUsd === "revenue_share"
          ? revenueUsd * ((p.limits.revenueShareBps ?? 0) / 10_000)
          : (p.priceUsd as number);
    }
    return m;
  }, [shown, revenueUsd]);

  const cheapestTier = (Object.entries(costsUsd).sort(
    (a, b) => a[1] - b[1],
  )[0]?.[0] ?? "STARTER") as Tier;

  async function upgrade(tier: Tier) {
    setBusyTier(tier);
    setErr(null);
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      window.location.href = body.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyTier(null);
    }
  }

  return (
    <section className="relative">
      {/* Revenue slider hero */}
      <div className="relative overflow-hidden rounded-xl2 border border-line-2 bg-base-1 p-8">
        <div className="grid-bg absolute inset-0 opacity-40 animate-gridShift" />
        <div className="spot absolute inset-0 opacity-60" />
        <div className="relative">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            Cost calculator
          </div>
          <h2 className="mt-2 max-w-2xl font-display text-4xl leading-[1.05] tracking-tightest text-ink-hi md:text-5xl">
            Pay nothing until you make money.
          </h2>
          <p className="mt-4 max-w-xl text-ink-mid">
            Drag the slider. See what each plan costs at your expected monthly
            AdGen-attributed revenue.
          </p>

          {/* Slider */}
          <div className="mt-8">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-dim">
                  Expected monthly revenue
                </div>
                <div className="mt-1 font-display text-5xl tracking-tightest text-lime">
                  {currency(revenueUsd)}
                </div>
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-dim">
                Drag ▸
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100000}
              step={500}
              value={revenueUsd}
              onChange={(e) => setRevenueUsd(Number(e.target.value))}
              className="mt-4 w-full accent-volt"
              style={{
                background: `linear-gradient(90deg, #a78bfa 0%, #c3ff3e ${(revenueUsd / 100000) * 100}%, #222230 ${(revenueUsd / 100000) * 100}%)`,
                height: 4,
                borderRadius: 999,
                WebkitAppearance: "none",
              }}
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
              <span>$0</span>
              <span>$25k</span>
              <span>$50k</span>
              <span>$75k</span>
              <span>$100k</span>
            </div>
          </div>
        </div>
      </div>

      {err && <p className="mt-4 text-sm text-danger">{err}</p>}

      {/* Plan cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {shown.map((p) => {
          const cost = costsUsd[p.tier];
          const takeRatePct = revenueUsd > 0 ? (cost / revenueUsd) * 100 : 0;
          const isBest = p.tier === cheapestTier && revenueUsd > 0;
          const headline =
            HEADLINE.find((h) => h.tier === p.tier)?.headline ?? p.tagline;

          return (
            <article
              key={p.tier}
              className={clsx(
                "relative flex flex-col overflow-hidden rounded-xl2 border p-6 transition",
                isBest
                  ? "border-lime/60 bg-base-1 shadow-glow-lime"
                  : "border-line-2 bg-base-1",
              )}
            >
              {isBest && (
                <div className="absolute right-4 top-4">
                  <span className="chip-live">
                    <span className="dot-live" /> best fit
                  </span>
                </div>
              )}

              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                {headline}
              </div>
              <h3 className="mt-1 font-display text-2xl tracking-tight text-ink-hi">
                {p.label}
              </h3>

              <div className="mt-4">
                {p.priceUsd === "revenue_share" ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-4xl tracking-tightest text-lime">
                        5%
                      </span>
                      <span className="text-sm text-ink-mid">
                        of attributed revenue
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-ink-dim">
                      At {currency(revenueUsd)}/mo →{" "}
                      <span className="text-lime">{currency(cost)}/mo</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-4xl tracking-tightest text-ink-hi">
                        ${p.priceUsd}
                      </span>
                      <span className="text-sm text-ink-mid">/ month</span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-ink-dim">
                      At {currency(revenueUsd)}/mo →{" "}
                      <span className="text-ink-hi">
                        {takeRatePct.toFixed(2)}% take rate
                      </span>
                    </div>
                  </>
                )}
              </div>

              <p className="mt-4 text-sm leading-relaxed text-ink-mid">
                {p.blurb}
              </p>

              <ul className="mt-5 space-y-1.5 text-sm text-ink-mid">
                {p.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <span
                      className={clsx(
                        "mt-1 inline-block h-1.5 w-1.5 rounded-full shrink-0",
                        p.color === "lime"
                          ? "bg-lime"
                          : p.color === "volt"
                            ? "bg-volt"
                            : "bg-ink-mid",
                      )}
                    />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => upgrade(p.tier)}
                disabled={busyTier === p.tier}
                className={clsx(
                  "mt-6 w-full",
                  p.color === "lime" ? "btn-lime" : "btn-primary",
                )}
              >
                {busyTier === p.tier
                  ? "Redirecting…"
                  : hasStripe
                    ? `Upgrade to ${p.label}`
                    : `Try ${p.label} in demo mode`}
              </button>

              {!hasStripe && (
                <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                  demo billing · no card
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Agency footer */}
      {plans.find((p) => p.tier === "AGENCY") && (
        <div className="mt-8 flex items-center justify-between rounded-xl2 border border-line-2 bg-base-2 p-6">
          <div className="flex items-center gap-4">
            <Logo />
            <div>
              <div className="font-display text-lg tracking-tight text-ink-hi">
                Running AdGen for 20+ clients?
              </div>
              <div className="text-sm text-ink-mid">
                Agency plan — $999/mo, unlimited workspaces, white-label client
                reports, API access, SSO.
              </div>
            </div>
          </div>
          <button
            onClick={() => upgrade("AGENCY")}
            disabled={busyTier === "AGENCY"}
            className="btn-ghost"
          >
            Talk to us →
          </button>
        </div>
      )}
    </section>
  );
}

function currency(n: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${n}`;
  }
}
