import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasClaude, hasDb } from "@/lib/env";
import { runAdPipeline } from "@/agents/orchestrator";
import { checkLimit } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  productUrl: z.string().url(),
  hookHint: z.string().min(2).max(280).optional(),
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

  const userId = await getCurrentUserId();
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

  const ad = await db.ad.create({
    data: {
      userId,
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
