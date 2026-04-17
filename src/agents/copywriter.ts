import { askJSON } from "@/lib/claude";
import type { AdScript, ProductFacts } from "./types";

const SYSTEM = `You are a direct-response copywriter who has written TikTok,
Instagram Reels, and YouTube Shorts ads that have done $100M+ in revenue.

Your job: turn product facts into a 25–40 second vertical video ad script.
Use the classic hook → problem → solution → CTA structure.

Rules:
- Hook must be in the first 1.5 seconds. Pattern interrupt, strong contrast, or a punchy question.
- Speak directly to the viewer ("you"). No passive voice. No marketing fluff.
- Problem is relatable and specific. Solution ties back to the product's actual feature.
- CTA is concrete and urgent.
- Total fullScript should be ~80–110 words, spoken at a natural pace.

If the user provides a hook hint, treat it as a required pattern: instantiate
the formula with the actual product facts, keep it tight (≤14 words), and
make sure the rest of the script flows out of that hook naturally.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["hook", "problem", "solution", "cta", "fullScript"],
  properties: {
    hook: { type: "string" },
    problem: { type: "string" },
    solution: { type: "string" },
    cta: { type: "string" },
    fullScript: { type: "string" },
  },
};

export async function writeAdScript(
  product: ProductFacts,
  opts: { hookHint?: string } = {},
): Promise<AdScript> {
  const user = `Write a short-form video ad script for this product.

Title: ${product.title}
${product.price ? `Price: ${product.price}\n` : ""}Description: ${product.description}
URL: ${product.url}
${opts.hookHint ? `\nHook pattern to use (instantiate with the product's facts): "${opts.hookHint}"` : ""}

Return JSON only, matching the schema.`;

  return askJSON<AdScript>({ system: SYSTEM, user, schema: SCHEMA });
}
