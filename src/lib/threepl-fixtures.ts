/**
 * Demo fixtures for the 3PL Finder.
 *
 * When the DB is empty (or absent) the dashboard renders these so the page
 * never looks empty. Numbers are illustrative — same shape as live data.
 */

export type DemoSignals = {
  skuCount: number;
  reviewCount: number;
  estMonthlyOrders: number;
  hasShippingPage: boolean;
  shipsInternationally: boolean;
  currentCarrier: string | null;
  freeShippingThreshold: string | null;
};

export type DemoThreePLLead = {
  id: string;
  brandName: string;
  websiteUrl: string;
  host: string;
  email: string | null;
  vertical: string;
  estMonthlyOrders: number;
  fitScore: number;
  fitReasons: string[];
  signals: DemoSignals;
  matchedPartnerName: string;
  matchedPartnerVertical: string;
  commissionBps: number;
  affiliateLink: string;
  outreachSubject: string;
  outreachBody: string;
  status: string;
  createdAt: string;
  isDemo: true;
};

const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 3600 * 1000).toISOString();

export const fixtureThreePLLeads: DemoThreePLLead[] = [
  {
    id: "demo-3pl-1",
    brandName: "Northwild Apothecary",
    websiteUrl: "https://northwild.co",
    host: "northwild.co",
    email: "ops@northwild.co",
    vertical: "beauty",
    estMonthlyOrders: 1840,
    fitScore: 92,
    fitReasons: [
      "1.8k est. orders/mo from review velocity",
      "dedicated shipping policy with $75 free threshold",
      "ships internationally — currently USPS only",
      "self-fulfilled signals: ships from studio",
    ],
    signals: {
      skuCount: 47,
      reviewCount: 4412,
      estMonthlyOrders: 1840,
      hasShippingPage: true,
      shipsInternationally: true,
      currentCarrier: "USPS",
      freeShippingThreshold: "75",
    },
    matchedPartnerName: "ShipBob",
    matchedPartnerVertical: "general",
    commissionBps: 1000,
    affiliateLink: "https://www.shipbob.com/?ref=adgen_demo",
    outreachSubject: "Quick idea for Northwild fulfillment",
    outreachBody:
      "Hey Northwild team,\n\nNoticed you ship from the studio and still hit ~1.8k orders/mo with international USPS — that's the exact stage most beauty brands hit a wall.\n\nShipBob handles that handoff cleanly: 50+ fulfillment centers, native Shopify, 2-day footprint. They have a partner program I'm part of, so here's my link if you want to skip the sales call:\nhttps://www.shipbob.com/?ref=adgen_demo\n\nWorth a 10-min look?\n\n– Operator",
    status: "PITCHED",
    createdAt: hoursAgo(2),
    isDemo: true,
  },
  {
    id: "demo-3pl-2",
    brandName: "Pawline Daily",
    websiteUrl: "https://pawline.co",
    host: "pawline.co",
    email: "hello@pawline.co",
    vertical: "pet",
    estMonthlyOrders: 920,
    fitScore: 86,
    fitReasons: [
      "monthly subscription box model (kitting heavy)",
      "~920 est. orders/mo",
      "US-only shipping, ground via UPS",
    ],
    signals: {
      skuCount: 22,
      reviewCount: 2208,
      estMonthlyOrders: 920,
      hasShippingPage: true,
      shipsInternationally: false,
      currentCarrier: "UPS",
      freeShippingThreshold: "45",
    },
    matchedPartnerName: "ShipMonk",
    matchedPartnerVertical: "subscription",
    commissionBps: 800,
    affiliateLink: "https://www.shipmonk.com/?ref=adgen_demo",
    outreachSubject: "Pawline kitting at scale",
    outreachBody:
      "Hey Pawline team,\n\nA monthly box at ~900 orders/mo is the part where in-house kitting starts eating the founder's week. ShipMonk specializes in subscription brands like yours — assembly, kitting and pick-pack in one stack.\n\nHere's my partner link (commission disclosed):\nhttps://www.shipmonk.com/?ref=adgen_demo\n\nIf the math works I'll send a direct intro.\n\n– Operator",
    status: "PITCHED",
    createdAt: hoursAgo(4),
    isDemo: true,
  },
  {
    id: "demo-3pl-3",
    brandName: "Slate & Salt Coffee",
    websiteUrl: "https://slatesalt.coffee",
    host: "slatesalt.coffee",
    email: null,
    vertical: "beverage",
    estMonthlyOrders: 540,
    fitScore: 78,
    fitReasons: [
      "~540 est. orders/mo from 1.3k reviews",
      "no shipping policy page surfaced",
      "fresh-roast model — narrow ship windows",
    ],
    signals: {
      skuCount: 14,
      reviewCount: 1296,
      estMonthlyOrders: 540,
      hasShippingPage: false,
      shipsInternationally: false,
      currentCarrier: "USPS",
      freeShippingThreshold: null,
    },
    matchedPartnerName: "ShipBob",
    matchedPartnerVertical: "general",
    commissionBps: 1000,
    affiliateLink: "https://www.shipbob.com/?ref=adgen_demo",
    outreachSubject: "Roast-day fulfillment for Slate & Salt",
    outreachBody:
      "Hey Slate & Salt team,\n\nFresh-roast subscriptions and ~540 orders/mo via USPS is a tight window — ShipBob can run roast-day picks with same-day cutoffs in their network.\n\nMy partner link:\nhttps://www.shipbob.com/?ref=adgen_demo\n\nIf the math doesn't fit, no worries — I'll just say so.\n\n– Operator",
    status: "PITCHED",
    createdAt: hoursAgo(6),
    isDemo: true,
  },
  {
    id: "demo-3pl-4",
    brandName: "Highland & Pine",
    websiteUrl: "https://highlandpine.co",
    host: "highlandpine.co",
    email: "founders@highlandpine.co",
    vertical: "home",
    estMonthlyOrders: 320,
    fitScore: 71,
    fitReasons: [
      "candles + ceramics — fragile, dim-weight sensitive",
      "~320 est. orders/mo, wholesale page live",
      "FedEx ground for retail",
    ],
    signals: {
      skuCount: 38,
      reviewCount: 768,
      estMonthlyOrders: 320,
      hasShippingPage: true,
      shipsInternationally: true,
      currentCarrier: "FedEx",
      freeShippingThreshold: "120",
    },
    matchedPartnerName: "Red Stag Fulfillment",
    matchedPartnerVertical: "home",
    commissionBps: 600,
    affiliateLink: "https://redstagfulfillment.com/?ref=adgen_demo",
    outreachSubject: "Fragile-ware fulfillment for Highland & Pine",
    outreachBody:
      "Hey Highland & Pine team,\n\nCandles + ceramics + wholesale orders is exactly where parcel breakage starts hurting the brand. Red Stag specializes in fragile / heavy SKUs and guarantees 100% pick accuracy.\n\nMy partner link:\nhttps://redstagfulfillment.com/?ref=adgen_demo\n\nIf the volume warrants a quote, I'll set up the intro.\n\n– Operator",
    status: "PITCHED",
    createdAt: hoursAgo(9),
    isDemo: true,
  },
  {
    id: "demo-3pl-5",
    brandName: "Volt Drinks",
    websiteUrl: "https://voltdrinks.co",
    host: "voltdrinks.co",
    email: "partners@voltdrinks.co",
    vertical: "beverage",
    estMonthlyOrders: 2400,
    fitScore: 88,
    fitReasons: [
      "~2.4k est. orders/mo from review velocity",
      "international shipping live, multi-carrier needed",
      "$60 free-shipping threshold",
    ],
    signals: {
      skuCount: 9,
      reviewCount: 5760,
      estMonthlyOrders: 2400,
      hasShippingPage: true,
      shipsInternationally: true,
      currentCarrier: "DHL",
      freeShippingThreshold: "60",
    },
    matchedPartnerName: "Easyship",
    matchedPartnerVertical: "general",
    commissionBps: 1500,
    affiliateLink: "https://www.easyship.com/affiliate?ref=adgen_demo",
    outreachSubject: "Multi-carrier discounts for Volt Drinks",
    outreachBody:
      "Hey Volt Drinks team,\n\nInternational at 2k+ orders/mo with DHL only is the moment a multi-carrier layer pays for itself — Easyship gives discounted rates across DHL/UPS/USPS in one Shopify install.\n\nMy partner link (highest commission tier I'm cleared for):\nhttps://www.easyship.com/affiliate?ref=adgen_demo\n\nOpen to a 10-min look?\n\n– Operator",
    status: "PITCHED",
    createdAt: hoursAgo(14),
    isDemo: true,
  },
  {
    id: "demo-3pl-6",
    brandName: "Dune Goods",
    websiteUrl: "https://dunegoods.myshopify.com",
    host: "dunegoods.myshopify.com",
    email: null,
    vertical: "apparel",
    estMonthlyOrders: 180,
    fitScore: 62,
    fitReasons: [
      "small catalog — 180 est. orders/mo",
      "wholesale page absent",
      "self-fulfilled signals: small team",
    ],
    signals: {
      skuCount: 12,
      reviewCount: 432,
      estMonthlyOrders: 180,
      hasShippingPage: true,
      shipsInternationally: false,
      currentCarrier: "USPS",
      freeShippingThreshold: null,
    },
    matchedPartnerName: "Easyship",
    matchedPartnerVertical: "general",
    commissionBps: 1500,
    affiliateLink: "https://www.easyship.com/affiliate?ref=adgen_demo",
    outreachSubject: "Lightweight ship-rates for Dune Goods",
    outreachBody:
      "Hey Dune Goods team,\n\n~180 orders/mo is the awkward middle — too much for the kitchen table, too little for a full 3PL. Easyship is the bridge: discounted multi-carrier rates from your existing setup.\n\nMy partner link:\nhttps://www.easyship.com/affiliate?ref=adgen_demo\n\nIf you outgrow it I'll route you to a real 3PL.\n\n– Operator",
    status: "MATCHED",
    createdAt: hoursAgo(20),
    isDemo: true,
  },
];

