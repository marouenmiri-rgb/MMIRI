import type { ProductFacts } from "./types";

/**
 * Minimal HTML-based product scraper. Works for most Shopify/Amazon product
 * pages without headless browser. Phase 1 replaces this with Playwright.
 */
export async function scrapeProduct(url: string): Promise<ProductFacts> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AdGenBot/0.1; +https://adgen.ai)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Scrape failed (${res.status}) for ${url}`);
  const html = await res.text();

  const meta = (prop: string) =>
    html.match(
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    )?.[1];

  const title =
    meta("og:title") ??
    meta("twitter:title") ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ??
    "Untitled product";

  const description =
    meta("og:description") ??
    meta("description") ??
    meta("twitter:description") ??
    "";

  const ogImages = [...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter(Boolean);

  const productImages = [...html.matchAll(/https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/gi)]
    .map((m) => m[0])
    .slice(0, 20);

  const images = Array.from(new Set([...ogImages, ...productImages])).slice(0, 8);

  const price =
    meta("product:price:amount") ??
    html.match(/"price"\s*:\s*"?([\d,.]+)/i)?.[1];

  return {
    title: decodeEntities(title).trim(),
    description: decodeEntities(description).trim(),
    price: price ? `${price}` : undefined,
    images,
    reviews: [],
    url,
  };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
