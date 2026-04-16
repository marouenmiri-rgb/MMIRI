import { TopBar } from "@/components/TopBar";
import { BillingPanel } from "@/components/BillingPanel";
import { hasClaude, hasDb } from "@/lib/env";
import { PLANS, computeUsage, currentTier, hasStripe } from "@/lib/billing";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db";

type Check = { label: string; ok: boolean; hint: string; critical?: boolean };

async function loadBilling() {
  if (!hasDb) {
    return {
      tier: "FREE" as const,
      sub: null,
      usage: {
        adsUsed: 0,
        postsUsed: 0,
        revenueAttributedCents: 0,
        periodEnd: new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth() + 1,
            1,
          ),
        ).toISOString(),
      },
    };
  }
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      tier: "FREE" as const,
      sub: null,
      usage: {
        adsUsed: 0,
        postsUsed: 0,
        revenueAttributedCents: 0,
        periodEnd: new Date().toISOString(),
      },
    };
  }
  const [sub, usage] = await Promise.all([
    db.subscription.findUnique({ where: { userId } }),
    computeUsage(userId),
  ]);
  return {
    tier: currentTier(sub),
    sub,
    usage: {
      adsUsed: usage.adsUsed,
      postsUsed: usage.postsUsed,
      revenueAttributedCents: usage.revenueAttributedCents,
      periodEnd: usage.periodEnd.toISOString(),
    },
  };
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { upgraded?: string; demo?: string };
}) {
  const checks: Check[] = [
    {
      label: "Database",
      ok: hasDb,
      hint: "Postgres via Prisma · DATABASE_URL",
      critical: true,
    },
    {
      label: "Claude Opus 4.7",
      ok: hasClaude,
      hint: "Reasoning for all 6 agents · ANTHROPIC_API_KEY",
      critical: true,
    },
    {
      label: "Voiceover engine",
      ok: Boolean(process.env.ELEVENLABS_API_KEY),
      hint: "ElevenLabs TTS · optional (silent video without)",
    },
    {
      label: "Outreach courier",
      ok: Boolean(process.env.RESEND_API_KEY),
      hint: "Resend delivery · optional (drafts only without)",
    },
    {
      label: "Video renderer",
      ok: true,
      hint: "FFmpeg slideshow · detected at runtime",
    },
    {
      label: "Stripe billing",
      ok: hasStripe,
      hint: hasStripe
        ? "Real checkout · subscriptions live"
        : "Demo mode · STRIPE_SECRET_KEY not set",
    },
  ];
  const ready = checks.filter((c) => c.ok).length;
  const required = checks.filter((c) => c.critical).length;
  const criticalReady = checks.filter((c) => c.critical && c.ok).length;

  const billing = await loadBilling();
  const plan = PLANS[billing.tier];

  return (
    <>
      <TopBar
        eyebrow="Workspace"
        title="Settings"
        subtitle="Keys, integrations, plan."
        action={
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mid">
            {ready}/{checks.length} wired · {criticalReady}/{required} required
          </div>
        }
      />

      <div className="space-y-6 p-8">
        {searchParams.upgraded && (
          <div className="card border-lime/40 bg-lime/5 p-4 text-sm text-lime">
            Upgraded to{" "}
            <span className="font-semibold">
              {PLANS[searchParams.upgraded as keyof typeof PLANS]?.label ??
                searchParams.upgraded}
            </span>
            {searchParams.demo ? " (demo mode · no card charged)" : ""} · welcome.
          </div>
        )}

        {/* Billing */}
        <BillingPanel
          tier={billing.tier}
          planLabel={plan.label}
          planBlurb={plan.blurb}
          status={billing.sub?.status}
          cancelAtPeriodEnd={billing.sub?.cancelAtPeriodEnd ?? false}
          currentPeriodEnd={
            billing.sub?.currentPeriodEnd?.toISOString() ?? billing.usage.periodEnd
          }
          usage={billing.usage}
          limits={plan.limits}
          revenueShareBps={billing.sub?.revenueShareBps ?? plan.limits.revenueShareBps}
          stripeConfigured={hasStripe}
        />

        {/* Workspace identity */}
        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Workspace" value="AdGen Demo" />
          <Field label="Plan" value={plan.label} />
        </section>

        {/* System health */}
        <section className="card overflow-hidden">
          <header className="flex items-center justify-between border-b border-line-1 px-5 py-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                System status
              </div>
              <h3 className="mt-1 font-display text-xl tracking-tight">
                Integrations
              </h3>
            </div>
            <span
              className={
                criticalReady === required
                  ? "chip-live"
                  : "pill border border-warn/30 bg-warn/10 text-warn"
              }
            >
              <span
                className={
                  criticalReady === required
                    ? "dot-live"
                    : "inline-block h-1.5 w-1.5 rounded-full bg-warn"
                }
              />
              {criticalReady === required ? "All systems go" : "Action required"}
            </span>
          </header>

          <ul>
            {checks.map((c) => (
              <li
                key={c.label}
                className="flex items-center justify-between gap-4 border-t border-line-1 px-5 py-4 first:border-t-0"
              >
                <div className="flex items-center gap-3">
                  <HealthDot ok={c.ok} />
                  <div>
                    <div className="text-sm font-medium text-ink-hi">
                      {c.label}
                    </div>
                    <div className="font-mono text-[11px] text-ink-mid">{c.hint}</div>
                  </div>
                </div>
                <span
                  className={
                    c.ok
                      ? "chip-live"
                      : "pill border border-line-2 bg-base-3 text-ink-mid"
                  }
                >
                  {c.ok ? (
                    <span className="dot-live" />
                  ) : (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink-lo" />
                  )}
                  {c.ok ? "connected" : "missing"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function HealthDot({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <span className="relative inline-flex h-2.5 w-2.5">
        <span className="absolute inset-0 rounded-full bg-lime animate-pulseRing" />
        <span className="relative inline-block h-2.5 w-2.5 rounded-full bg-lime" />
      </span>
    );
  }
  return (
    <span className="inline-block h-2.5 w-2.5 rounded-full border border-line-3 bg-base-3" />
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
        {label}
      </div>
      <div className="mt-2 font-display text-xl tracking-tight text-ink-hi">
        {value}
      </div>
    </div>
  );
}
