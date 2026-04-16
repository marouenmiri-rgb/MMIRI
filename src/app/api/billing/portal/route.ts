import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { env, hasDb } from "@/lib/env";
import { hasStripe, stripeRequest } from "@/lib/billing";

export const runtime = "nodejs";

type PortalSession = { id: string; url: string };

export async function POST() {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const sub = await db.subscription.findUnique({ where: { userId } });
  if (!hasStripe || !sub?.stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          "Billing portal unavailable — Stripe isn't configured or you're on a demo subscription. Use /pricing to change tiers.",
      },
      { status: 400 },
    );
  }

  const session = await stripeRequest<PortalSession>(
    "/billing_portal/sessions",
    {
      customer: sub.stripeCustomerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/settings`,
    },
  );
  return NextResponse.json({ url: session.url });
}
