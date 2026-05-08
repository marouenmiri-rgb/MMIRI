import { askJSON } from "@/lib/claude";
import { hasClaude } from "@/lib/env";
import type {
  AffiliateEmail,
  CandidateBrand,
  FitVerdict,
  PartnerSummary,
} from "./types";

const SYSTEM = `You write short cold emails that pitch a third-party logistics
(3PL) warehouse to a DTC e-commerce founder. The sender is an affiliate —
they get a commission if the founder signs up via the link in the email.

Rules:
- Under 90 words. No filler ("hope this finds you well").
- Lead with one specific observation about the brand (cite a real signal).
- One sentence on why outsourcing fulfillment to <partner> would unblock them.
- One CTA: "want me to send the partner intro link?" or paste the link directly.
- Honest tone — affiliate disclosure can be implicit ("they have a partner
  program I'm part of"). No fake claims, no fake stats.
- Avoid the words "synergy", "leverage", "circle back".`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "body"],
  properties: {
    subject: { type: "string", minLength: 3, maxLength: 120 },
    body: { type: "string", minLength: 30, maxLength: 1200 },
  },
};

export async function writeAffiliateEmail(args: {
  brand: CandidateBrand;
  verdict: FitVerdict;
  partner: PartnerSummary;
  affiliateLink: string;
  senderName: string;
}): Promise<AffiliateEmail> {
  const { brand, verdict, partner, affiliateLink, senderName } = args;

  if (!hasClaude) return fallback(args);

  const observation =
    verdict.reasons[0] ??
    `${brand.signals.skuCount ?? "your"} SKUs and growing volume`;

  const user = [
    `From: ${senderName}`,
    `To: ${brand.brandName} (${brand.websiteUrl})`,
    `Brand contact email known: ${brand.email ?? "no"}`,
    `Brand vertical: ${verdict.vertical ?? "unknown"}`,
    `Brand est. monthly orders: ${verdict.estMonthlyOrders ?? "unknown"}`,
    `Top observation to anchor the email: ${observation}`,
    `3PL we're recommending: ${partner.name} — ${partner.blurb ?? partner.websiteUrl}`,
    `Affiliate link to include: ${affiliateLink}`,
    "",
    "Return JSON only.",
  ].join("\n");

  try {
    return await askJSON<AffiliateEmail>({
      system: SYSTEM,
      user,
      schema: SCHEMA,
      maxTokens: 600,
    });
  } catch {
    return fallback(args);
  }
}

function fallback(args: {
  brand: CandidateBrand;
  verdict: FitVerdict;
  partner: PartnerSummary;
  affiliateLink: string;
  senderName: string;
}): AffiliateEmail {
  const { brand, verdict, partner, affiliateLink, senderName } = args;
  const obs =
    verdict.reasons[0] ??
    `your catalog at ${brand.websiteUrl}`;
  return {
    subject: `Quick idea for ${brand.brandName} fulfillment`,
    body: [
      `Hey ${brand.brandName} team,`,
      "",
      `Saw ${obs} — that's the moment most founders start hating the warehouse part of the job.`,
      "",
      `${partner.name} (${partner.websiteUrl}) handles exactly this stage. They have a partner program I'm part of, so here's my link if you want to skip the sales call:`,
      affiliateLink,
      "",
      "Worth a 10-min look?",
      "",
      `– ${senderName}`,
    ].join("\n"),
  };
}
