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
