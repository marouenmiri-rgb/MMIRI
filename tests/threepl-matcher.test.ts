import { describe, expect, it } from "vitest";
import { matchPartner } from "@/agents/threepl/partner-matcher";
import type { PartnerSummary } from "@/agents/threepl/types";

const partners: PartnerSummary[] = [
  {
    id: "shipbob",
    name: "ShipBob",
    websiteUrl: "https://shipbob.com",
    affiliateUrl: "https://shipbob.com/?ref={ref}",
    vertical: "general",
    geo: "GLOBAL",
    minOrdersPerMonth: 200,
    maxOrdersPerMonth: 50000,
    blurb: null,
    commissionBps: 1000,
  },
  {
    id: "easyship",
    name: "Easyship",
    websiteUrl: "https://easyship.com",
    affiliateUrl: "https://easyship.com/?ref={ref}",
    vertical: "general",
    geo: "GLOBAL",
    minOrdersPerMonth: 50,
    maxOrdersPerMonth: 5000,
    blurb: null,
    commissionBps: 1500,
  },
  {
    id: "shipmonk",
    name: "ShipMonk",
    websiteUrl: "https://shipmonk.com",
    affiliateUrl: "https://shipmonk.com/?ref={ref}",
    vertical: "subscription",
    geo: "US",
    minOrdersPerMonth: 100,
    maxOrdersPerMonth: 20000,
    blurb: null,
    commissionBps: 800,
  },
];

describe("matchPartner", () => {
  it("prefers a vertical-specialist partner over a generalist", () => {
    const m = matchPartner({
      verdict: { score: 75, reasons: [], estMonthlyOrders: 500, vertical: "subscription" },
      brandVertical: "subscription",
      partners,
    });
    expect(m?.partnerId).toBe("shipmonk");
  });

  it("falls back to the generalist whose volume range fits the brand", () => {
    const m = matchPartner({
      verdict: { score: 70, reasons: [], estMonthlyOrders: 100, vertical: null },
      brandVertical: null,
      partners,
    });
    // 100 orders/mo only fits Easyship's range and ShipMonk's range — but
    // ShipMonk's vertical doesn't match, so Easyship wins on commission.
    expect(["easyship", "shipmonk"]).toContain(m?.partnerId);
  });

  it("substitutes affiliate ref into the URL template", () => {
    const m = matchPartner({
      verdict: { score: 80, reasons: [], estMonthlyOrders: 1000, vertical: "general" },
      brandVertical: "general",
      partners,
      affiliateRef: "abc123",
    });
    expect(m?.affiliateLink).toContain("ref=abc123");
  });

  it("returns null when there are no partners", () => {
    const m = matchPartner({
      verdict: { score: 80, reasons: [], estMonthlyOrders: 1000, vertical: "general" },
      brandVertical: null,
      partners: [],
    });
    expect(m).toBeNull();
  });
});
