import { afterEach, describe, expect, it, vi } from "vitest";
import { scrapeProduct } from "@/agents/scraper";

const SAMPLE_HTML = `
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
    <img src="https://cdn.shopify.com/s/files/mug-side.jpg">
    <img src="https://cdn.shopify.com/s/files/mug-top.png">
  </body>
</html>
`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("scrapeProduct", () => {
  it("parses OG metadata, price, and dedupes images", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(SAMPLE_HTML, {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );

    const product = await scrapeProduct("https://ember.com/products/mug-2");
    expect(product.title).toBe("Ember Travel Mug 2");
    expect(product.description).toBe("Hot coffee, on the go, for hours.");
    expect(product.price).toBe("199.95");
    expect(product.images.length).toBeGreaterThanOrEqual(2);
    expect(new Set(product.images).size).toBe(product.images.length);
  });

  it("throws when the response is non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 503 })),
    );
    await expect(scrapeProduct("https://x.com/p/1")).rejects.toThrow(/503/);
  });
});
