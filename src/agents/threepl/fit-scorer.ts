import { askJSON } from "@/lib/claude";
import { hasClaude } from "@/lib/env";
import type { CandidateBrand, FitVerdict } from "./types";

const SYSTEM = `You score how good a fit a DTC e-commerce brand is for
outsourcing fulfillment to a third-party-logistics (3PL) warehouse.

Score 0-100. A high-fit brand has these traits:
- Self-fulfilling today, but volume is starting to hurt (50+ orders/month)
- Has SKUs that ship in standard parcels (not freight, not fragile bespoke)
- Has a real shipping policy and is shipping nationally or internationally
- Talks about delays, OOS, "small team" — pain signals worth quoting back

Low-fit signals: handmade-to-order, freight-only, services not products,
already mentions a known 3PL ("ShipBob", "ShipMonk", "ShipHero", "Easyship",
"Deliverr", "Flexport"), or essentially zero traction.

Be specific in reasons — quote a phrase or signal, don't generalize.
Provide an order-volume estimate only if the signals justify one.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["score", "reasons", "estMonthlyOrders", "vertical"],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    reasons: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
    estMonthlyOrders: { type: ["integer", "null"], minimum: 0 },
    vertical: { type: ["string", "null"] },
  },
};

export async function scoreBrandFit(
  brand: CandidateBrand,
): Promise<FitVerdict> {
  if (!hasClaude) return heuristic(brand);
  try {
    return await askJSON<FitVerdict>({
      system: SYSTEM,
      user: buildUserPrompt(brand),
      schema: SCHEMA,
      maxTokens: 700,
    });
  } catch {
    return heuristic(brand);
  }
}

function buildUserPrompt(brand: CandidateBrand): string {
  const s = brand.signals;
  return [
    `Brand: ${brand.brandName}`,
    `URL: ${brand.websiteUrl}`,
    `Vertical guess: ${s.vertical ?? "unknown"}`,
    `SKU count: ${s.skuCount ?? "unknown"}`,
    `Review count: ${s.reviewCount ?? "unknown"}`,
    `Est. monthly orders (heuristic): ${s.estMonthlyOrders ?? "unknown"}`,
    `Has shipping page: ${s.hasShippingPage}`,
    `Has wholesale page: ${s.hasWholesalePage}`,
    `Free-shipping threshold: ${s.freeShippingThreshold ?? "none"}`,
    `International shipping: ${s.shipsInternationally}`,
    `Current carrier seen: ${s.currentCarrier ?? "none"}`,
    `Self-fulfilled hints: ${s.selfFulfilledHints.join(", ") || "none"}`,
    "",
    "Site snippet (truncated, plain text):",
    brand.rawSnippet,
    "",
    "Return JSON only.",
  ].join("\n");
}

function heuristic(brand: CandidateBrand): FitVerdict {
  const s = brand.signals;
  let score = 30;
  const reasons: string[] = [];
  if (s.skuCount && s.skuCount >= 10) {
    score += 15;
    reasons.push(`${s.skuCount} SKUs in catalog`);
  }
  if (s.hasShippingPage) {
    score += 10;
    reasons.push("dedicated shipping policy");
  }
  if (s.estMonthlyOrders && s.estMonthlyOrders >= 200) {
    score += 20;
    reasons.push(`~${s.estMonthlyOrders} est. orders/mo from review velocity`);
  } else if (s.estMonthlyOrders && s.estMonthlyOrders >= 50) {
    score += 10;
    reasons.push(`~${s.estMonthlyOrders} est. orders/mo`);
  }
  if (s.shipsInternationally) {
    score += 5;
    reasons.push("ships internationally");
  }
  if (s.selfFulfilledHints.length > 0) {
    score -= 15;
    reasons.push(`self-fulfilled signals: ${s.selfFulfilledHints.join(", ")}`);
  }
  if (
    /shipbob|shipmonk|shiphero|easyship|deliverr|flexport/i.test(brand.rawSnippet)
  ) {
    score -= 25;
    reasons.push("already mentions a known 3PL");
  }
  return {
    score: Math.max(0, Math.min(100, score)),
    reasons: reasons.length ? reasons : ["limited signal — rough heuristic"],
    estMonthlyOrders: s.estMonthlyOrders,
    vertical: s.vertical,
  };
}
