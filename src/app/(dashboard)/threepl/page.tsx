import { TopBar } from "@/components/TopBar";
import { KpiTile } from "@/components/threepl/KpiTile";
import { LeadCard, type LeadCardData } from "@/components/threepl/LeadCard";
import {
  PartnerStrip,
  type PartnerStripItem,
} from "@/components/threepl/PartnerStrip";
import { ScoreDistribution } from "@/components/threepl/ScoreDistribution";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { getCurrentUserId } from "@/lib/auth";
import {
  fixtureThreePLLeads,
  fixtureThreePLPartners,
  type DemoThreePLLead,
} from "@/lib/threepl-fixtures";
import { DiscoverButton } from "./DiscoverButton";

type AggregateView = {
  leads: LeadCardData[];
  partners: PartnerStripItem[];
  fromFixtures: boolean;
};

async function loadView(): Promise<AggregateView> {
  if (!hasDb) return fromFixtures();
  const userId = await getCurrentUserId();
  if (!userId) return fromFixtures();

  const [leadsRaw, partnersRaw] = await Promise.all([
    db.threePLLead.findMany({
      where: { userId },
      orderBy: [{ fitScore: "desc" }, { createdAt: "desc" }],
      take: 60,
      include: { matchedPartner: true },
    }),
    db.threePLPartner.findMany({
      where: { active: true },
      orderBy: { commissionBps: "desc" },
    }),
  ]);

  if (!Array.isArray(leadsRaw) || leadsRaw.length === 0) return fromFixtures();

  const partnerLeadCount = new Map<string, number>();
  for (const l of leadsRaw as Array<{ matchedPartnerId: string | null }>) {
    if (l.matchedPartnerId) {
      partnerLeadCount.set(
        l.matchedPartnerId,
        (partnerLeadCount.get(l.matchedPartnerId) ?? 0) + 1,
      );
    }
  }

  const leads: LeadCardData[] = (leadsRaw as Array<Record<string, unknown>>).map(
    (l) => leadToCard(l),
  );

  const partners: PartnerStripItem[] = (
    partnersRaw as Array<Record<string, unknown>>
  ).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    vertical: (p.vertical as string | null) ?? null,
    geo: (p.geo as string | null) ?? null,
    commissionBps: (p.commissionBps as number) ?? 0,
    minOrdersPerMonth: (p.minOrdersPerMonth as number | null) ?? null,
    maxOrdersPerMonth: (p.maxOrdersPerMonth as number | null) ?? null,
    matchedLeadCount: partnerLeadCount.get(p.id as string) ?? 0,
  }));

  return { leads, partners, fromFixtures: false };
}

function fromFixtures(): AggregateView {
  const partnerLeadCount = new Map<string, number>();
  for (const l of fixtureThreePLLeads) {
    partnerLeadCount.set(
      l.matchedPartnerName,
      (partnerLeadCount.get(l.matchedPartnerName) ?? 0) + 1,
    );
  }
  return {
    leads: fixtureThreePLLeads.map(demoLeadToCard),
    partners: fixtureThreePLPartners.map((p) => ({
      id: p.id,
      name: p.name,
      vertical: p.vertical,
      geo: p.geo,
      commissionBps: p.commissionBps,
      minOrdersPerMonth: p.minOrdersPerMonth,
      maxOrdersPerMonth: p.maxOrdersPerMonth,
      matchedLeadCount: partnerLeadCount.get(p.name) ?? 0,
    })),
    fromFixtures: true,
  };
}

function demoLeadToCard(l: DemoThreePLLead): LeadCardData {
  return {
    id: l.id,
    brandName: l.brandName,
    websiteUrl: l.websiteUrl,
    host: l.host,
    email: l.email,
    vertical: l.vertical,
    estMonthlyOrders: l.estMonthlyOrders,
    fitScore: l.fitScore,
    fitReasons: l.fitReasons,
    signals: l.signals,
    matchedPartnerName: l.matchedPartnerName,
    matchedPartnerVertical: l.matchedPartnerVertical,
    commissionBps: l.commissionBps,
    affiliateLink: l.affiliateLink,
    outreachSubject: l.outreachSubject,
    outreachBody: l.outreachBody,
    status: l.status,
    isDemo: true,
  };
}

