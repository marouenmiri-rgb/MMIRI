import { askJSON } from "@/lib/claude";
import type { AdScript, ProductFacts, SceneBreakdown } from "./types";

const SYSTEM = `You are a creative director for short-form video ads (TikTok / Reels / Shorts).
You take a written script and a set of product images, and you decide the exact
shot list: which image goes with which line, how long each scene lasts, and
what transition to use. You keep things punchy — no scene longer than 3 seconds.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["style", "scenes"],
  properties: {
    style: { type: "string" },
    scenes: {
      type: "array",
      minItems: 4,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "imageRef", "durationSec"],
        properties: {
          text: { type: "string" },
          imageRef: { type: "string" },
          durationSec: { type: "number" },
          fx: { type: "string", enum: ["kenburns", "cut", "fade"] },
        },
      },
    },
  },
};

export async function directScenes(
  product: ProductFacts,
  script: AdScript,
): Promise<SceneBreakdown> {
  const user = `Break this ad into 4–8 scenes.

Product: ${product.title}
Available image URLs (use their index as imageRef, e.g. "image:0"):
${product.images.map((u, i) => `  ${i}. ${u}`).join("\n")}

Script:
- Hook: ${script.hook}
- Problem: ${script.problem}
- Solution: ${script.solution}
- CTA: ${script.cta}

Full narration: ${script.fullScript}

Return JSON only.`;

  return askJSON<SceneBreakdown>({ system: SYSTEM, user, schema: SCHEMA });
}
