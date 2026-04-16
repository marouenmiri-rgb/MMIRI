import type { ShopifyStore } from "./types";

/**
 * MVP stub. Phase 3 wires this to:
 *   - SERP API (Google/Bing) for niche keyword
 *   - Page fetch + Shopify detection (`cdn.shopify.com`, "Powered by Shopify")
 *   - Contact page extractor (email + socials)
 * Returns a shaped-but-empty result so the UI flow works end-to-end.
 */
export async function findShopifyStores(
  keyword: string,
): Promise<ShopifyStore[]> {
  void keyword;
  return [];
}

export function isShopifyStore(html: string): boolean {
  return (
    /cdn\.shopify\.com/i.test(html) ||
    /powered by shopify/i.test(html) ||
    /Shopify\.theme/i.test(html)
  );
}
