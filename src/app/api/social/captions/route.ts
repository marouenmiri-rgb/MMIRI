import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasClaude, hasDb } from "@/lib/env";
import { writeCaptions } from "@/agents/captioner";
import type { AdScript } from "@/agents/types";
import { unpackJson } from "@/lib/json";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ adId: z.string() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!hasDb || !hasClaude) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 503 },
    );
  }
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const ad = await db.ad.findFirst({
    where: { id: parsed.data.adId, userId },
  });
  const script = ad ? unpackJson<AdScript | null>(ad.scriptJson, null) : null;
  if (!ad || !script) {
    return NextResponse.json(
      { error: "Ad or its script not found" },
      { status: 404 },
    );
  }

  const captions = await writeCaptions({
    product: { title: ad.productTitle ?? "the product", url: ad.productUrl },
    script,
  });
  return NextResponse.json({ captions });
}
