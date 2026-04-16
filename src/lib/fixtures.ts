/** Demo data for when the DB isn't configured. Lets the UI render end-to-end. */

export const fixtureAds = [
  {
    id: "demo-1",
    productTitle: "Ember Travel Mug 2",
    productUrl: "https://ember.com/products/ember-travel-mug-2",
    status: "READY",
    createdAt: new Date().toISOString(),
    thumbnailUrl:
      "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400",
  },
  {
    id: "demo-2",
    productTitle: "Allbirds Wool Runner",
    productUrl: "https://www.allbirds.com/products/mens-wool-runners",
    status: "RENDERING",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    thumbnailUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
  },
];

export const fixtureLeads = [
  {
    id: "lead-1",
    storeName: "Highland & Pine",
    websiteUrl: "https://highlandpine.co",
    email: "hello@highlandpine.co",
    createdAt: new Date().toISOString(),
  },
  {
    id: "lead-2",
    storeName: "Dune Goods",
    websiteUrl: "https://dunegoods.myshopify.com",
    email: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
];

export const fixtureCampaigns = [
  {
    id: "camp-1",
    name: "Spring outreach · Home goods",
    status: "active",
    sent: 128,
    opened: 41,
    replied: 9,
  },
];

const inHours = (h: number) =>
  new Date(Date.now() + h * 60 * 60 * 1000).toISOString();

// 30-day plausibly-growing revenue curve for the Revenue Pulse demo.
const revenueSeries = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (29 - i));
  const ramp = Math.round(4000 * Math.pow(i / 29, 1.7));
  const noise = Math.round((Math.sin(i * 1.3) * 0.5 + 0.5) * 2500);
  return { day: d.toISOString().slice(0, 10), cents: ramp + noise };
});

export const fixtureRevenue = {
  totals: {
    clicks: 14230,
    conversions: 287,
    revenueCents: revenueSeries.reduce((s, p) => s + p.cents, 0),
  },
  byPlatform: {
    TIKTOK: { clicks: 7180, conversions: 141, revenueCents: 85400, posts: 18 },
    INSTAGRAM: { clicks: 4100, conversions: 94, revenueCents: 56900, posts: 12 },
    YOUTUBE: { clicks: 2110, conversions: 37, revenueCents: 22400, posts: 4 },
    X: { clicks: 840, conversions: 15, revenueCents: 9200, posts: 6 },
  },
  topAds: [
    {
      adId: "demo-1",
      title: "Ember Travel Mug 2",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=200",
      revenueCents: 62500,
      clicks: 5200,
      conversions: 103,
    },
    {
      adId: "demo-2",
      title: "Allbirds Wool Runner",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200",
      revenueCents: 48700,
      clicks: 4100,
      conversions: 86,
    },
    {
      adId: "demo-3",
      title: "Highland Candle Co.",
      thumbnailUrl: null,
      revenueCents: 31200,
      clicks: 2800,
      conversions: 54,
    },
  ],
  series: revenueSeries,
  recent: [
    { id: "r1", revenueCents: 4900, currency: "USD", occurredAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(), platform: "TIKTOK" as const, adTitle: "Ember Travel Mug 2" },
    { id: "r2", revenueCents: 2900, currency: "USD", occurredAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(), platform: "INSTAGRAM" as const, adTitle: "Allbirds Wool Runner" },
    { id: "r3", revenueCents: 8800, currency: "USD", occurredAt: new Date(Date.now() - 1000 * 60 * 57).toISOString(), platform: "TIKTOK" as const, adTitle: "Highland Candle Co." },
    { id: "r4", revenueCents: 1900, currency: "USD", occurredAt: new Date(Date.now() - 1000 * 60 * 104).toISOString(), platform: "YOUTUBE" as const, adTitle: "Ember Travel Mug 2" },
  ],
};

export const fixtureDistribution = {
  connections: {
    TIKTOK: {
      id: "conn-tt",
      platform: "TIKTOK" as const,
      handle: "adgen.lab",
      demo: true,
      queued: 2,
      published: 5,
    },
    INSTAGRAM: {
      id: "conn-ig",
      platform: "INSTAGRAM" as const,
      handle: "adgen.lab",
      demo: true,
      queued: 1,
      published: 3,
    },
    YOUTUBE: null,
    X: {
      id: "conn-x",
      platform: "X" as const,
      handle: "adgenlab",
      demo: true,
      queued: 1,
      published: 2,
    },
  },
  posts: [
    {
      id: "p1",
      platform: "TIKTOK" as const,
      scheduledFor: inHours(3),
      status: "SCHEDULED" as const,
      externalUrl: null,
      ad: { productTitle: "Ember Travel Mug 2", thumbnailUrl: null },
    },
    {
      id: "p2",
      platform: "INSTAGRAM" as const,
      scheduledFor: inHours(6),
      status: "SCHEDULED" as const,
      externalUrl: null,
      ad: { productTitle: "Ember Travel Mug 2", thumbnailUrl: null },
    },
    {
      id: "p3",
      platform: "X" as const,
      scheduledFor: inHours(26),
      status: "SCHEDULED" as const,
      externalUrl: null,
      ad: { productTitle: "Allbirds Wool Runner", thumbnailUrl: null },
    },
    {
      id: "p4",
      platform: "TIKTOK" as const,
      scheduledFor: inHours(-18),
      status: "PUBLISHED" as const,
      externalUrl: "https://www.tiktok.com/@demo/video/demo_x?demo=1",
      ad: { productTitle: "Highland Candle Co.", thumbnailUrl: null },
    },
    {
      id: "p5",
      platform: "INSTAGRAM" as const,
      scheduledFor: inHours(-42),
      status: "PUBLISHED" as const,
      externalUrl: "https://www.instagram.com/reel/demo_y?demo=1",
      ad: { productTitle: "Dune Goods Tote", thumbnailUrl: null },
    },
  ],
};
