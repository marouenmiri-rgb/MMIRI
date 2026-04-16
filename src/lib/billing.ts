import { db } from "./db";
import { env } from "./env";

export type PlanTier = "FREE" | "STARTER" | "STUDIO" | "SCALE" | "AGENCY";

export type PlanLimits = {
  adsPerMonth: number; // Infinity for unlimited
  postsPerMonth: number;
  workspaces: number;
  teamSeats: number;
  revenueShareBps?: number; // if set, user pays this % of attributed revenue
};

/**
 * Plan matrix. This is the single source of truth — the pricing page, the
 * enforcement middleware, and the Stripe prices all reference this map.
 */
export const PLANS: Record<PlanTier, {
  tier: PlanTier;
  label: string;
  priceUsd: number | "revenue_share";
  cadence: "mo" | "yr" | "revenue";
  blurb: string;
  tagline: string;
  priceEnvKey?: string; // env var name holding the Stripe price id
  limits: PlanLimits;
  highlights: string[];
  color: "volt" | "lime" | "ink";
}> = {
  FREE: {
    tier: "FREE",
    label: "Free",
    priceUsd: 0,
    cadence: "mo",
    blurb: "Kick the tires. Ship 3 ads, publish up to 10 posts.",
    tagline: "Start here",
    limits: { adsPerMonth: 3, postsPerMonth: 10, workspaces: 1, teamSeats: 1 },
    highlights: [
      "3 ads / month",
      "10 published posts / month",
      "Demo-mode socials",
      "Community support",
    ],
    color: "ink",
  },
  STARTER: {
    tier: "STARTER",
    label: "Starter",
    priceUsd: 49,
    cadence: "mo",
    blurb: "Solo sellers. One brand, one lab, real TikTok / IG connections.",
    tagline: "For founders",
    priceEnvKey: "STRIPE_PRICE_STARTER",
    limits: { adsPerMonth: 20, postsPerMonth: 100, workspaces: 1, teamSeats: 1 },
    highlights: [
      "20 ads / month",
      "100 published posts / month",
      "Real OAuth · all 4 platforms",
      "Variant Lab + weekly Insights",
      "Shopify order attribution",
    ],
    color: "volt",
  },
  STUDIO: {
    tier: "STUDIO",
    label: "Studio",
    priceUsd: 199,
    cadence: "mo",
    blurb: "Creative teams. 3 brands, 500 posts/mo, everything unlocked.",
    tagline: "Most popular",
    priceEnvKey: "STRIPE_PRICE_STUDIO",
    limits: { adsPerMonth: 100, postsPerMonth: 500, workspaces: 3, teamSeats: 5 },
    highlights: [
      "100 ads / month",
      "500 published posts / month",
      "3 workspaces · 5 seats",
      "Custom brand voice per workspace",
      "Priority queue · <60s renders",
    ],
    color: "volt",
  },
  SCALE: {
    tier: "SCALE",
    label: "Scale",
    priceUsd: "revenue_share",
    cadence: "revenue",
    blurb:
      "You only pay when you make money. 5% of AdGen-attributed revenue.",
    tagline: "Aligned incentives",
    priceEnvKey: "STRIPE_PRICE_SCALE",
    limits: {
      adsPerMonth: Infinity,
      postsPerMonth: Infinity,
      workspaces: 10,
      teamSeats: 25,
      revenueShareBps: 500,
    },
    highlights: [
      "Unlimited ads & posts",
      "10 workspaces · 25 seats",
      "5% of attributed revenue · no floor",
      "Dedicated Strategist insights weekly",
      "White-label client PDFs",
    ],
    color: "lime",
  },
  AGENCY: {
    tier: "AGENCY",
    label: "Agency",
    priceUsd: 999,
    cadence: "mo",
    blurb: "Agencies. Unlimited workspaces, white-label, API access.",
    tagline: "For ops teams",
    priceEnvKey: "STRIPE_PRICE_AGENCY",
    limits: {
      adsPerMonth: Infinity,
      postsPerMonth: Infinity,
      workspaces: Infinity,
      teamSeats: Infinity,
    },
    highlights: [
      "Unlimited everything",
      "White-label reports (your logo)",
      "SSO · SCIM · audit log",
      "Dedicated Slack channel",
    ],
    color: "volt",
  },
};

export type UsageSnapshot = {
  periodStart: Date;
  periodEnd: Date;
  adsUsed: number;
  postsUsed: number;
  revenueAttributedCents: number;
};

/**
 * Compute usage for the user's current billing period. Free-plan users get a
 * calendar month; paid users get their subscription period.
 */
export async function computeUsage(userId: string): Promise<UsageSnapshot> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  const now = new Date();
  const periodStart =
    sub?.currentPeriodStart ??
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd =
    sub?.currentPeriodEnd ??
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [adsUsed, postsUsed, conversions] = await Promise.all([
    db.ad.count({
      where: { userId, createdAt: { gte: periodStart, lt: periodEnd } },
    }),
    db.socialPost.count({
      where: {
        userId,
        status: "PUBLISHED",
        publishedAt: { gte: periodStart, lt: periodEnd },
      },
    }),
    db.conversion.aggregate({
      where: { userId, occurredAt: { gte: periodStart, lt: periodEnd } },
      _sum: { revenueCents: true },
    }),
  ]);

  return {
    periodStart,
    periodEnd,
    adsUsed,
    postsUsed,
    revenueAttributedCents: conversions._sum.revenueCents ?? 0,
  };
}

export function currentTier(sub?: { tier: PlanTier | string } | null): PlanTier {
  const t = (sub?.tier as PlanTier) ?? "FREE";
  return (PLANS[t] ? t : "FREE") as PlanTier;
}

export function limitsFor(tier: PlanTier): PlanLimits {
  return PLANS[tier].limits;
}

/**
 * Returns { ok: true } if the user can perform `action` this period, else
 * { ok: false, reason, tier, used, limit } so the API can return 402/403.
 */
export async function checkLimit(
  userId: string,
  action: "ad" | "post",
): Promise<
  | { ok: true }
  | { ok: false; reason: string; tier: PlanTier; used: number; limit: number }
> {
  const sub = await db.subscription.findUnique({ where: { userId } });
  const tier = currentTier(sub);
  const limits = limitsFor(tier);
  const usage = await computeUsage(userId);
  const [used, limit] =
    action === "ad"
      ? [usage.adsUsed, limits.adsPerMonth]
      : [usage.postsUsed, limits.postsPerMonth];
  if (!isFinite(limit)) return { ok: true };
  if (used < limit) return { ok: true };
  return {
    ok: false,
    reason:
      `You've used ${used}/${limit} ${action === "ad" ? "ads" : "posts"} this period on the ${PLANS[tier].label} plan.`,
    tier,
    used,
    limit,
  };
}

export const hasStripe = Boolean(
  process.env.STRIPE_SECRET_KEY && env.NEXT_PUBLIC_APP_URL,
);

/**
 * Thin Stripe client using fetch — no SDK dependency. We only need three
 * endpoints: checkout sessions, billing portal sessions, and webhook
 * signature verification (handled in the webhook route).
 */
export async function stripeRequest<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY not set");
  }
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) body.set(k, v);
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Stripe ${path}: ${res.status} ${text.slice(0, 240)}`);
  }
  return (await res.json()) as T;
}
