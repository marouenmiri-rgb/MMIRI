import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { env, hasDb } from "@/lib/env";
import { PLANS, hasStripe, stripeRequest, type PlanTier } from "@/lib/billing";

export const runtime = "nodejs";

const Body = z.object({
  tier: z.enum(["STARTER", "STUDIO", "SCALE", "AGENCY"]),
});

type CheckoutSession = { id: string; url: string };

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const tier = parsed.data.tier as PlanTier;
  const plan = PLANS[tier];
  const priceEnv = plan.priceEnvKey;
  const priceId = priceEnv ? process.env[priceEnv] : undefined;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "No user" }, { status: 404 });

  // Demo path: Stripe isn't configured. Flip the Subscription row to the
  // requested tier directly, so the rest of the app behaves as if the
  // checkout flow completed. The pricing page shows a "demo billing"
  // badge so this is transparent.
  if (!hasStripe || !priceId) {
    const nextPeriodEnd = new Date();
    nextPeriodEnd.setUTCMonth(nextPeriodEnd.getUTCMonth() + 1);
    await db.subscription.upsert({
      where: { userId },
      update: {
        tier,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextPeriodEnd,
        revenueShareBps: plan.limits.revenueShareBps ?? null,
      },
      create: {
        userId,
        tier,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextPeriodEnd,
        revenueShareBps: plan.limits.revenueShareBps ?? null,
      },
    });
    return NextResponse.json({
      demo: true,
      url: `${env.NEXT_PUBLIC_APP_URL}/settings?upgraded=${tier}&demo=1`,
    });
  }

  const existing = await db.subscription.findUnique({ where: { userId } });
  const session = await stripeRequest<CheckoutSession>("/checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${env.NEXT_PUBLIC_APP_URL}/settings?upgraded=${tier}`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/pricing?canceled=1`,
    client_reference_id: userId,
    customer_email: user.email,
    ...(existing?.stripeCustomerId
      ? { customer: existing.stripeCustomerId }
      : {}),
    allow_promotion_codes: "true",
    "metadata[tier]": tier,
    "metadata[userId]": userId,
  });

  return NextResponse.json({ url: session.url, id: session.id });
}
