import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasClaude, hasDb } from "@/lib/env";
import { generateHookVariants } from "@/agents/variants";
import type { AdScript } from "@/agents/types";
import { packJson, unpackJson } from "@/lib/json";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * GET  /api/ads/:id/variants   list variants + per-variant metrics
 * POST /api/ads/:id/variants   generate 3 new hook variants via Claude
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (!hasDb) return NextResponse.json({ variants: [] });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ variants: [] });

  const variants = await db.adVariant.findMany({
    where: { adId: params.id, ad: { userId } },
    orderBy: { createdAt: "asc" },
    include: {
      socialPosts: {
        select: {
          trackingLink: {
            select: { clicks: true, conversions: true, revenueCents: true },
          },
        },
      },
    },
  });

  const enriched = variants.map((v) => {
    const clicks = v.socialPosts.reduce(
      (s, p) => s + (p.trackingLink?.clicks ?? 0),
      0,
    );
    const conversions = v.socialPosts.reduce(
      (s, p) => s + (p.trackingLink?.conversions ?? 0),
      0,
    );
    const revenueCents = v.socialPosts.reduce(
      (s, p) => s + (p.trackingLink?.revenueCents ?? 0),
      0,
    );
    return {
      id: v.id,
      label: v.label,
      angle: v.angle,
      scriptJson: unpackJson<Record<string, unknown>>(v.scriptJson, {}),
      winner: v.winner,
      retired: v.retired,
      createdAt: v.createdAt,
      postsShipped: v.socialPosts.length,
      clicks,
      conversions,
      revenueCents,
      cvr: clicks > 0 ? conversions / clicks : 0,
    };
  });
  return NextResponse.json({ variants: enriched });
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (!hasDb || !hasClaude) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const ad = await db.ad.findFirst({
    where: { id: params.id, userId },
  });
  const script = ad ? unpackJson<AdScript | null>(ad.scriptJson, null) : null;
  if (!ad || !script) {
    return NextResponse.json({ error: "Ad or script not found" }, { status: 404 });
  }

  // Build a minimal ProductFacts from the ad row.
  const product = {
    title: ad.productTitle ?? "the product",
    description: "",
    images: [],
    reviews: [],
    url: ad.productUrl,
  };

  const variants = await generateHookVariants({
    product,
    script,
  });

  const created = await db.$transaction(
    variants.map((v) =>
      db.adVariant.create({
        data: {
          userId,
          adId: ad.id,
          label: v.label,
          angle: v.angle,
          scriptJson: packJson({
            hook: v.hook,
            problem: script.problem,
            solution: script.solution,
            cta: script.cta,
            fullScript: v.fullScript,
          }),
        },
      }),
    ),
  );

  return NextResponse.json({ variants: created });
}
