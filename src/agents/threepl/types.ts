/**
 * Types shared by the 3PL customer-finder pipeline.
 *
 * The pipeline finds DTC / e-commerce brands that look like good candidates
 * to outsource fulfillment to a 3PL warehouse — we then earn affiliate
 * commission by referring them to a partner from our `ThreePLPartner` registry.
 */

export type ThreePLNicheQueries = {
  niche: string;
  queries: string[];
  verticals: string[];
};

export type BrandSignals = {
  skuCount: number | null;
  hasShippingPage: boolean;
  hasWholesalePage: boolean;
  freeShippingThreshold: string | null;
  shipsInternationally: boolean;
  currentCarrier: string | null;
  selfFulfilledHints: string[];
  reviewCount: number | null;
  estMonthlyOrders: number | null;
  vertical: string | null;
};

export type CandidateBrand = {
  brandName: string;
  websiteUrl: string;
  email: string | null;
  socials: { twitter?: string; instagram?: string; facebook?: string };
  signals: BrandSignals;
  rawSnippet: string;
  source: string;
};

export type FitVerdict = {
  score: number;
  reasons: string[];
  estMonthlyOrders: number | null;
  vertical: string | null;
};

export type PartnerSummary = {
  id: string;
  name: string;
  websiteUrl: string;
  affiliateUrl: string;
  vertical: string | null;
  geo: string | null;
  minOrdersPerMonth: number | null;
  maxOrdersPerMonth: number | null;
  blurb: string | null;
  commissionBps: number;
};

export type PartnerMatch = {
  partnerId: string;
  rationale: string;
  affiliateLink: string;
};

export type AffiliateEmail = {
  subject: string;
  body: string;
};
