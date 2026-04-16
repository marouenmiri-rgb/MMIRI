import { describe, expect, it } from "vitest";
import {
  extractEmail,
  extractSocials,
  isShopifyStore,
} from "@/agents/shopify-finder";

describe("isShopifyStore", () => {
  it("detects cdn.shopify.com asset hosts", () => {
    expect(
      isShopifyStore(`<script src="https://cdn.shopify.com/s/files/..."></script>`),
    ).toBe(true);
  });

  it('detects "Powered by Shopify" footer', () => {
    expect(isShopifyStore(`<p>Powered by Shopify</p>`)).toBe(true);
  });

  it("detects myshopify.com domains", () => {
    expect(isShopifyStore(`<link rel="canonical" href="https://foo.myshopify.com/">`)).toBe(
      true,
    );
  });

  it("rejects non-Shopify pages", () => {
    expect(isShopifyStore(`<html><body>Just some text</body></html>`)).toBe(false);
  });
});

describe("extractEmail", () => {
  it("picks the first legit email", () => {
    expect(extractEmail("Contact us at hello@highlandpine.co for info")).toBe(
      "hello@highlandpine.co",
    );
  });

  it("ignores placeholder / tracking addresses", () => {
    const html = `
      <img src="https://sentry.io/tracking.gif?e=user@sentry.wixpress.com">
      noreply@example.com
      real@brand.co
    `;
    expect(extractEmail(html)).toBe("real@brand.co");
  });

  it("returns null when nothing matches", () => {
    expect(extractEmail("no email here")).toBeNull();
  });
});

describe("extractSocials", () => {
  it("pulls twitter / instagram / facebook URLs", () => {
    const html = `
      <a href="https://twitter.com/brand_x">X</a>
      <a href="https://www.instagram.com/brand.x">IG</a>
      <a href="https://facebook.com/brandx">FB</a>
    `;
    const s = extractSocials(html);
    expect(s.twitter).toBe("https://twitter.com/brand_x");
    expect(s.instagram).toBe("https://www.instagram.com/brand.x");
    expect(s.facebook).toBe("https://facebook.com/brandx");
  });

  it("leaves missing fields undefined", () => {
    expect(extractSocials("no socials here")).toEqual({
      twitter: undefined,
      instagram: undefined,
      facebook: undefined,
    });
  });
});
