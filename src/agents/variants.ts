import { askJSON } from "@/lib/claude";
import type { AdScript, ProductFacts } from "./types";

export type HookVariant = {
  label: string;           // short name for UI (e.g. "Pattern interrupt")
  angle: string;           // psychological angle in one line
  hook: string;            // the new first-line hook
  fullScript: string;      // full ~80-110 word rewrite with the new hook
};

const SYSTEM = `You run hook A/B tests for short-form video ads.

Given a product + an existing winning script, generate THREE distinct hook
variants designed to appeal to three non-overlapping psychological angles.
Each variant keeps the same product facts and roughly the same length, but
swaps the first 1-2 seconds of dialogue for a new hook and adjusts the
first sentence or two to land it.

Angles must be genuinely different approaches, not rewordings. Good examples:
  - Pattern interrupt   ("stop doing X")
  - Social proof        ("6,000 people switched to this last month")
  - Curiosity gap       ("nobody talks about the one thing that...")
  - Specificity shock   ("I saved $840 a year by replacing my old...")
  - Controversy         ("this is why your old <product> is actually worse")
  - Transformation      ("from X to Y in 30 days")

Rules:
- The 'label' is a 2-3 word name of the angle for UI ("Specificity shock").
- The 'angle' is a single sentence naming the psychology at work.
- The 'hook' is the exact first line spoken in the video (≤140 chars).
- The 'fullScript' is the full rewritten narration (~80-110 words, natural pace).
- Never invent facts not in the source.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["variants"],
  properties: {
    variants: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "angle", "hook", "fullScript"],
        properties: {
          label: { type: "string" },
          angle: { type: "string" },
          hook: { type: "string" },
          fullScript: { type: "string" },
        },
      },
    },
  },
};

export async function generateHookVariants(args: {
  product: ProductFacts;
  script: AdScript;
}): Promise<HookVariant[]> {
  const { product, script } = args;
  const user = `Product: ${product.title}
Description: ${product.description}
${product.price ? `Price: ${product.price}\n` : ""}URL: ${product.url}

Current winning script:
- Hook: ${script.hook}
- Problem: ${script.problem}
- Solution: ${script.solution}
- CTA: ${script.cta}
- Full: ${script.fullScript}

Return JSON only with three variants.`;

  const out = await askJSON<{ variants: HookVariant[] }>({
    system: SYSTEM,
    user,
    schema: SCHEMA,
  });
  return out.variants;
}
