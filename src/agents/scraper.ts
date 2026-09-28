import type { ProductFacts } from "./types";

const UA = "Mozilla/5.0 (compatible; AdGenBot/0.1; +https://adgen.ai)";

/**
 * Reads the facts an ad needs off a product page.
 *
 * Three sources, best first, because the images are what the video is made of
 * and a bad set of images is a bad video no matter how good the script is:
 *
 *   1. Shopify's own product JSON (`<product-url>.js`). Every Shopify store
 *      serves it, and it gives the real gallery, title, description and price
 *      with no guessing.
 *   2. JSON-LD Product schema, which most other decent platforms emit.
 *   3. OpenGraph and regex over the HTML, as a last resort.
 *
 * Whatever the source, images are filtered before use — a naive sweep for
 * image URLs pulls in logos, payment badges and tracking pixels, and those
 * would end up on screen as if they were the product.
 */
export async function scrapeProduct(url: string): Promise<ProductFacts> {
  const fromShopify = await tryShopifyJson(url);
  if (fromShopify) return fromShopify;

  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`Scrape failed (${res.status}) for ${url}`);
  const html = await res.text();

  return fromJsonLd(html, url) ?? fromHtml(html, url);
}

/* ------------------------------------------------------------------ *
 * 1. Shopify product JSON
 * ------------------------------------------------------------------ */

type ShopifyProduct = {
  title?: string;
  body_html?: string;
  images?: string[];
  variants?: { price?: string }[];
};

async function tryShopifyJson(url: string): Promise<ProductFacts | null> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return null;
  }
  // Only meaningful on a Shopify product path; anything else 404s or returns
  // a page, and we shouldn't spend a request on it.
  if (!/\/products\/[^/]+/.test(target.pathname)) return null;

  const jsonUrl = `${target.origin}${target.pathname.replace(/\/$/, "")}.js`;

  try {
    const res = await fetch(jsonUrl, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    if (!res.headers.get("content-type")?.includes("json")) return null;

    const p = (await res.json()) as ShopifyProduct;
    if (!p?.title) return null;

    const images = cleanImages((p.images ?? []).map(absolutize(target.origin)));
    if (images.length === 0) return null;

    // Shopify prices come through in cents.
    const raw = p.variants?.[0]?.price;
    const price = raw ? formatShopifyPrice(raw) : undefined;

    return {
      title: decodeEntities(p.title).trim(),
      description: stripHtml(p.body_html ?? "").slice(0, 1200),
      price,
      images,
      reviews: [],
      url,
    };
  } catch {
    return null;
  }
}

/** Shopify serves "1999" for $19.99, but some themes already send "19.99". */
function formatShopifyPrice(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return raw.includes(".") ? raw : (n / 100).toFixed(2);
}

/** Shopify image URLs often start "//cdn.shopify.com/…". */
function absolutize(origin: string) {
  return (src: string) => {
    if (src.startsWith("//")) return `https:${src}`;
    if (src.startsWith("/")) return `${origin}${src}`;
    return src;
  };
}

/* ------------------------------------------------------------------ *
 * 2. JSON-LD Product schema
 * ------------------------------------------------------------------ */

function fromJsonLd(html: string, url: string): ProductFacts | null {
  const blocks = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];

  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1]!.trim());
    } catch {
      continue;
    }

    // A page may ship an array, or a @graph, or a bare object.
    const candidates: Record<string, unknown>[] = [];
    const push = (v: unknown) => {
      if (v && typeof v === "object") candidates.push(v as Record<string, unknown>);
    };
    if (Array.isArray(parsed)) parsed.forEach(push);
    else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      push(obj);
      if (Array.isArray(obj["@graph"])) obj["@graph"].forEach(push);
    }

    for (const node of candidates) {
      const type = node["@type"];
      const isProduct = Array.isArray(type)
        ? type.includes("Product")
        : type === "Product";
      if (!isProduct) continue;

      const title = typeof node.name === "string" ? node.name : "";
      if (!title) continue;

      const rawImages = Array.isArray(node.image)
        ? node.image
        : node.image
          ? [node.image]
          : [];
      const images = cleanImages(
        rawImages
          .map((i) =>
            typeof i === "string"
              ? i
              : ((i as Record<string, unknown>)?.url as string | undefined) ?? "",
          )
          .filter(Boolean),
      );
      if (images.length === 0) continue;

      const offers = node.offers as Record<string, unknown> | undefined;
      const price =
        typeof offers?.price === "string" || typeof offers?.price === "number"
          ? String(offers.price)
          : undefined;

      return {
        title: decodeEntities(title).trim(),
        description: stripHtml(
          typeof node.description === "string" ? node.description : "",
        ).slice(0, 1200),
        price,
        images,
        reviews: [],
        url,
      };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * 3. OpenGraph / regex
 * ------------------------------------------------------------------ */

function fromHtml(html: string, url: string): ProductFacts {
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

  const ogImages = [
    ...html.matchAll(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
    ),
  ]
    .map((m) => m[1]!)
    .filter(Boolean);

  // Prefer images the page put in an <img>, which are far more likely to be
  // the product than an arbitrary URL found anywhere in the markup.
  const imgTagSrcs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
    .map((m) => m[1]!)
    .filter(Boolean);

  const origin = safeOrigin(url);
  const images = cleanImages(
    [...ogImages, ...imgTagSrcs].map(absolutize(origin)),
  );

  const price =
    meta("product:price:amount") ?? html.match(/"price"\s*:\s*"?([\d,.]+)/i)?.[1];

  return {
    title: decodeEntities(title).trim(),
    description: decodeEntities(description).trim(),
    price: price ? `${price}` : undefined,
    images,
    reviews: [],
    url,
  };
}

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ *
 * Shared
 * ------------------------------------------------------------------ */

/** Substrings that almost never appear in a product photograph's URL. */
const JUNK = [
  "logo",
  "favicon",
  "sprite",
  "icon",
  "badge",
  "payment",
  "trustpilot",
  "klarna",
  "afterpay",
  "paypal",
  "visa",
  "mastercard",
  "placeholder",
  "loading",
  "spinner",
  "pixel",
  "tracking",
  "banner",
  "avatar",
  "flag",
  "/cart",
  "no-image",
];

/**
 * Keeps plausible product photographs, in the order the page offered them,
 * without duplicates. Filtering matters more than fetching: a logo or a Visa
 * badge rendered full-screen for three seconds ruins the whole video.
 */
export function cleanImages(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of urls) {
    if (!raw) continue;
    const url = raw.trim();
    if (!/^https?:\/\//i.test(url)) continue;

    const lower = url.toLowerCase();
    if (lower.endsWith(".svg") || lower.includes(".svg?")) continue;
    if (lower.includes(".gif")) continue;
    if (JUNK.some((j) => lower.includes(j))) continue;

    // Drop obvious thumbnails: Shopify and friends encode size in the URL.
    const size = lower.match(/[_-](\d{2,4})x(?:\d{2,4})?\./);
    if (size && Number(size[1]) < 400) continue;

    // Strip the query so the same asset at two sizes counts once.
    const key = url.split("?")[0]!;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
    if (out.length >= 8) break;
  }
  return out;
}

function stripHtml(s: string): string {
  return decodeEntities(
    s
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h\d)>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ");
}
