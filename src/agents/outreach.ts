import { askJSON } from "@/lib/claude";
import type { OutreachEmail, ProductFacts, ShopifyStore } from "./types";

const SYSTEM = `You write cold outreach emails that actually get replies.
Short (under 90 words). Conversational. Specific. No "I hope this email finds
you well." No jargon. One clear CTA: watch the demo video.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "body"],
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
  },
};

export async function writeOutreachEmail(args: {
  store: ShopifyStore;
  product: Pick<ProductFacts, "title" | "url">;
  adUrl: string;
  senderName: string;
}): Promise<OutreachEmail> {
  const { store, product, adUrl, senderName } = args;
  const user = `Write a cold email from ${senderName} to ${store.storeName} (${store.websiteUrl}).

We made a custom short-form video ad for their product "${product.title}".
Preview link: ${adUrl}

The goal is a reply. Personalize with one concrete observation about ${store.storeName}.
Return JSON only.`;

  return askJSON<OutreachEmail>({ system: SYSTEM, user, schema: SCHEMA });
}
