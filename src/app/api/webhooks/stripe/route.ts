import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { PLANS, type PlanTier } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Stripe webhook. Keeps our Subscription rows in sync with Stripe.
 * Signature-verified when STRIPE_WEBHOOK_SECRET is set; accepts raw
 * payloads in dev-mode when it isn't.
 *
 * Handled events:
 *   checkout.session.completed            mint Subscription on first checkout
 *   customer.subscription.created/updated refresh period + status + tier
 *   customer.subscription.deleted         mark canceled, fall back to FREE
 */
export async function POST(req: Request) {
  const body = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (secret) {
    const sig = req.headers.get("stripe-signature");
    if (!sig || !verify(body, sig, secret)) {
      return NextResponse.json({ error: "bad signature" }, { status: 401 });
    }
  }
  if (!hasDb) return NextResponse.json({ ok: true });

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object as CheckoutObject);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await onSubscriptionChanged(event.data.object as SubscriptionObject);
        break;
      case "customer.subscription.deleted":
        await onSubscriptionDeleted(event.data.object as SubscriptionObject);
        break;
      default:
        // No-op for events we don't care about.
        break;
    }
  } catch (e) {
    console.error("[stripe webhook]", event.type, e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

type CheckoutObject = {
  id: string;
  client_reference_id?: string;
  customer?: string;
  subscription?: string;
  metadata?: { tier?: string; userId?: string };
};

type SubscriptionObject = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_start?: number;
  current_period_end?: number;
  items?: { data: { price: { id: string } }[] };
  metadata?: { tier?: string; userId?: string };
};

async function onCheckoutCompleted(obj: CheckoutObject) {
  const userId = obj.client_reference_id ?? obj.metadata?.userId;
  if (!userId) return;
  const tier = (obj.metadata?.tier as PlanTier) ?? "STARTER";
  await db.subscription.upsert({
    where: { userId },
    update: {
      tier,
      status: "ACTIVE",
      stripeCustomerId: obj.customer ?? null,
      stripeSubscriptionId: obj.subscription ?? null,
      revenueShareBps: PLANS[tier].limits.revenueShareBps ?? null,
    },
    create: {
      userId,
      tier,
      status: "ACTIVE",
      stripeCustomerId: obj.customer ?? null,
      stripeSubscriptionId: obj.subscription ?? null,
      revenueShareBps: PLANS[tier].limits.revenueShareBps ?? null,
    },
  });
}

async function onSubscriptionChanged(obj: SubscriptionObject) {
  const sub = await db.subscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: obj.id },
        { stripeCustomerId: obj.customer },
      ],
    },
  });
  if (!sub) return;

  const tierFromMeta = obj.metadata?.tier as PlanTier | undefined;
  const priceId = obj.items?.data?.[0]?.price?.id;
  const tierFromPrice = tierFromPriceId(priceId);
  const tier = tierFromMeta ?? tierFromPrice ?? sub.tier;

  await db.subscription.update({
    where: { id: sub.id },
    data: {
      tier: tier as PlanTier,
      status: mapStatus(obj.status),
      stripeSubscriptionId: obj.id,
      stripePriceId: priceId ?? null,
      cancelAtPeriodEnd: Boolean(obj.cancel_at_period_end),
      currentPeriodStart: obj.current_period_start
        ? new Date(obj.current_period_start * 1000)
        : null,
      currentPeriodEnd: obj.current_period_end
        ? new Date(obj.current_period_end * 1000)
        : null,
      revenueShareBps:
        PLANS[tier as PlanTier]?.limits.revenueShareBps ?? null,
    },
  });
}

async function onSubscriptionDeleted(obj: SubscriptionObject) {
  const sub = await db.subscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: obj.id },
        { stripeCustomerId: obj.customer },
      ],
    },
  });
  if (!sub) return;
  await db.subscription.update({
    where: { id: sub.id },
    data: {
      tier: "FREE",
      status: "CANCELED",
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
      stripePriceId: null,
    },
  });
}

function mapStatus(s: string) {
  switch (s) {
    case "trialing":
      return "TRIALING" as const;
    case "active":
      return "ACTIVE" as const;
    case "past_due":
    case "unpaid":
      return "PAST_DUE" as const;
    case "canceled":
    case "incomplete_expired":
      return "CANCELED" as const;
    case "paused":
      return "PAUSED" as const;
    default:
      return "ACTIVE" as const;
  }
}

function tierFromPriceId(priceId?: string): PlanTier | null {
  if (!priceId) return null;
  const env = process.env;
  if (priceId === env.STRIPE_PRICE_STARTER) return "STARTER";
  if (priceId === env.STRIPE_PRICE_STUDIO) return "STUDIO";
  if (priceId === env.STRIPE_PRICE_SCALE) return "SCALE";
  if (priceId === env.STRIPE_PRICE_AGENCY) return "AGENCY";
  return null;
}

/**
 * Stripe's webhook signature scheme: `t=<timestamp>,v1=<hmac>`.
 * Verifies that hmac_sha256("${timestamp}.${body}", secret) matches v1.
 */
function verify(body: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    }),
  ) as { t?: string; v1?: string };
  if (!parts.t || !parts.v1) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${body}`, "utf8")
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(parts.v1),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}
