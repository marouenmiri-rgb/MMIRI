import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasClaude, hasDb } from "@/lib/env";
import { runAdPipeline } from "@/agents/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  productUrl: z.string().url(),
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

  const ad = await db.ad.create({
    data: {
      userId,
      productUrl: parsed.data.productUrl,
      status: "QUEUED",
    },
  });

  runAdPipeline({ adId: ad.id, productUrl: parsed.data.productUrl }).catch(
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
