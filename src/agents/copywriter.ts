import { askJSON } from "@/lib/claude";
import { brandVoiceBlock, type BrandVoice } from "./brand-voice";
import type { AdScript, ProductFacts } from "./types";
import { AD_FORMATS, DEFAULT_FORMAT, type AdFormat } from "./formats";

const SYSTEM = `You are a direct-response copywriter who has written TikTok,
Instagram Reels, and YouTube Shorts ads that have done $100M+ in revenue.

Your job: turn product facts into a vertical video ad script of the length
the brief asks for. Use the classic hook → problem → solution → CTA structure.

At longer lengths do not pad — earn the extra seconds. Add a specific proof
point, handle the objection a buyer would actually raise, or name a second
concrete use. Repeating the same claim in new words is worse than a short ad.

Rules:
- Hook must be in the first 1.5 seconds. Pattern interrupt, strong contrast, or a punchy question.
- Speak directly to the viewer ("you"). No passive voice. No marketing fluff.
- Problem is relatable and specific. Solution ties back to the product's actual feature.
- CTA is concrete and urgent.
- Match the word count in the brief. That is what sets the runtime.

If the user provides a hook hint, treat it as a required pattern: instantiate
the formula with the actual product facts, keep it tight (≤14 words), and
make sure the rest of the script flows out of that hook naturally.

If the user provides a brand voice playbook (Tone / Audience / Do / Don't),
treat it as the most-important constraint: word choice, rhythm, and stance
must match. The voice playbook overrides generic copywriting instincts.`;

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
  opts: {
    hookHint?: string;
    brandVoice?: BrandVoice | null;
    format?: AdFormat;
  } = {},
): Promise<AdScript> {
  const fmt = AD_FORMATS[opts.format ?? DEFAULT_FORMAT];
  const voiceBlock = brandVoiceBlock(opts.brandVoice);
  const user = `Write a vertical video ad script for this product.

Target runtime: ${fmt.seconds} seconds.
Write about ${fmt.words} words of narration — that is what produces that runtime.

Title: ${product.title}
${product.price ? `Price: ${product.price}\n` : ""}Description: ${product.description}
URL: ${product.url}
${opts.hookHint ? `\nHook pattern to use (instantiate with the product's facts): "${opts.hookHint}"` : ""}${voiceBlock}

Return JSON only, matching the schema.`;

  return askJSON<AdScript>({ system: SYSTEM, user, schema: SCHEMA, role: "copy" });
}