function leadToCard(l: Record<string, unknown>): LeadCardData {
  const url = l.websiteUrl as string;
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    // keep raw string
  }
  const signalsJson = (l.signalsJson as Record<string, unknown> | null) ?? null;
  const matched = l.matchedPartner as Record<string, unknown> | null;
  const fitReasons = ((l.fitReasons as string | null) ?? "")
    .split(" · ")
    .filter(Boolean);
  return {
    id: l.id as string,
    brandName: l.brandName as string,
    websiteUrl: url,
    host,
    email: (l.email as string | null) ?? null,
    vertical: (l.vertical as string | null) ?? null,
    estMonthlyOrders: (l.estMonthlyOrders as number | null) ?? null,
    fitScore: (l.fitScore as number) ?? 0,
    fitReasons,
    signals: {
      skuCount: (signalsJson?.skuCount as number | null) ?? null,
      reviewCount: (signalsJson?.reviewCount as number | null) ?? null,
      estMonthlyOrders:
        (signalsJson?.estMonthlyOrders as number | null) ??
        ((l.estMonthlyOrders as number | null) ?? null),
      hasShippingPage: Boolean(signalsJson?.hasShippingPage),
      shipsInternationally: Boolean(signalsJson?.shipsInternationally),
      currentCarrier: (signalsJson?.currentCarrier as string | null) ?? null,
      freeShippingThreshold:
        (signalsJson?.freeShippingThreshold as string | null) ?? null,
    },
    matchedPartnerName: (matched?.name as string | null) ?? null,
    matchedPartnerVertical: (matched?.vertical as string | null) ?? null,
    commissionBps: (matched?.commissionBps as number | null) ?? null,
    affiliateLink: (l.affiliateLink as string | null) ?? null,
    outreachSubject: (l.outreachSubject as string | null) ?? null,
    outreachBody: (l.outreachBody as string | null) ?? null,
    status: (l.status as string) ?? "DISCOVERED",
  };
}

function computeKpis(leads: LeadCardData[]) {
  const total = leads.length;
  const avgFit =
    total === 0
      ? 0
      : Math.round(leads.reduce((s, l) => s + l.fitScore, 0) / total);
  const ordersSum = leads.reduce(
    (s, l) => s + (l.estMonthlyOrders ?? 0),
    0,
  );
  const pipelineCents = Math.round(
    leads.reduce((s, l) => {
      const orders = l.estMonthlyOrders ?? 0;
      // Crude expected commission: assume 3PL bills $4 / order, partner pays
      // commissionBps of that for the first 12 months → 1-year value.
      const partnerBilledYear = orders * 4 * 12;
      const cents = partnerBilledYear * 100 * ((l.commissionBps ?? 0) / 10000);
      return s + cents;
    }, 0),
  );
  const verticalCounts = new Map<string, number>();
  for (const l of leads) {
    const v = l.vertical ?? "unclassified";
    verticalCounts.set(v, (verticalCounts.get(v) ?? 0) + 1);
  }
  const topVertical = [...verticalCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];

  return {
    total,
    avgFit,
    ordersSum,
    pipelineDollars: Math.round(pipelineCents / 100),
    topVerticalLabel: topVertical?.[0] ?? "—",
    topVerticalCount: topVertical?.[1] ?? 0,
  };
}

export default async function ThreePLPage() {
  const { leads, partners, fromFixtures } = await loadView();
  const kpis = computeKpis(leads);
  const scores = leads.map((l) => l.fitScore);

  return (
    <>
      <TopBar
        eyebrow="3PL Finder"
        title="Brands ready to outsource fulfillment"
        subtitle="DTC stores scored for 3PL-fit, matched to a partner from your affiliate roster, with a draft pitch ready to send."
        action={<DiscoverButton />}
      />

      <div className="space-y-6 p-8">
        {fromFixtures ? (
          <div className="flex items-center justify-between rounded-xl2 border border-volt/30 bg-volt/5 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-volt/40 bg-volt/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-volt">
                Demo data
              </span>
              <span className="text-[13px] text-ink-mid">
                Showing sample brands. Run a real niche search to populate your pipeline.
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
              No API key needed for demo
            </span>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiTile
            label="Qualified leads"
            value={kpis.total}
            hint="Brands above fit threshold"
          />
          <KpiTile
            label="Avg fit score"
            value={kpis.avgFit}
            suffix="/100"
            accent="lime"
            hint={
              kpis.avgFit >= 80
                ? "Strong pipeline"
                : kpis.avgFit >= 65
                  ? "Healthy pipeline"
                  : "Tighten the niche to lift average"
            }
          />
          <KpiTile
            label="Brand orders / mo"
            value={kpis.ordersSum}
            hint="Combined est. volume across leads"
          />
          <KpiTile
            label="Annual commission"
            value={kpis.pipelineDollars}
            prefix="$"
            accent="lime"
            hint={
              kpis.topVerticalCount > 0
                ? `Top vertical · ${kpis.topVerticalLabel} (${kpis.topVerticalCount})`
                : "Projection if all leads sign up"
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ScoreDistribution scores={scores} />
          </div>
          <PartnerStrip items={partners.slice(0, 3)} />
        </div>

        {leads.length === 0 ? (
          <div className="card grid place-items-center p-20 text-center">
            <div className="font-display text-xl text-ink-mid">
              No 3PL leads yet — type a niche and click Discover.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((l) => (
              <LeadCard key={l.id} lead={l} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
