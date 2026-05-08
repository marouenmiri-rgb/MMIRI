import { askJSON } from "@/lib/claude";
import { hasClaude } from "@/lib/env";
import type { ThreePLNicheQueries } from "./types";

const SYSTEM = `You build search queries that surface direct-to-consumer
e-commerce brands likely to need third-party logistics (3PL) fulfillment.

Good queries combine:
- a niche descriptor ("organic dog food", "pickleball paddles")
- a Shopify or DTC signal ("powered by shopify", "buy online", "free shipping")
- an outsourcing signal where natural ("ships from", "fulfillment partner")

Return 5-8 unique queries and 3-6 specific verticals/sub-niches that fit.
No quoted operators inside the JSON values — bare strings only.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["niche", "queries", "verticals"],
  properties: {
    niche: { type: "string" },
    queries: {
      type: "array",
      minItems: 3,
      maxItems: 10,
      items: { type: "string" },
    },
    verticals: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "string" },
    },
  },
};

export async function expandNiche(niche: string): Promise<ThreePLNicheQueries> {
  if (!hasClaude) return fallback(niche);
  try {
    return await askJSON<ThreePLNicheQueries>({
      system: SYSTEM,
      user: `Niche: ${niche}\n\nReturn JSON only.`,
      schema: SCHEMA,
      maxTokens: 800,
    });
  } catch {
    return fallback(niche);
  }
}

function fallback(niche: string): ThreePLNicheQueries {
  const n = niche.trim();
  return {
    niche: n,
    queries: [
      `"powered by shopify" ${n}`,
      `${n} brand free shipping`,
      `buy ${n} online ships from usa`,
      `${n} subscription box`,
      `${n} dtc brand`,
    ],
    verticals: [n],
  };
}
