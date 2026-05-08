/**
 * Visit a candidate brand site, extract 3PL-relevant signals, contact info.
 *
 * We deliberately use cheap regex heuristics here (no LLM) — the LLM only
 * comes in at the fit-scoring stage. Keeps a discovery run dirt-cheap.
 */

import { extractEmail, extractSocials } from "@/agents/shopify-finder";
import type { BrandSignals, CandidateBrand } from "./types";
import { fetchText, safeOrigin } from "./web-search";

const CARRIER_PATTERNS: Array<[RegExp, string]> = [
  [/\busps\b/i, "USPS"],
  [/\bups\b/i, "UPS"],
  [/\bfedex\b/i, "FedEx"],
  [/\bdhl\b/i, "DHL"],
  [/\bcanada\s*post\b/i, "Canada Post"],
  [/\broyal\s*mail\b/i, "Royal Mail"],
];

const SELF_FULFILLED_HINTS: Array<[RegExp, string]> = [
  [/ships?\s+from\s+(?:our|the)\s+(?:home|garage|kitchen|studio)/i, "ships from home/studio"],
  [/handmade\s+(?:in|by)/i, "handmade"],
  [/small\s+team/i, "small team"],
  [/pre-?order/i, "preorder model"],
  [/made\s+to\s+order/i, "made-to-order"],
];

const VERTICAL_PATTERNS: Array<[RegExp, string]> = [
  [/(supplements?|vitamins?|nootropics?)/i, "supplements"],
  [/(apparel|clothing|t-?shirts?|hoodies?)/i, "apparel"],
  [/(skin\s*care|beauty|cosmetics?)/i, "beauty"],
  [/(coffee|tea|matcha)/i, "beverage"],
  [/(snacks?|granola|protein\s*bar)/i, "food"],
  [/(pet|dog|cat|puppy)/i, "pet"],
  [/(jewelry|earrings?|necklaces?)/i, "jewelry"],
  [/(fitness|gym|workout|yoga)/i, "fitness"],
  [/(home|kitchen|decor)/i, "home"],
];

export async function inspectBrand(
  url: string,
): Promise<CandidateBrand | null> {
  const origin = safeOrigin(url);
  if (!origin) return null;

  const home = await fetchText(origin);
  if (!home) return null;

  const looksLikeStore =
    /add\s*to\s*cart|add to bag|shop\s*now|view\s*cart|\$\d+\.\d{2}/i.test(home) ||
    /cdn\.shopify\.com|powered by shopify|myshopify\.com/i.test(home);
  if (!looksLikeStore) return null;

  const [contactHtml, shippingHtml, productsJson] = await Promise.all([
    fetchOptional(`${origin}/pages/contact`, `${origin}/contact`),
    fetchOptional(`${origin}/pages/shipping`, `${origin}/policies/shipping-policy`),
    fetchText(`${origin}/products.json?limit=250`),
  ]);

  const merged = `${home}\n${contactHtml ?? ""}\n${shippingHtml ?? ""}`;
  const skuCount = countShopifyProducts(productsJson);
  const reviewCount = sniffReviewCount(home);
  const signals: BrandSignals = {
    skuCount,
    hasShippingPage: Boolean(shippingHtml),
    hasWholesalePage: /\bwholesale\b/i.test(merged),
    freeShippingThreshold: matchFirst(
      merged,
      /free\s+shipping(?:\s+over|\s+on\s+orders?\s+over)?\s*\$?(\d{2,4})/i,
    ),
    shipsInternationally: /international\s+shipping|ships?\s+worldwide/i.test(
      merged,
    ),
    currentCarrier: pickFirst(merged, CARRIER_PATTERNS),
    selfFulfilledHints: collect(merged, SELF_FULFILLED_HINTS),
    reviewCount,
    estMonthlyOrders: estimateMonthlyOrders(reviewCount, skuCount),
    vertical: pickFirst(merged, VERTICAL_PATTERNS),
  };

  const brandName =
    home.match(
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ??
    home.match(/<title[^>]*>([^<|\-]+)/i)?.[1]?.trim() ??
    new URL(origin).hostname;

  return {
    brandName: decodeEntities(brandName).trim().slice(0, 120),
    websiteUrl: origin,
    email: extractEmail(merged),
    socials: extractSocials(merged),
    signals,
    rawSnippet: textSnippet(merged, 1200),
    source: "duckduckgo",
  };
}

async function fetchOptional(
  ...urls: string[]
): Promise<string | null> {
  for (const u of urls) {
    const html = await fetchText(u);
    if (html) return html;
  }
  return null;
}

function countShopifyProducts(json: string | null): number | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as { products?: unknown[] };
    return Array.isArray(parsed.products) ? parsed.products.length : null;
  } catch {
    return null;
  }
}

function sniffReviewCount(html: string): number | null {
  const m =
    html.match(/(\d{1,3}(?:,\d{3})+|\d{2,6})\s+(?:verified\s+)?reviews?/i) ??
    html.match(/based\s+on\s+(\d{2,6})\s+reviews?/i);
  if (!m) return null;
  return Number(m[1].replace(/,/g, ""));
}

function estimateMonthlyOrders(
  reviewCount: number | null,
  skuCount: number | null,
): number | null {
  // Rough heuristic: ~2% of buyers leave a review, brand is ~1yr old.
  // Not science — it's a relative signal we feed to the scorer.
  if (reviewCount && reviewCount > 0) {
    return Math.max(50, Math.round((reviewCount * 50) / 12));
  }
  if (skuCount && skuCount > 0) {
    return Math.min(2000, skuCount * 40);
  }
  return null;
}

function matchFirst(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? m[1] : null;
}

function pickFirst(
  html: string,
  patterns: Array<[RegExp, string]>,
): string | null {
  for (const [re, label] of patterns) if (re.test(html)) return label;
  return null;
}

function collect(html: string, patterns: Array<[RegExp, string]>): string[] {
  const out: string[] = [];
  for (const [re, label] of patterns) if (re.test(html)) out.push(label);
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function textSnippet(html: string, max: number): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
