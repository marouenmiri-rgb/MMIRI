import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb, env } from "@/lib/env";
import { writeOutreachEmail } from "@/agents/outreach";

export const runtime = "nodejs";

const Body = z.object({
  campaignId: z.string(),
  leadId: z.string(),
  adId: z.string(),
  senderName: z.string().default("The AdGen Team"),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const [lead, ad] = await Promise.all([
    db.lead.findFirst({ where: { id: parsed.data.leadId, userId } }),
    db.ad.findFirst({ where: { id: parsed.data.adId, userId } }),
  ]);
  if (!lead || !ad) {
    return NextResponse.json({ error: "Lead or ad not found" }, { status: 404 });
  }

  const adUrl = `${env.NEXT_PUBLIC_APP_URL}/ads/${ad.id}`;
  const email = await writeOutreachEmail({
    store: {
      storeName: lead.storeName,
      websiteUrl: lead.websiteUrl,
      email: lead.email ?? undefined,
      socials: (lead.socialsJson as never) ?? {},
    },
    product: { title: ad.productTitle ?? "your product", url: ad.productUrl },
    adUrl,
    senderName: parsed.data.senderName,
  });

  const outreach = await db.outreach.create({
    data: {
      campaignId: parsed.data.campaignId,
      leadId: lead.id,
      subject: email.subject,
      body: email.body,
      status: "DRAFT",
    },
  });

  // Phase 3 wires Resend/SendGrid here. MVP stops at DRAFT so the user can
  // review copy in the dashboard before it ever leaves the box.
  return NextResponse.json({ id: outreach.id, email });
}
