import { NextResponse } from "next/server";
import { z } from "zod";
import { runThreePLPipeline } from "@/agents/threepl/orchestrator";
import type { PartnerSummary } from "@/agents/threepl/types";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { env, hasDb } from "@/lib/env";
import { DEFAULT_THREEPL_PARTNERS } from "@/data/threepl-partners";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  niche: z.string().min(2).max(120),
  limit: z.number().int().min(1).max(20).default(8),
  minFitScore: z.number().int().min(0).max(100).default(50),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { niche, limit, minFitScore } = parsed.data;

  const partners = await loadPartners();

  const result = await runThreePLPipeline({
    niche,
    partners,
    affiliateRef: env.THREEPL_AFFILIATE_REF ?? null,
    senderName: env.THREEPL_SENDER_NAME ?? "Operator",
    limit,
    minFitScore,
  });

  if (!hasDb) return NextResponse.json({ ...result, saved: 0 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ ...result, saved: 0 });

  let saved = 0;
  for (const lead of result.leads) {
    try {
      await db.threePLLead.upsert({
        where: {
          userId_websiteUrl: { userId, websiteUrl: lead.brand.websiteUrl },
        },
        update: {
          brandName: lead.brand.brandName,
          email: lead.brand.email ?? null,
          socialsJson: lead.brand.socials as object,
          vertical: lead.verdict.vertical ?? null,
          estMonthlyOrders: lead.verdict.estMonthlyOrders ?? null,
          signalsJson: lead.brand.signals as unknown as object,
          fitScore: lead.verdict.score,
          fitReasons: lead.verdict.reasons.join(" · "),
          matchedPartnerId: lead.match?.partnerId ?? null,
          outreachSubject: lead.email?.subject ?? null,
          outreachBody: lead.email?.body ?? null,
          affiliateLink: lead.match?.affiliateLink ?? null,
          status: lead.email ? "PITCHED" : lead.match ? "MATCHED" : "SCORED",
        },
        create: {
          userId,
          brandName: lead.brand.brandName,
          websiteUrl: lead.brand.websiteUrl,
          email: lead.brand.email ?? null,
          socialsJson: lead.brand.socials as object,
          vertical: lead.verdict.vertical ?? null,
          estMonthlyOrders: lead.verdict.estMonthlyOrders ?? null,
          signalsJson: lead.brand.signals as unknown as object,
          fitScore: lead.verdict.score,
          fitReasons: lead.verdict.reasons.join(" · "),
          matchedPartnerId: lead.match?.partnerId ?? null,
          outreachSubject: lead.email?.subject ?? null,
          outreachBody: lead.email?.body ?? null,
          affiliateLink: lead.match?.affiliateLink ?? null,
          status: lead.email ? "PITCHED" : lead.match ? "MATCHED" : "SCORED",
          source: lead.brand.source ?? "duckduckgo",
        },
      });
      saved += 1;
    } catch {
      // skip duplicates / hiccups; surface count only.
    }
  }

  return NextResponse.json({ ...result, saved });
}

async function loadPartners(): Promise<PartnerSummary[]> {
  if (!hasDb) return DEFAULT_THREEPL_PARTNERS.map(toSummary);

  const existing = await db.threePLPartner
    .findMany({ where: { active: true } })
    .catch(() => [] as Awaited<ReturnType<typeof db.threePLPartner.findMany>>);

  if (existing.length > 0) {
    return (existing as PartnerSummary[]).map(
      (p: PartnerSummary): PartnerSummary => ({
        id: p.id,
        name: p.name,
        websiteUrl: p.websiteUrl,
        affiliateUrl: p.affiliateUrl,
        vertical: p.vertical,
        geo: p.geo,
        minOrdersPerMonth: p.minOrdersPerMonth,
        maxOrdersPerMonth: p.maxOrdersPerMonth,
        blurb: p.blurb,
        commissionBps: p.commissionBps,
      }),
    );
  }

  // First-run fallback: synth IDs from names so the pipeline still works.
  return DEFAULT_THREEPL_PARTNERS.map(toSummary);
}

function toSummary(
  p: (typeof DEFAULT_THREEPL_PARTNERS)[number],
): PartnerSummary {
  return {
    id: `seed:${p.name.toLowerCase().replace(/\s+/g, "-")}`,
    name: p.name,
    websiteUrl: p.websiteUrl,
    affiliateUrl: p.affiliateUrl,
    vertical: p.vertical,
    geo: p.geo,
    minOrdersPerMonth: p.minOrdersPerMonth,
    maxOrdersPerMonth: p.maxOrdersPerMonth,
    blurb: p.blurb,
    commissionBps: p.commissionBps,
  };
}