export type DemoPartner = {
  id: string;
  name: string;
  websiteUrl: string;
  vertical: string;
  geo: string;
  commissionBps: number;
  minOrdersPerMonth: number | null;
  maxOrdersPerMonth: number | null;
  blurb: string;
  active: boolean;
};

export const fixtureThreePLPartners: DemoPartner[] = [
  {
    id: "demo-partner-shipbob",
    name: "ShipBob",
    websiteUrl: "https://www.shipbob.com",
    vertical: "general",
    geo: "GLOBAL",
    commissionBps: 1000,
    minOrdersPerMonth: 200,
    maxOrdersPerMonth: 50000,
    blurb:
      "Global 3PL · 50+ fulfillment centers · native Shopify/Amazon · 2-day footprint",
    active: true,
  },
  {
    id: "demo-partner-shipmonk",
    name: "ShipMonk",
    websiteUrl: "https://www.shipmonk.com",
    vertical: "subscription",
    geo: "US",
    commissionBps: 800,
    minOrdersPerMonth: 100,
    maxOrdersPerMonth: 20000,
    blurb:
      "Subscription-box specialist · flexible kitting + bundle assembly · 12 warehouses",
    active: true,
  },
  {
    id: "demo-partner-shiphero",
    name: "ShipHero",
    websiteUrl: "https://shiphero.com",
    vertical: "apparel",
    geo: "US",
    commissionBps: 700,
    minOrdersPerMonth: 500,
    maxOrdersPerMonth: 100000,
    blurb:
      "WMS + outsourced fulfillment in one stack · apparel & beauty heavy",
    active: true,
  },
  {
    id: "demo-partner-easyship",
    name: "Easyship",
    websiteUrl: "https://www.easyship.com",
    vertical: "general",
    geo: "GLOBAL",
    commissionBps: 1500,
    minOrdersPerMonth: 50,
    maxOrdersPerMonth: 5000,
    blurb:
      "Multi-courier shipping platform · discounted rates · entry option before a full 3PL move",
    active: true,
  },
  {
    id: "demo-partner-redstag",
    name: "Red Stag Fulfillment",
    websiteUrl: "https://redstagfulfillment.com",
    vertical: "home",
    geo: "US",
    commissionBps: 600,
    minOrdersPerMonth: 200,
    maxOrdersPerMonth: 30000,
    blurb:
      "Heavy / oversized / high-value goods specialist · 100% accuracy guarantee",
    active: true,
  },
];

export const SUGGESTED_NICHES = [
  "supplements",
  "pet treats",
  "home fragrance",
  "specialty coffee",
  "subscription box",
  "athleisure",
  "skincare",
  "kids apparel",
];
