import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasClaude, hasDb } from "@/lib/env";
import { checkLimit } from "@/lib/billing";
import { runCartoonPipeline } from "@/agents/cartoon-pipeline";
import { CARTOON_STYLES } from "@/cartoon/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  topic: z.string().trim().min(3).max(400),
  style: z.enum(CARTOON_STYLES).default("slapstick"),
  productUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
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
        detail: "Set ANTHROPIC_API_KEY in .env to write cartoons",
      },
      { status: 503 },
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  // Cartoons count as ads for plan quota.
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

  const { topic, style, productUrl } = parsed.data;
  const ad = await db.ad.create({
    data: {
      userId,
      format: "CARTOON",
      topic,
      // Empty when the cartoon isn't selling anything — posts then ship
      // without a tracking link.
      productUrl: productUrl ?? "",
      status: "QUEUED",
    },
  });

  runCartoonPipeline({ adId: ad.id, topic, style, productUrl, userId }).catch(
    async (err) => {
      await db.ad.update({
        where: { id: ad.id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
        },
      });
    },
  );

  return NextResponse.json({ id: ad.id, status: ad.status }, { status: 202 });
}
