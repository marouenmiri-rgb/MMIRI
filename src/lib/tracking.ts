import crypto from "node:crypto";
import { db } from "./db";
import { env } from "./env";
import type { SocialPlatform } from "@/social/types";

const CODE_ALPHABET =
  "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/1/i/l — unambiguous in print/voice

function randomCode(len = 7): string {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * Create a TrackingLink that points at `destinationUrl` with UTM params
 * baked in — crucially, `utm_content` is set to the short code itself, so
 * when Shopify's orders webhook fires later we can match the order back
 * to the exact post that drove it.
 *
 * Returns the short `/s/<code>` URL for pasting into captions.
 */
export async function createTrackingLink(args: {
  userId: string;
  adId: string;
  socialPostId?: string;
  destinationUrl: string;
  platform: SocialPlatform;
  campaign?: string;
}): Promise<{ link: string; code: string; id: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const utm = {
      utm_source: `adgen_${args.platform.toLowerCase()}`,
      utm_medium: "social",
      utm_campaign: args.campaign ?? "adgen-lab",
      utm_content: code, // ← the attribution key
    };
    const dest = appendParams(args.destinationUrl, utm);
    try {
      const row = await db.trackingLink.create({
        data: {
          code,
          userId: args.userId,
          adId: args.adId,
          socialPostId: args.socialPostId,
          destinationUrl: dest,
          utmSource: utm.utm_source,
          utmMedium: utm.utm_medium,
          utmCampaign: utm.utm_campaign,
          utmContent: code,
        },
      });
      return {
        link: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/s/${code}`,
        code: row.code,
        id: row.id,
      };
    } catch (e) {
      if (attempt === 4) throw e;
      // retry on unique-violation
    }
  }
  throw new Error("failed to allocate tracking link");
}

function appendParams(url: string, params: Record<string, string>): string {
  try {
    const u = new URL(url);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    const qs = new URLSearchParams(params).toString();
    return `${url}${url.includes("?") ? "&" : "?"}${qs}`;
  }
}

/**
 * Inject the short link into a caption. If the caption has a `{{link}}`
 * placeholder, replace it. Otherwise, append on a new line.
 */
export function injectLink(caption: string, shortUrl: string): string {
  if (caption.includes("{{link}}")) {
    return caption.replace(/\{\{link\}\}/g, shortUrl);
  }
  if (caption.includes(shortUrl)) return caption;
  return `${caption.trimEnd()}\n${shortUrl}`;
}
