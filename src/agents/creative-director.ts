import { askJSON } from "@/lib/claude";
import type { AdScript, ProductFacts, SceneBreakdown } from "./types";
import { AD_FORMATS, DEFAULT_FORMAT, type AdFormat } from "./formats";

const SYSTEM = `You are a creative director for short-form video ads (TikTok / Reels / Shorts).
You take a written script and a set of product images, and you decide the exact
shot list: which image goes with which line, how long each scene lasts, and
what transition to use.

Keep it moving: no scene longer than 5 seconds, and most should be 2–4. If
there are fewer images than scenes, reuse them — but never place the same
image in two neighbouring scenes, and prefer a different framing each time
("wide", "detail", "angled") so a repeat reads as a new shot.

Every scene gets fx "kenburns" unless a hard cut genuinely serves the beat.
A still image held without motion looks like a slideshow.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["style", "scenes"],
  properties: {
    style: { type: "string" },
    scenes: {
      type: "array",
      minItems: 4,
      maxItems: 18,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "imageRef", "durationSec"],
        properties: {
          text: { type: "string" },
          imageRef: { type: "string" },
          durationSec: { type: "number" },
          fx: { type: "string", enum: ["kenburns", "cut", "fade"] },
          framing: { type: "string", enum: ["wide", "detail", "angled"] },
        },
      },
    },
  },
};

export async function directScenes(
  product: ProductFacts,
  script: AdScript,
  format: AdFormat = DEFAULT_FORMAT,
): Promise<SceneBreakdown> {
  const fmt = AD_FORMATS[format];
  const user = `Break this ad into ${fmt.minScenes}–${fmt.maxScenes} scenes.

The durations must add up to about ${fmt.seconds} seconds.
There are ${product.images.length} image(s) available for ${fmt.minScenes}+ scenes,
so plan to reuse them with different framing rather than holding one still.

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

  return askJSON<SceneBreakdown>({ system: SYSTEM, user, schema: SCHEMA, role: "plan" });
}
