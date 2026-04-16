import Link from "next/link";
import { UsageGauge } from "./UsageGauge";
import type { PlanTier } from "@/lib/billing";

type Props = {
  tier: PlanTier;
  planLabel: string;
  planBlurb: string;
  status?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  usage: {
    adsUsed: number;
    postsUsed: number;
    revenueAttributedCents: number;
    periodEnd: string;
  };
  limits: { adsPerMonth: number; postsPerMonth: number };
  revenueShareBps?: number | null;
  stripeConfigured: boolean;
};

/**
 * The billing panel shown on Settings. Live gauges for ads + posts vs the
 * current plan's limits; a monthly attributed-revenue number below them.
 * For SCALE subscribers, computes this month's estimated invoice (5% of
 * attributed revenue) so there are no surprises.
 */
export function BillingPanel({
  tier,
  planLabel,
  planBlurb,
  status,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  usage,
  limits,
  revenueShareBps,
  stripeConfigured,
}: Props) {
  const isScale = tier === "SCALE";
  const estimatedInvoiceCents =
    isScale && revenueShareBps
      ? Math.round((usage.revenueAttributedCents * revenueShareBps) / 10_000)
      : null;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line-1 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
              Billing
            </div>
            <h3 className="mt-1 font-display text-xl tracking-tight">
              {planLabel} plan
              {cancelAtPeriodEnd && (
                <span className="ml-2 pill border border-warn/30 bg-warn/10 text-warn">
                  canceling
                </span>
              )}
            </h3>
            <p className="mt-1 max-w-lg text-sm text-ink-mid">{planBlurb}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/pricing" className="btn-ghost">
              {tier === "FREE" ? "See plans" : "Change plan"}
            </Link>
            {tier !== "FREE" && stripeConfigured && (
              <form action="/api/billing/portal" method="POST">
                <button type="submit" className="btn-ink">
                  Manage billing ↗
                </button>
              </form>
            )}
          </div>
        </div>

        {currentPeriodEnd && (
          <div className="mt-3 font-mono text-[11px] text-ink-dim">
            Period resets {new Date(currentPeriodEnd).toLocaleDateString()} ·
            status {status?.toLowerCase() ?? "active"}
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="grid grid-cols-1 gap-6 px-6 py-6 md:grid-cols-2">
        <UsageGauge
          label="Ads this period"
          used={usage.adsUsed}
          limit={limits.adsPerMonth}
        />
        <UsageGauge
          label="Posts published"
          used={usage.postsUsed}
          limit={limits.postsPerMonth}
          color="lime"
        />
      </div>

      {/* Revenue block */}
      <div className="border-t border-line-1 bg-base-2/40 px-6 py-5">
        <div className="flex items-baseline justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-dim">
              Attributed revenue this period
            </div>
            <div className="mt-1 font-display text-3xl tracking-tightest text-lime">
              {money(usage.revenueAttributedCents)}
            </div>
          </div>
          {isScale && (
            <div className="text-right">
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-dim">
                Estimated invoice · 5% of revenue
              </div>
              <div className="mt-1 font-display text-3xl tracking-tightest text-volt">
                {money(estimatedInvoiceCents ?? 0)}
              </div>
            </div>
          )}
        </div>
        {isScale && (
          <p className="mt-3 text-[12px] text-ink-mid">
            Billed in arrears from the attribution ledger. If your posts drove
            $0, your invoice is $0.
          </p>
        )}
      </div>
    </div>
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
