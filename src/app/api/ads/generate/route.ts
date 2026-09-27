import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateGuestUserId } from "@/lib/auth";
import { hasClaude, hasDb } from "@/lib/env";
import { runAdPipeline } from "@/agents/orchestrator";
import { checkLimit } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  productUrl: z.string().url(),
  hookHint: z.string().min(2).max(280).optional(),
  /** Attributes the ad — and everything it earns — to one client. */
  clientId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!hasDb || !hasClaude) {
    return NextResponse.json(
      {
        error: "Server not configured",
        detail: "Set DATABASE_URL and ANTHROPIC_API_KEY in .env",
      },
      { status: 503 },
    );
  }

  // The only endpoint that will mint an identity: a visitor spends their free
  // videos first and signs up afterwards, keeping what they already made.
  const userId = await getOrCreateGuestUserId(req.headers.get("user-agent"));
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  // 402 Payment Required when over plan quota — surface the upgrade path.
  const gate = await checkLimit(userId, "ad");
  if (!gate.ok) {
    return NextResponse.json(
      {
        error: "plan_limit_exceeded",
        message: gate.reason,
        tier: gate.tier,
        used: gate.used,
        limit: gate.limit,
        upgradeUrl: "/pricing",
      },
      { status: 402 },
    );
  }

  // Only accept a client the caller actually owns.
  let clientId: string | null = null;
  if (parsed.data.clientId) {
    const owned = await db.client.findFirst({
      where: { id: parsed.data.clientId, userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "Unknown client" }, { status: 400 });
    }
    clientId = owned.id;
  }

  const ad = await db.ad.create({
    data: {
      userId,
      clientId,
      productUrl: parsed.data.productUrl,
      status: "QUEUED",
    },
  });

  runAdPipeline({
    adId: ad.id,
    productUrl: parsed.data.productUrl,
    hookHint: parsed.data.hookHint,
    userId,
  }).catch(async (err) => {
    await db.ad.update({
      where: { id: ad.id },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      },
    });
  });

  return NextResponse.json({ id: ad.id, status: ad.status }, { status: 202 });
}
