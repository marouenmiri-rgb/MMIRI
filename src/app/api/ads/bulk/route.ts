import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasClaude, hasDb } from "@/lib/env";
import { getCurrentUserId } from "@/lib/auth";
import { runAdPipeline } from "@/agents/orchestrator";
import { checkLimit } from "@/lib/billing";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_URLS = 50;

const Body = z.object({
  /** Raw textarea contents — one URL per line, or separated by commas. */
  urls: z.string().min(4).max(20_000),
  clientId: z.string().min(1).optional(),
  hookHint: z.string().min(2).max(280).optional(),
});

/**
 * Queue a whole catalogue in one go.
 *
 * Runs are started sequentially rather than all at once: a store pasting
 * fifty URLs would otherwise open fifty concurrent Claude and render jobs and
 * fall over. Each ad row is created up front so the dashboard can show the
 * queue immediately, and the pipeline walks the list in the background.
 */
export async function POST(req: Request) {
  if (!hasDb || !hasClaude) {
    return NextResponse.json(
      {
        error: "Server not configured",
        detail: "Set DATABASE_URL and ANTHROPIC_API_KEY in .env",
      },
      { status: 503 },
    );
  }

  const gate = rateLimit(`bulk:${clientIp(req)}`, 4, 15 * 60);
  if (!gate.ok) {
    return tooManyRequests(gate, "Too many bulk queues. Try again shortly.");
  }

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { valid, invalid } = parseUrls(parsed.data.urls);
  if (valid.length === 0) {
    return NextResponse.json(
      { error: "No usable product URLs found.", invalid },
      { status: 400 },
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

  // Quota is checked per URL, so a paste of 50 on a 15-video plan queues the
  // 15 it is entitled to and reports the rest rather than failing outright.
  const accepted: string[] = [];
  const skipped: { url: string; reason: string }[] = [];

  for (const url of valid) {
    const gate = await checkLimit(userId, "ad");
    if (!gate.ok) {
      skipped.push({ url, reason: gate.reason ?? "Plan limit reached" });
      continue;
    }
    const ad = await db.ad.create({
      data: { userId, clientId, productUrl: url, status: "QUEUED" },
    });
    accepted.push(ad.id);
  }

  if (accepted.length > 0) {
    void runQueue(accepted, valid, userId, parsed.data.hookHint);
  }

  return NextResponse.json(
    {
      queued: accepted.length,
      ids: accepted,
      skipped,
      invalid,
    },
    { status: 202 },
  );
}

/** Walks the queue one at a time so a big paste can't swamp the box. */
async function runQueue(
  adIds: string[],
  urls: string[],
  userId: string,
  hookHint?: string,
) {
  for (let i = 0; i < adIds.length; i++) {
    try {
      await runAdPipeline({
        adId: adIds[i]!,
        productUrl: urls[i]!,
        hookHint,
        userId,
      });
    } catch (err) {
      // One bad product page must not stop the rest of the catalogue.
      await db.ad
        .update({
          where: { id: adIds[i]! },
          data: {
            status: "FAILED",
            error: err instanceof Error ? err.message : String(err),
          },
        })
        .catch(() => undefined);
    }
  }
}

/** Splits on newlines and commas, repairs missing schemes, de-duplicates. */
function parseUrls(raw: string) {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const piece of raw.split(/[\n,]+/)) {
    const text = piece.trim();
    if (!text) continue;

    const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    try {
      const url = new URL(candidate);
      if (!url.hostname.includes(".")) throw new Error("no tld");
      const normalized = url.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      if (valid.length < MAX_URLS) valid.push(normalized);
    } catch {
      invalid.push(text.slice(0, 120));
    }
  }
  return { valid, invalid };
}
