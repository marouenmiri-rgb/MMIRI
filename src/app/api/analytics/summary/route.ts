import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";

export const runtime = "nodejs";

type PlatformTotals = Record<
  "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "X",
  { clicks: number; conversions: number; revenueCents: number; posts: number }
>;

export async function GET() {
  if (!hasDb) return NextResponse.json(empty());
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json(empty());

  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

  const [links, conversions, posts, topAds] = await Promise.all([
    db.trackingLink.findMany({
      where: { userId },
      select: {
        id: true,
        clicks: true,
        conversions: true,
        revenueCents: true,
        socialPost: { select: { platform: true, adId: true } },
      },
    }),
    db.conversion.findMany({
      where: { userId, occurredAt: { gte: since } },
      orderBy: { occurredAt: "asc" },
      select: { id: true, revenueCents: true, currency: true, occurredAt: true, link: { select: { socialPost: { select: { platform: true, ad: { select: { id: true, productTitle: true } } } } } } },
    }),
    db.socialPost.findMany({
      where: { userId, status: "PUBLISHED" },
      select: { platform: true },
    }),
    db.trackingLink.groupBy({
      by: ["adId"],
      where: { userId, adId: { not: null } },
      _sum: { revenueCents: true, clicks: true, conversions: true },
      orderBy: { _sum: { revenueCents: "desc" } },
      take: 5,
    }),
  ]);

  const totals = {
    clicks: sum(links.map((l) => l.clicks)),
    conversions: sum(links.map((l) => l.conversions)),
    revenueCents: sum(links.map((l) => l.revenueCents)),
  };

  const byPlatform: PlatformTotals = {
    TIKTOK: zero(),
    INSTAGRAM: zero(),
    YOUTUBE: zero(),
    X: zero(),
  };
  for (const l of links) {
    const p = l.socialPost?.platform;
    if (!p) continue;
    byPlatform[p].clicks += l.clicks;
    byPlatform[p].conversions += l.conversions;
    byPlatform[p].revenueCents += l.revenueCents;
  }
  for (const post of posts) byPlatform[post.platform].posts += 1;

  // Top ads — fetch titles for the ids we grouped
  const adIds = topAds.map((r) => r.adId).filter(Boolean) as string[];
  const adRows = adIds.length
    ? await db.ad.findMany({
        where: { id: { in: adIds } },
        select: { id: true, productTitle: true, thumbnailUrl: true },
      })
    : [];
  const adById = new Map(adRows.map((a) => [a.id, a]));

  const topAdList = topAds.map((r) => ({
    adId: r.adId!,
    title: adById.get(r.adId!)?.productTitle ?? "Untitled",
    thumbnailUrl: adById.get(r.adId!)?.thumbnailUrl ?? null,
    revenueCents: r._sum.revenueCents ?? 0,
    clicks: r._sum.clicks ?? 0,
    conversions: r._sum.conversions ?? 0,
  }));

  // Daily series (last 30d) for the pulse chart
  const byDay = new Map<string, number>();
  for (const c of conversions) {
    const k = c.occurredAt.toISOString().slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + c.revenueCents);
  }
  const days: { day: string; cents: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const k = d.toISOString().slice(0, 10);
    days.push({ day: k, cents: byDay.get(k) ?? 0 });
  }

  return NextResponse.json({
    totals,
    byPlatform,
    topAds: topAdList,
    series: days,
    recent: conversions.slice(-15).map((c) => ({
      id: c.id,
      revenueCents: c.revenueCents,
      currency: c.currency,
      occurredAt: c.occurredAt,
      platform: c.link.socialPost?.platform ?? null,
      adTitle: c.link.socialPost?.ad?.productTitle ?? null,
    })),
  });
}

function zero() {
  return { clicks: 0, conversions: 0, revenueCents: 0, posts: 0 };
}
function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
function empty() {
  return {
    totals: { clicks: 0, conversions: 0, revenueCents: 0 },
    byPlatform: {
      TIKTOK: zero(),
      INSTAGRAM: zero(),
      YOUTUBE: zero(),
      X: zero(),
    },
    topAds: [],
    series: [],
    recent: [],
  };
}
