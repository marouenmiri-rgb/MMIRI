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
