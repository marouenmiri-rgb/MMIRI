import { askJSON } from "@/lib/claude";
import { brandVoiceBlock, type BrandVoice } from "./brand-voice";
import type { AdScript, ProductFacts } from "./types";

export type PlatformCaptions = {
  tiktok: string;
  instagram: string;
  youtube: string;
  x: string;
};

const SYSTEM = `You adapt a single short-form video ad script into four caption variants,
one per platform. Each platform has a distinct voice — get the voice right or the ad dies in the feed.

TikTok — conversational, lowercase, heavy hook in the first line, 2-3 on-topic hashtags
         at the end. Never "Visit our site". Think UGC, not brand. Max ~180 chars.

Instagram — slightly more polished than TikTok. One tasteful emoji if it earns its spot.
            2-3 hashtags. Short line breaks. Max ~220 chars.

YouTube — short descriptive sentence + one clear CTA to the link in bio / description.
          Designed for Shorts — viewers barely read captions, so lead with the hook.
          Max ~140 chars.

X — punchy one-liner. No hashtags. No emoji. Conversational, quotable. Max 240 chars.

Rules for all four:
- Never invent details not in the script or product.
- Never write "Shop now" generically — be specific to the product.
- No exclamation-mark spam.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tiktok", "instagram", "youtube", "x"],
  properties: {
    tiktok: { type: "string" },
    instagram: { type: "string" },
    youtube: { type: "string" },
    x: { type: "string" },
  },
};

export async function writeCaptions(args: {
  product: Pick<ProductFacts, "title" | "url">;
  script: AdScript;
  brandVoice?: BrandVoice | null;
}): Promise<PlatformCaptions> {
  const voiceBlock = brandVoiceBlock(args.brandVoice);
  const user = `Product: ${args.product.title}
URL: ${args.product.url}

Script:
- Hook: ${args.script.hook}
- Problem: ${args.script.problem}
- Solution: ${args.script.solution}
- CTA: ${args.script.cta}

Full narration: ${args.script.fullScript}${voiceBlock}

Return JSON only with the four captions, matching the schema.`;

  return askJSON<PlatformCaptions>({ system: SYSTEM, user, schema: SCHEMA });
}
