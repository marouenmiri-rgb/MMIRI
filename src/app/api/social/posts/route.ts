import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";
import { publishOne } from "@/social/publisher";
import { createTrackingLink, injectLink } from "@/lib/tracking";
import type { SocialPlatform } from "@/social/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const Item = z.object({
  platform: z.enum(["TIKTOK", "INSTAGRAM", "YOUTUBE", "X"]),
  caption: z.string().min(1).max(2200),
  variantId: z.string().optional(),
});

const Body = z.object({
  adId: z.string(),
  posts: z.array(Item).min(1),
  scheduledFor: z.string().datetime().optional(),
  deliver: z.enum(["now", "scheduled"]).default("scheduled"),
});

export async function GET() {
  if (!hasDb) return NextResponse.json({ posts: [] });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ posts: [] });
  const posts = await db.socialPost.findMany({
    where: { userId },
    orderBy: { scheduledFor: "asc" },
    take: 100,
    include: {
      ad: { select: { id: true, productTitle: true, thumbnailUrl: true } },
      connection: { select: { handle: true, demo: true } },
      trackingLink: {
        select: { code: true, clicks: true, conversions: true, revenueCents: true },
      },
    },
  });
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const ad = await db.ad.findFirst({
    where: { id: parsed.data.adId, userId },
  });
  if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });

  const connections = await db.socialConnection.findMany({
    where: {
      userId,
      platform: { in: parsed.data.posts.map((p) => p.platform) as SocialPlatform[] },
    },
  });
  const byPlatform = new Map(connections.map((c) => [c.platform, c]));

  const scheduledFor = parsed.data.scheduledFor
    ? new Date(parsed.data.scheduledFor)
    : new Date();

  const created = [];
  for (const item of parsed.data.posts) {
    const conn = byPlatform.get(item.platform);
    if (!conn) {
      return NextResponse.json(
        { error: `Not connected to ${item.platform}` },
        { status: 400 },
      );
    }

    // Create the post first with a placeholder caption, then mint a tracking
    // link that references the post, then update the caption with the link.
    // Doing it in two passes lets the short link include the socialPostId
    // for per-post attribution.
    const post = await db.socialPost.create({
      data: {
        userId,
        connectionId: conn.id,
        adId: ad.id,
        variantId: item.variantId ?? null,
        platform: item.platform,
        caption: item.caption, // temporary
        scheduledFor,
      },
    });

    const { link } = await createTrackingLink({
      userId,
      adId: ad.id,
      socialPostId: post.id,
      destinationUrl: ad.productUrl,
      platform: item.platform,
      campaign: `ad_${ad.id.slice(0, 8)}`,
    });

    const finalCaption = injectLink(item.caption, link);
    const updated = await db.socialPost.update({
      where: { id: post.id },
      data: { caption: finalCaption },
    });
    created.push(updated);
  }

  if (parsed.data.deliver === "now") {
    await Promise.all(created.map((p) => publishOne(p.id)));
  }

  const refreshed = await db.socialPost.findMany({
    where: { id: { in: created.map((p) => p.id) } },
    include: {
      trackingLink: { select: { code: true } },
    },
  });
  return NextResponse.json({ posts: refreshed });
}
