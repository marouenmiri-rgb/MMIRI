import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";
import { PLANS, computeUsage, currentTier } from "@/lib/billing";

export const runtime = "nodejs";

export async function GET() {
  if (!hasDb) {
    return NextResponse.json({
      tier: "FREE",
      plan: PLANS.FREE,
      usage: null,
      subscription: null,
    });
  }
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ tier: "FREE", plan: PLANS.FREE });

  const [sub, usage] = await Promise.all([
    db.subscription.findUnique({ where: { userId } }),
    computeUsage(userId),
  ]);
  const tier = currentTier(sub);
  return NextResponse.json({
    tier,
    plan: PLANS[tier],
    usage: {
      ...usage,
      periodStart: usage.periodStart.toISOString(),
      periodEnd: usage.periodEnd.toISOString(),
    },
    subscription: sub
      ? {
          status: sub.status,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
        }
      : null,
  });
}
