import type { ShopifyStore } from "./types";

const UA =
  "Mozilla/5.0 (compatible; AdGenBot/0.1; +https://adgen.ai)";

/**
 * Find Shopify stores matching a keyword.
 *
 * Pipeline (no paid APIs required):
 *  1. DuckDuckGo HTML search → candidate domains
 *  2. Fetch each candidate → keep only stores with Shopify signals
 *  3. Visit /contact page → extract email + social links
 *
 * Phase 3 upgrades to SerpAPI / Bing Web Search for recall and stability,
 * and pushes fetches into a queue worker to respect rate limits.
 */
export async function findShopifyStores(
  keyword: string,
  opts: { limit?: number } = {},
): Promise<ShopifyStore[]> {
  const limit = opts.limit ?? 10;
  const candidates = await ddgSearch(`"powered by shopify" ${keyword}`, limit * 3);

  const out: ShopifyStore[] = [];
  const seen = new Set<string>();

  for (const url of candidates) {
    if (out.length >= limit) break;
    const origin = safeOrigin(url);
    if (!origin || seen.has(origin)) continue;
    seen.add(origin);

    const store = await inspectStore(origin).catch(() => null);
    if (store) out.push(store);
  }

  return out;
}

async function ddgSearch(query: string, take: number): Promise<string[]> {
  const res = await fetch(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    { headers: { "User-Agent": UA, Accept: "text/html" } },
  );
  if (!res.ok) return [];
  const html = await res.text();

  // DuckDuckGo wraps result URLs in /l/?uddg=<encoded>&... — unwrap them.
  const raw = [
    ...html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/gi),
  ].map((m) => m[1]);

  const urls: string[] = [];
  for (const href of raw) {
    const decoded = unwrapDdg(href);
    if (decoded) urls.push(decoded);
    if (urls.length >= take) break;
  }
  return urls;
}

function unwrapDdg(href: string): string | null {
  try {
    const u = new URL(href, "https://duckduckgo.com");
    const wrapped = u.searchParams.get("uddg");
    if (wrapped) return decodeURIComponent(wrapped);
    return u.protocol.startsWith("http") ? u.toString() : null;
  } catch {
    return null;
  }
}

function safeOrigin(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

async function inspectStore(origin: string): Promise<ShopifyStore | null> {
  const home = await fetchText(origin);
  if (!home || !isShopifyStore(home)) return null;

  const storeName =
    home.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    home.match(/<title[^>]*>([^<|\-]+)/i)?.[1]?.trim() ??
    new URL(origin).hostname;

  const contactHtml =
    (await fetchText(`${origin}/pages/contact`)) ??
    (await fetchText(`${origin}/contact`)) ??
    "";
  const merged = `${home}\n${contactHtml}`;

  return {
    storeName: decodeEntities(storeName).trim().slice(0, 120),
    websiteUrl: origin,
    email: extractEmail(merged) ?? undefined,
    socials: extractSocials(merged),
    source: "duckduckgo",
  };
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function isShopifyStore(html: string): boolean {
  return (
    /cdn\.shopify\.com/i.test(html) ||
    /powered by shopify/i.test(html) ||
    /Shopify\.theme/.test(html) ||
    /myshopify\.com/i.test(html)
  );
}

export function extractEmail(html: string): string | null {
  // Skip obvious tracking / placeholder addresses.
  const deny = /(example|sentry|wixpress|cloudfront|no-?reply|do-?not-?reply|yourstore)/i;
  const matches = html.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  );
  if (!matches) return null;
  for (const raw of matches) {
    if (!deny.test(raw)) return raw.toLowerCase();
  }
  return null;
}

export function extractSocials(html: string): ShopifyStore["socials"] {
  const grab = (re: RegExp): string | undefined => {
    const m = html.match(re);
    return m ? m[0] : undefined;
  };
  return {
    twitter: grab(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]{1,30}/i),
    instagram: grab(/https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]{1,40}/i),
    facebook: grab(/https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9.\-_]{1,60}/i),
  };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}
