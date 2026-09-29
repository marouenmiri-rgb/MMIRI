import { askJSON } from "@/lib/claude";
import { sanitizeSketch } from "@/cartoon/sanitize";
import {
  ACCESSORIES,
  ACTIONS,
  CHARACTER_KINDS,
  EXPRESSIONS,
  POSITIONS,
  SETTINGS,
  VOICES,
  type CartoonSketch,
  type CartoonStyle,
} from "@/cartoon/types";
import { brandVoiceBlock, type BrandVoice } from "./brand-voice";
import type { ProductFacts } from "./types";

const SYSTEM = `You are the head writer of a short, funny cartoon series made for TikTok, Reels and Shorts.
You write 15–30 second animated sketches with a tiny cast of cute characters.

What makes your sketches work:
- A hook in the FIRST panel — a weird situation, a bold line, or a visual gag. No slow intros.
- One clear comedic premise, escalated panel by panel, paid off with a punchline in the last panel.
- Short, speakable lines (max ~12 words). Characters talk like real people, not ads.
- Expressions and actions do half the comedy: shocked takes, smug looks, characters falling in.
- Sound effects ("BONK!", "WHOOSH", "GASP!") on the big beats only — 1 to 3 per sketch.
- If a product is involved, it's the hero of the payoff, never a lecture. Never invent product
  claims that aren't in the product facts.
- Family-friendly. No real people, brands other than the given product, or copyrighted characters.

Production rules (the animation engine can only draw these):
- 1–3 cast members. Each panel shows 1–3 of them, each in a different position.
- Every panel is 2–4.5 seconds. 4–8 panels total.
- speaker must be a cast id that appears in that panel, or "" for a silent panel (then line is "").
- caption is an optional narrator box ("Meanwhile...", "3 hours later") — use sparingly, "" otherwise.
- cta is the end-card line (product + "link in bio"), or a short sign-off if there's no product.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "logline", "cast", "panels", "cta"],
  properties: {
    title: { type: "string" },
    logline: { type: "string" },
    cta: { type: "string" },
    cast: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "kind", "color", "accessory", "voice"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          kind: { type: "string", enum: [...CHARACTER_KINDS] },
          color: { type: "string", description: "Body color as #rrggbb. Bright and distinct per character." },
          accessory: { type: "string", enum: [...ACCESSORIES] },
          voice: { type: "string", enum: [...VOICES] },
        },
      },
    },
    panels: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["setting", "characters", "speaker", "line", "sfx", "caption", "durationSec"],
        properties: {
          setting: { type: "string", enum: [...SETTINGS] },
          characters: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "position", "expression", "action"],
              properties: {
                id: { type: "string" },
                position: { type: "string", enum: [...POSITIONS] },
                expression: { type: "string", enum: [...EXPRESSIONS] },
                action: { type: "string", enum: [...ACTIONS] },
              },
            },
          },
          speaker: { type: "string" },
          line: { type: "string" },
          sfx: { type: "string" },
          caption: { type: "string" },
          durationSec: { type: "number" },
        },
      },
    },
  },
};

const STYLE_NOTES: Record<CartoonStyle, string> = {
  slapstick: "Physical comedy: falls, crashes, bonks, big shocked takes.",
  deadpan: "Dry, understated. One character stays unimpressed while chaos happens.",
  wholesome: "Warm and sweet, with a gentle twist. Nobody gets hurt, everyone wins.",
  chaotic: "Absurd escalation — each panel more ridiculous than the last. Random settings welcome.",
  parody: "Parody a familiar format (nature documentary, infomercial, cooking show, heist movie).",
};

export async function writeCartoon(args: {
  topic: string;
  style: CartoonStyle;
  product?: ProductFacts | null;
  brandVoice?: BrandVoice | null;
}): Promise<CartoonSketch> {
  const productBlock = args.product
    ? `\nProduct featured in the payoff:
- Title: ${args.product.title}
- Description: ${args.product.description.slice(0, 600)}
${args.product.price ? `- Price: ${args.product.price}\n` : ""}${
        args.product.reviews.length
          ? `- What customers say: ${args.product.reviews.slice(0, 3).join(" | ").slice(0, 400)}\n`
          : ""
      }`
    : "\nNo product — this is pure entertainment for the channel.\n";

  const user = `Write one cartoon sketch.

Premise / topic: ${args.topic}
Comedy style: ${args.style} — ${STYLE_NOTES[args.style]}
${productBlock}${args.brandVoice ? `\n${brandVoiceBlock(args.brandVoice)}\n` : ""}
Return JSON only.`;

  const raw = await askJSON<unknown>({ system: SYSTEM, user, schema: SCHEMA, maxTokens: 8000 });
  return sanitizeSketch(raw);
}
