import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb, env } from "@/lib/env";
import { writeOutreachEmail } from "@/agents/outreach";
import { sendEmail } from "@/lib/email";
import { unpackJson } from "@/lib/json";

export const runtime = "nodejs";

const Body = z.object({
  campaignId: z.string(),
  leadId: z.string(),
  adId: z.string(),
  senderName: z.string().default("The AdGen Team"),
  fromEmail: z.string().email().default("outreach@adgen.ai"),
  deliver: z.boolean().default(false),
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
      socials: unpackJson(lead.socialsJson, {}) as never,
    },
    product: { title: ad.productTitle ?? "your product", url: ad.productUrl },
    adUrl,
    senderName: parsed.data.senderName,
  });

  // Draft path: save copy only, return for UI review.
  if (!parsed.data.deliver || !lead.email) {
    const draft = await db.outreach.create({
      data: {
        campaignId: parsed.data.campaignId,
        leadId: lead.id,
        subject: email.subject,
        body: email.body,
        status: "DRAFT",
      },
    });
    return NextResponse.json({
      id: draft.id,
      status: "DRAFT",
      email,
      note: lead.email ? undefined : "Lead has no email on file",
    });
  }

  // Deliver path: send via Resend, reflect status + sentAt.
  const result = await sendEmail({
    to: lead.email,
    from: parsed.data.fromEmail,
    subject: email.subject,
    text: `${email.body}\n\nWatch the ad: ${adUrl}\n`,
  });

  const persisted = await db.outreach.create({
    data: {
      campaignId: parsed.data.campaignId,
      leadId: lead.id,
      subject: email.subject,
      body: email.body,
      status: result.ok ? "SENT" : "DRAFT",
      sentAt: result.ok ? new Date() : null,
    },
  });

  return NextResponse.json({
    id: persisted.id,
    status: persisted.status,
    email,
    delivery: result,
  });
}
