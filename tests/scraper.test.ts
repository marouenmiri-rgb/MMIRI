import { afterEach, describe, expect, it, vi } from "vitest";

// The scraper routes every request through the SSRF guard, which resolves the
// hostname for real. These fixtures use invented domains, so DNS is stubbed to
// answer with a public address — the guard itself is covered in
// tests/safe-fetch.test.ts.
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

import { cleanImages, scrapeProduct } from "@/agents/scraper";

const OG_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <title>Ember Travel Mug 2 &ndash; Ember</title>
    <meta property="og:title" content="Ember Travel Mug 2">
    <meta property="og:description" content="Hot coffee, on the go, for hours.">
    <meta property="og:image" content="https://cdn.shopify.com/s/files/mug-hero.jpg">
    <meta property="product:price:amount" content="199.95">
  </head>
  <body>
    <img src="https://cdn.shopify.com/s/files/site-logo.png">
    <img src="https://cdn.shopify.com/s/files/mug-side.jpg">
    <img src="https://cdn.shopify.com/s/files/mug-top.png">
    <img src="https://cdn.shopify.com/s/files/visa-badge.png">
  </body>
</html>
`;

const JSONLD_HTML = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "BreadcrumbList", "itemListElement": [] },
    {
      "@type": "Product",
      "name": "Copper Pour-Over Kettle",
      "description": "<p>Gooseneck spout for <b>total</b> control.</p>",
      "image": [
        "https://cdn.example.com/kettle-1.jpg",
        { "url": "https://cdn.example.com/kettle-2.jpg" }
      ],
      "offers": { "@type": "Offer", "price": "89.00" }
    }
  ]
}
</script>
</head><body></body></html>
`;

/** Answers the Shopify .js probe with 404 so other paths are exercised. */
function htmlOnly(html: string) {
  return vi.fn(async (input: string | URL) => {
    const url = String(input);
    if (url.endsWith(".js")) return new Response("not found", { status: 404 });
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cleanImages", () => {
  it("drops logos, payment badges, icons and svgs", () => {
    const out = cleanImages([
      "https://x.com/product-front.jpg",
      "https://x.com/site-logo.png",
      "https://x.com/visa.png",
      "https://x.com/icon-cart.svg",
      "https://x.com/product-back.jpg",
      "https://x.com/tracking-pixel.png",
    ]);
    expect(out).toEqual([
      "https://x.com/product-front.jpg",
      "https://x.com/product-back.jpg",
    ]);
  });

  it("drops small thumbnails but keeps large sized variants", () => {
    const out = cleanImages([
      "https://cdn.shopify.com/files/mug_120x.jpg",
      "https://cdn.shopify.com/files/mug_1200x.jpg",
    ]);
    expect(out).toEqual(["https://cdn.shopify.com/files/mug_1200x.jpg"]);
  });

  it("treats the same asset at two sizes as one image", () => {
    const out = cleanImages([
      "https://cdn.example.com/a.jpg?width=800",
      "https://cdn.example.com/a.jpg?width=1600",
      "https://cdn.example.com/b.jpg",
    ]);
    expect(out).toEqual([
      "https://cdn.example.com/a.jpg?width=800",
      "https://cdn.example.com/b.jpg",
    ]);
  });

  it("rejects relative and non-http sources", () => {
    expect(cleanImages(["/local.jpg", "data:image/png;base64,AAA", ""])).toEqual(
      [],
    );
  });
});

describe("scrapeProduct", () => {
  it("prefers Shopify's product JSON when the store serves it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.endsWith(".js")) {
          return new Response(
            JSON.stringify({
              title: "Ember Travel Mug 2",
              body_html: "<p>Hot coffee, <b>on the go</b>.</p>",
              images: [
                "//cdn.shopify.com/s/files/mug-1.jpg",
                "//cdn.shopify.com/s/files/mug-2.jpg",
              ],
              variants: [{ price: "19995" }],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        throw new Error("should not fall through to HTML");
      }),
    );

    const p = await scrapeProduct("https://ember.com/products/mug-2");
    expect(p.title).toBe("Ember Travel Mug 2");
    expect(p.description).toBe("Hot coffee, on the go.");
    // Cents are converted, and protocol-relative URLs are made absolute.
    expect(p.price).toBe("199.95");
    expect(p.images[0]).toBe("https://cdn.shopify.com/s/files/mug-1.jpg");
    expect(p.images).toHaveLength(2);
  });

  it("falls back to JSON-LD and unwraps @graph plus image objects", async () => {
    vi.stubGlobal("fetch", htmlOnly(JSONLD_HTML));

    const p = await scrapeProduct("https://shop.example.com/products/kettle");
    expect(p.title).toBe("Copper Pour-Over Kettle");
    expect(p.description).toBe("Gooseneck spout for total control.");
    expect(p.price).toBe("89.00");
    expect(p.images).toEqual([
      "https://cdn.example.com/kettle-1.jpg",
      "https://cdn.example.com/kettle-2.jpg",
    ]);
  });

  it("falls back to OpenGraph, and leaves logos and badges out", async () => {
    vi.stubGlobal("fetch", htmlOnly(OG_HTML));

    const p = await scrapeProduct("https://ember.com/products/mug-2");
    expect(p.title).toBe("Ember Travel Mug 2");
    expect(p.price).toBe("199.95");
    expect(p.images).toEqual([
      "https://cdn.shopify.com/s/files/mug-hero.jpg",
      "https://cdn.shopify.com/s/files/mug-side.jpg",
      "https://cdn.shopify.com/s/files/mug-top.png",
    ]);
  });

  it("throws when the page itself is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 503 })),
    );
    await expect(scrapeProduct("https://x.com/p/1")).rejects.toThrow(/503/);
  });
});
