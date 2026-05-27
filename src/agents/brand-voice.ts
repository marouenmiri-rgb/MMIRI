import { askJSON } from "@/lib/claude";

export type BrandVoice = {
  name?: string;
  tone: string;          // "playful, irreverent, plainspoken" etc.
  audience: string;      // "first-time skincare buyers", "indie coffee drinkers"
  dos: string[];         // 3-6 short voice rules
  donts: string[];       // 3-6 short voice anti-rules
  examples: { context: string; copy: string }[]; // 2-3 lines in this voice
};

const SYSTEM = `You are a brand strategist. Given a sample of a brand's existing
copy (product pages, social bios, captions), you distill the brand's voice into
a tight playbook other writers can use.

Output a JSON object with:
- tone: a short comma-separated list of 3-5 adjectives ("plain-spoken, dry, confident")
- audience: a one-line description of the implied reader
- dos: 4-6 short imperative rules (~6 words each) — what TO do
- donts: 3-5 short imperative anti-rules — what NOT to do
- examples: 2-3 short sample lines as if written by this brand for a new product

Rules:
- Never invent product claims. Only generalize patterns of voice.
- 'dos' should be specific enough to influence word choice
  ("use second person", "drop the articles 'a' and 'the' when possible")
- Keep total output under 500 tokens.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tone", "audience", "dos", "donts", "examples"],
  properties: {
    name: { type: "string" },
    tone: { type: "string" },
    audience: { type: "string" },
    dos: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: { type: "string" },
    },
    donts: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: { type: "string" },
    },
    examples: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["context", "copy"],
        properties: {
          context: { type: "string" },
          copy: { type: "string" },
        },
      },
    },
  },
};

export async function extractBrandVoice(args: {
  sourceUrl?: string;
  rawCopy: string;
  hintedName?: string;
}): Promise<BrandVoice> {
  const user = `Here is a sample of a brand's existing copy.
${args.hintedName ? `Brand name (hint): ${args.hintedName}\n` : ""}${args.sourceUrl ? `Source: ${args.sourceUrl}\n` : ""}
---
${args.rawCopy.slice(0, 12_000)}
---

Distill the brand voice. Return JSON only.`;

  return askJSON<BrandVoice>({ system: SYSTEM, user, schema: SCHEMA });
}

/**
 * Returns a compact string a calling agent can paste into its system
 * prompt — keeps the cached prefix stable and the variable suffix small.
 *
 * Returns "" when no voice is set so callers can unconditionally
 * concatenate without conditional template gymnastics.
 */
export function brandVoiceBlock(voice: BrandVoice | null | undefined): string {
  if (!voice) return "";
  const dos = voice.dos.map((d) => `  · ${d}`).join("\n");
  const donts = voice.donts.map((d) => `  · ${d}`).join("\n");
  return `\n\n--- Brand voice ---
Tone: ${voice.tone}
Audience: ${voice.audience}
Do:
${dos}
Don't:
${donts}
Write as if you wrote these lines yourself:
${voice.examples.map((e) => `  · "${e.copy}"`).join("\n")}
--- end brand voice ---`;
}
