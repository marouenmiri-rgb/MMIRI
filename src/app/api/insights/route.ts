import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasClaude, hasDb } from "@/lib/env";
import { generateInsights } from "@/agents/insights";
import type { SocialPlatform } from "@/social/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * GET  /api/insights    list persisted insights (most recent first)
 * POST /api/insights    run the agent against last-7-day data and
 *                       persist each suggestion as an Insight row
 */
export async function GET() {
  if (!hasDb) return NextResponse.json({ insights: [] });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ insights: [] });

  const insights = await db.insight.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ insights });
}

export async function POST() {
  if (!hasDb || !hasClaude) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const input = await buildInput(userId);
  const out = await generateInsights(input);

  const created = await db.$transaction(
    out.suggestions.map((s) =>
      db.insight.create({
        data: {
          userId,
          kind: s.kind,
          title: s.title,
          body: s.body,
          evidenceJson: s.action ? ({ action: s.action } as object) : undefined,
        },
      }),
    ),
  );

  return NextResponse.json({ summary: out.summary, insights: created });
}

async function buildInput(userId: string) {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

  const [links, publishedPosts, ads, variants] = await Promise.all([
    db.trackingLink.findMany({
      where: { userId, createdAt: { gte: since } },
      select: {
        clicks: true,
        conversions: true,
        revenueCents: true,
        socialPost: { select: { platform: true, variantId: true, adId: true } },
      },
    }),
    db.socialPost.findMany({
      where: { userId, status: "PUBLISHED", publishedAt: { gte: since } },
      select: { platform: true, adId: true, variantId: true },
    }),
    db.ad.findMany({
      where: { userId },
      select: { id: true, productTitle: true },
    }),
    db.adVariant.findMany({
      where: { userId },
      select: {
        id: true,
        label: true,
        scriptJson: true,
        socialPosts: {
          select: {
            trackingLink: {
              select: { clicks: true, conversions: true, revenueCents: true },
            },
          },
        },
      },
    }),
  ]);

  const totals = {
    clicks: links.reduce((s, l) => s + l.clicks, 0),
    conversions: links.reduce((s, l) => s + l.conversions, 0),
    revenueCents: links.reduce((s, l) => s + l.revenueCents, 0),
  };

  const platformMap = new Map<
    SocialPlatform,
    { clicks: number; conversions: number; revenueCents: number; posts: number }
  >();
  for (const l of links) {
    const p = l.socialPost?.platform as SocialPlatform | undefined;
    if (!p) continue;
    const cur = platformMap.get(p) ?? {
      clicks: 0,
      conversions: 0,
      revenueCents: 0,
      posts: 0,
    };
    cur.clicks += l.clicks;
    cur.conversions += l.conversions;
    cur.revenueCents += l.revenueCents;
    platformMap.set(p, cur);
  }
  for (const post of publishedPosts) {
    const p = post.platform as SocialPlatform;
    const cur = platformMap.get(p) ?? {
      clicks: 0,
      conversions: 0,
      revenueCents: 0,
      posts: 0,
    };
    cur.posts += 1;
    platformMap.set(p, cur);
  }

  const adMap = new Map<string, { title: string; revenueCents: number; clicks: number; conversions: number; postsShipped: number }>();
  for (const a of ads) {
    adMap.set(a.id, {
      title: a.productTitle ?? "Untitled",
      revenueCents: 0,
      clicks: 0,
      conversions: 0,
      postsShipped: 0,
    });
  }
  for (const l of links) {
    const adId = l.socialPost?.adId;
    if (!adId) continue;
    const cur = adMap.get(adId);
    if (!cur) continue;
    cur.revenueCents += l.revenueCents;
    cur.clicks += l.clicks;
    cur.conversions += l.conversions;
  }
  for (const post of publishedPosts) {
    const cur = adMap.get(post.adId);
    if (cur) cur.postsShipped += 1;
  }

  const byHook = variants
    .map((v) => {
      const s = v.scriptJson as { hook?: string } | null;
      return {
        label: v.label,
        hook: s?.hook ?? "",
        clicks: v.socialPosts.reduce(
          (x, p) => x + (p.trackingLink?.clicks ?? 0),
          0,
        ),
        conversions: v.socialPosts.reduce(
          (x, p) => x + (p.trackingLink?.conversions ?? 0),
          0,
        ),
        revenueCents: v.socialPosts.reduce(
          (x, p) => x + (p.trackingLink?.revenueCents ?? 0),
          0,
        ),
        postsShipped: v.socialPosts.length,
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents);

  return {
    windowDays: 7,
    totals,
    byPlatform: Array.from(platformMap.entries())
      .map(([platform, t]) => ({ platform, ...t }))
      .sort((a, b) => b.revenueCents - a.revenueCents),
    byAd: Array.from(adMap.values()).sort(
      (a, b) => b.revenueCents - a.revenueCents,
    ),
    byHook,
  };
}
