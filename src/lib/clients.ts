import { db } from "@/lib/db";

/**
 * Revenue rolls up through Ad -> TrackingLink, so a client's numbers are the
 * sum over the tracking links of that client's ads. Both the agency dashboard
 * and the public report read from here, so they can never disagree.
 */

export type ClientStats = {
  adsShipped: number;
  postsPublished: number;
  clicks: number;
  conversions: number;
  revenueCents: number;
  /** Retainer for the window, in cents. Zero when none is set. */
  retainerCents: number;
  /** Attributed revenue divided by retainer. Null when there is no retainer. */
  returnMultiple: number | null;
  /** Revenue per published post, in cents. Null when nothing is published. */
  revenuePerPostCents: number | null;
  byPlatform: { platform: string; revenueCents: number; posts: number; clicks: number }[];
  topAds: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    revenueCents: number;
    clicks: number;
  }[];
};

/** A calendar window. `since` is inclusive, `until` exclusive. */
export function monthWindow(monthsAgo = 0) {
  const now = new Date();
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1),
  );
  const until = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo + 1, 1),
  );
  return { since, until };
}

export async function loadClientStats(
  clientId: string,
  window: { since: Date; until: Date },
  retainerCents: number,
): Promise<ClientStats> {
  const ads = await db.ad.findMany({
    where: { clientId, createdAt: { lt: window.until } },
    select: {
      id: true,
      productTitle: true,
      thumbnailUrl: true,
      createdAt: true,
      status: true,
      trackingLinks: {
        select: {
          clicks: true,
          conversions: true,
          revenueCents: true,
          socialPost: { select: { platform: true, status: true } },
        },
      },
    },
  });

  let clicks = 0;
  let conversions = 0;
  let revenueCents = 0;
  let postsPublished = 0;
  const platforms = new Map<
    string,
    { platform: string; revenueCents: number; posts: number; clicks: number }
  >();

  const topAds = ads
    .map((ad) => {
      let adRevenue = 0;
      let adClicks = 0;
      for (const link of ad.trackingLinks) {
        adRevenue += link.revenueCents;
        adClicks += link.clicks;
        conversions += link.conversions;

        const platform = link.socialPost?.platform;
        if (platform) {
          const row =
            platforms.get(platform) ??
            { platform, revenueCents: 0, posts: 0, clicks: 0 };
          row.revenueCents += link.revenueCents;
          row.clicks += link.clicks;
          if (link.socialPost?.status === "PUBLISHED") {
            row.posts += 1;
            postsPublished += 1;
          }
          platforms.set(platform, row);
        }
      }
      clicks += adClicks;
      revenueCents += adRevenue;
      return {
        id: ad.id,
        title: ad.productTitle ?? "Untitled ad",
        thumbnailUrl: ad.thumbnailUrl,
        revenueCents: adRevenue,
        clicks: adClicks,
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);

  const adsShipped = ads.filter(
    (a) => a.createdAt >= window.since && a.status === "READY",
  ).length;

  return {
    adsShipped,
    postsPublished,
    clicks,
    conversions,
    revenueCents,
    retainerCents,
    returnMultiple:
      retainerCents > 0 ? revenueCents / retainerCents : null,
    revenuePerPostCents:
      postsPublished > 0 ? Math.round(revenueCents / postsPublished) : null,
    byPlatform: [...platforms.values()].sort(
      (a, b) => b.revenueCents - a.revenueCents,
    ),
    topAds,
  };
}

/** Roll-up for the agency list view — one row per client, cheapest query. */
export async function loadClientSummaries(userId: string) {
  const clients = await db.client.findMany({
    where: { userId },
    orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      websiteUrl: true,
      contactEmail: true,
      reportToken: true,
      accentColor: true,
      retainerCents: true,
      currency: true,
      archived: true,
      createdAt: true,
      ads: {
        select: {
          status: true,
          trackingLinks: {
            select: { clicks: true, revenueCents: true, socialPost: { select: { status: true } } },
          },
        },
      },
    },
  });

  return clients.map((c) => {
    let revenueCents = 0;
    let clicks = 0;
    let postsPublished = 0;
    for (const ad of c.ads) {
      for (const link of ad.trackingLinks) {
        revenueCents += link.revenueCents;
        clicks += link.clicks;
        if (link.socialPost?.status === "PUBLISHED") postsPublished += 1;
      }
    }
    const { ads, ...rest } = c;
    return {
      ...rest,
      createdAt: c.createdAt.toISOString(),
      adsTotal: ads.length,
      adsReady: ads.filter((a) => a.status === "READY").length,
      postsPublished,
      clicks,
      revenueCents,
      returnMultiple:
        c.retainerCents > 0 ? revenueCents / c.retainerCents : null,
    };
  });
}

/** URL-safe, unguessable token for a public report link. */
export function newReportToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("");
}
