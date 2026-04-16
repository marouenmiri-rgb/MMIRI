import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Tracking-link redirect. Logs a click event (IP, UA, referrer) and
 * increments the link's click counter, then 302s to the destination URL
 * (already UTM-tagged at creation time).
 */
export async function GET(
  req: Request,
  { params }: { params: { code: string } },
) {
  if (!hasDb) return NextResponse.redirect("https://adgen.ai");

  const link = await db.trackingLink.findUnique({
    where: { code: params.code },
    select: { id: true, destinationUrl: true },
  });
  if (!link) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Fire-and-forget the click log. Redirect must not wait on it.
  const headers = req.headers;
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    null;
  const ua = headers.get("user-agent") ?? null;
  const referrer = headers.get("referer") ?? null;
  const country = headers.get("x-vercel-ip-country") ?? null;

  Promise.allSettled([
    db.clickEvent.create({
      data: {
        trackingLinkId: link.id,
        ip,
        userAgent: ua?.slice(0, 400) ?? null,
        referrer: referrer?.slice(0, 400) ?? null,
        country,
      },
    }),
    db.trackingLink.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } },
    }),
  ]).catch(() => {});

  return NextResponse.redirect(link.destinationUrl, { status: 302 });
}
