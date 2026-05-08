/**
 * Default 3PL partner roster — these get seeded into the DB on first boot.
 *
 * Affiliate URLs use a `{ref}` placeholder. When a `THREEPL_AFFILIATE_REF`
 * env var is set, the matcher substitutes it in; otherwise the URL is used
 * as-is and the user can edit it from the dashboard later.
 *
 * Commission values are illustrative — verify each program's current terms
 * before relying on them for revenue projections.
 */

export type SeedThreePLPartner = {
  name: string;
  websiteUrl: string;
  affiliateUrl: string;
  commissionBps: number;
  vertical: string;
  geo: string;
  minOrdersPerMonth: number | null;
  maxOrdersPerMonth: number | null;
  blurb: string;
};

export const DEFAULT_THREEPL_PARTNERS: SeedThreePLPartner[] = [
  {
    name: "ShipBob",
    websiteUrl: "https://www.shipbob.com",
    affiliateUrl: "https://www.shipbob.com/?ref={ref}",
    commissionBps: 1000,
    vertical: "general",
    geo: "GLOBAL",
    minOrdersPerMonth: 200,
    maxOrdersPerMonth: 50000,
    blurb:
      "Global 3PL with 50+ fulfillment centers, native Shopify/Amazon integrations, 2-day delivery footprint.",
  },
  {
    name: "ShipMonk",
    websiteUrl: "https://www.shipmonk.com",
    affiliateUrl: "https://www.shipmonk.com/?ref={ref}",
    commissionBps: 800,
    vertical: "subscription",
    geo: "US",
    minOrdersPerMonth: 100,
    maxOrdersPerMonth: 20000,
    blurb:
      "Strong with subscription boxes and crowdfunded brands; flexible kitting + bundle assembly.",
  },
  {
    name: "ShipHero",
    websiteUrl: "https://shiphero.com",
    affiliateUrl: "https://shiphero.com/?ref={ref}",
    commissionBps: 700,
    vertical: "apparel",
    geo: "US",
    minOrdersPerMonth: 500,
    maxOrdersPerMonth: 100000,
    blurb:
      "WMS + outsourced fulfillment in one stack. Apparel and beauty brands lean here.",
  },
  {
    name: "Easyship",
    websiteUrl: "https://www.easyship.com",
    affiliateUrl: "https://www.easyship.com/affiliate?ref={ref}",
    commissionBps: 1500,
    vertical: "general",
    geo: "GLOBAL",
    minOrdersPerMonth: 50,
    maxOrdersPerMonth: 5000,
    blurb:
      "Multi-courier shipping platform with discounted rates — entry option before a full 3PL move.",
  },
  {
    name: "Red Stag Fulfillment",
    websiteUrl: "https://redstagfulfillment.com",
    affiliateUrl: "https://redstagfulfillment.com/?ref={ref}",
    commissionBps: 600,
    vertical: "home",
    geo: "US",
    minOrdersPerMonth: 200,
    maxOrdersPerMonth: 30000,
    blurb:
      "Heavy / oversized / high-value goods specialist with 100% accuracy guarantee.",
  },
];
