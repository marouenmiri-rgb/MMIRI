import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { packJson } from "@/lib/json";

export const runtime = "nodejs";

/**
 * Shopify orders/create webhook.
 *
 * Shopify sends an HMAC-SHA256 in the `X-Shopify-Hmac-Sha256` header
 * signed with SHOPIFY_WEBHOOK_SECRET. We verify that, then extract
 * our tracking short-code from the landing_site's utm_content param
 * (or the referring_site path if Shopify propagated it), and record
 * a Conversion with revenue in cents.
 *
 * No secret configured? We still accept the payload in dev-mode so
 * the feature can be demoed without a Shopify admin.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (secret) {
    const sent = req.headers.get("x-shopify-hmac-sha256") ?? "";
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");
    if (
      sent.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected))
    ) {
      return NextResponse.json({ error: "bad signature" }, { status: 401 });
    }
  }

  if (!hasDb) return NextResponse.json({ ok: true });

  let payload: ShopifyOrder;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const code = extractTrackingCode(payload);
  if (!code) {
    // Not attributable — Shopify will retry if we 4xx, so ack 200.
    return NextResponse.json({ ok: true, attributed: false });
  }

  const link = await db.trackingLink.findUnique({ where: { code } });
  if (!link) return NextResponse.json({ ok: true, attributed: false });

  const cents = Math.round(
    parseFloat(payload.total_price ?? payload.subtotal_price ?? "0") * 100,
  );
  if (!Number.isFinite(cents) || cents < 0) {
    return NextResponse.json({ ok: true, attributed: false });
  }

  // Idempotent via unique(trackingLinkId, externalOrderId)
  const orderId = String(payload.id ?? payload.order_number ?? Date.now());
  const existing = await db.conversion.findUnique({
    where: {
      trackingLinkId_externalOrderId: {
        trackingLinkId: link.id,
        externalOrderId: orderId,
      },
    },
  });
  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  await db.$transaction([
    db.conversion.create({
      data: {
        userId: link.userId,
        trackingLinkId: link.id,
        externalOrderId: orderId,
        revenueCents: cents,
        currency: (payload.currency ?? "USD").toUpperCase(),
        raw: packJson(payload),
      },
    }),
    db.trackingLink.update({
      where: { id: link.id },
      data: {
        conversions: { increment: 1 },
        revenueCents: { increment: cents },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, attributed: true, cents });
}

type ShopifyOrder = {
  id?: number;
  order_number?: number;
  total_price?: string;
  subtotal_price?: string;
  currency?: string;
  landing_site?: string | null;
  referring_site?: string | null;
  note_attributes?: { name: string; value: string }[];
};

function extractTrackingCode(o: ShopifyOrder): string | null {
  // Preferred: UTM content carries the code (we set it at link creation).
  const fromUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
      const u = new URL(url, "https://example.com");
      const content = u.searchParams.get("utm_content");
      if (content) return content;
      // Fallback: a Shopify landing page of /s/<code>/...
      const m = u.pathname.match(/\/s\/([a-z0-9]{6,12})/i);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  };

  return (
    fromUrl(o.landing_site) ??
    fromUrl(o.referring_site) ??
    o.note_attributes?.find((a) => a.name === "adgen_code")?.value ??
    null
  );
}
