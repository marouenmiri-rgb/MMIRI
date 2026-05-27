import { TopBar } from "@/components/TopBar";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { fixtureThreePLPartners } from "@/lib/threepl-fixtures";

type PartnerRow = {
  id: string;
  name: string;
  websiteUrl: string;
  vertical: string | null;
  geo: string | null;
  commissionBps: number;
  minOrdersPerMonth: number | null;
  maxOrdersPerMonth: number | null;
  blurb: string | null;
  active: boolean;
  matchedLeadCount: number;
};

async function loadPartners(): Promise<{ rows: PartnerRow[]; demo: boolean }> {
  if (!hasDb) return fromFixtures();
  try {
    const partners = await db.threePLPartner.findMany({
      orderBy: [{ active: "desc" }, { commissionBps: "desc" }],
    });
    if (!Array.isArray(partners) || partners.length === 0) return fromFixtures();

    const leads = await db.threePLLead.findMany({
      select: { matchedPartnerId: true },
    });
    const counts = new Map<string, number>();
    for (const l of leads as Array<{ matchedPartnerId: string | null }>) {
      if (l.matchedPartnerId) {
        counts.set(
          l.matchedPartnerId,
          (counts.get(l.matchedPartnerId) ?? 0) + 1,
        );
      }
    }

    const rows: PartnerRow[] = (partners as Array<Record<string, unknown>>).map(
      (p) => ({
        id: p.id as string,
        name: p.name as string,
        websiteUrl: p.websiteUrl as string,
        vertical: (p.vertical as string | null) ?? null,
        geo: (p.geo as string | null) ?? null,
        commissionBps: (p.commissionBps as number) ?? 0,
        minOrdersPerMonth: (p.minOrdersPerMonth as number | null) ?? null,
        maxOrdersPerMonth: (p.maxOrdersPerMonth as number | null) ?? null,
        blurb: (p.blurb as string | null) ?? null,
        active: Boolean(p.active),
        matchedLeadCount: counts.get(p.id as string) ?? 0,
      }),
    );
    return { rows, demo: false };
  } catch {
    return fromFixtures();
  }
}

function fromFixtures(): { rows: PartnerRow[]; demo: boolean } {
  return {
    rows: fixtureThreePLPartners.map((p) => ({
      id: p.id,
      name: p.name,
      websiteUrl: p.websiteUrl,
      vertical: p.vertical,
      geo: p.geo,
      commissionBps: p.commissionBps,
      minOrdersPerMonth: p.minOrdersPerMonth,
      maxOrdersPerMonth: p.maxOrdersPerMonth,
      blurb: p.blurb,
      active: p.active,
      matchedLeadCount: 0,
    })),
    demo: true,
  };
}

export default async function PartnersPage() {
  const { rows, demo } = await loadPartners();
  const totalCommission = rows.reduce((s, r) => s + r.commissionBps, 0);
  const avgPct =
    rows.length === 0 ? 0 : Math.round(totalCommission / 100 / rows.length);

  return (
    <>
      <TopBar
        eyebrow="Affiliate roster"
        title="3PL partners you earn from"
        subtitle="Every lead the discovery pipeline qualifies gets matched to one of these. Add programs as you join them."
        action={
          <a href="/threepl" className="btn-ghost">
            ← Back to pipeline
          </a>
        }
      />

      <div className="space-y-6 p-8">
        {demo ? (
          <div className="flex items-center gap-2 rounded-xl2 border border-volt/30 bg-volt/5 px-4 py-2.5">
            <span className="rounded-md border border-volt/40 bg-volt/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-volt">
              Demo data
            </span>
            <span className="text-[13px] text-ink-mid">
              Default roster — these get seeded into the DB on first boot.
            </span>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Active programs" value={rows.filter((r) => r.active).length.toString()} />
          <Stat label="Avg commission" value={`${avgPct}%`} accent="lime" />
          <Stat
            label="Verticals covered"
            value={String(new Set(rows.map((r) => r.vertical ?? "general")).size)}
          />
          <Stat
            label="Geo coverage"
            value={String(new Set(rows.map((r) => r.geo ?? "—")).size)}
          />
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-12 border-b border-line-1 bg-base-2/50 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
            <div className="col-span-3">Partner</div>
            <div className="col-span-2">Vertical · Geo</div>
            <div className="col-span-2">Volume / mo</div>
            <div className="col-span-1 text-right">Commission</div>
            <div className="col-span-2 text-right">Matched</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          {rows.map((r) => {
            const pct = (r.commissionBps / 100).toFixed(
              r.commissionBps % 100 ? 1 : 0,
            );
            const range = r.maxOrdersPerMonth
              ? `${(r.minOrdersPerMonth ?? 0).toLocaleString()}–${r.maxOrdersPerMonth.toLocaleString()}`
              : `${(r.minOrdersPerMonth ?? 0).toLocaleString()}+`;
            return (
              <div
                key={r.id}
                className="grid grid-cols-12 items-center border-b border-line-1 px-5 py-4 transition hover:bg-base-2/40 last:border-b-0"
              >
                <div className="col-span-3 min-w-0">
                  <div className="font-display text-[15px] tracking-tight text-ink-hi">
                    {r.name}
                  </div>
                  <a
                    href={r.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-mono text-[11px] text-ink-mid hover:text-volt"
                  >
                    {hostOf(r.websiteUrl)} ↗
                  </a>
                  {r.blurb ? (
                    <div className="mt-1.5 text-[12px] leading-snug text-ink-mid">
                      {r.blurb}
                    </div>
                  ) : null}
                </div>
                <div className="col-span-2 font-mono text-[12px] text-ink-mid">
                  {(r.vertical ?? "general")} · {(r.geo ?? "—")}
                </div>
                <div className="col-span-2 font-mono text-[12px] text-ink-mid">
                  {range}
                </div>
                <div className="col-span-1 text-right">
                  <span className="rounded-md border border-lime/30 bg-lime/10 px-2 py-1 font-mono text-[11px] text-lime">
                    {pct}%
                  </span>
                </div>
                <div className="col-span-2 text-right font-display text-[18px] tracking-tightest text-ink-hi">
                  {r.matchedLeadCount}
                </div>
                <div className="col-span-2 text-right">
                  {r.active ? (
                    <span className="chip-live">
                      <span className="dot-live" /> active
                    </span>
                  ) : (
                    <span className="pill border border-line-2 bg-base-2 text-ink-mid">
                      paused
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="card p-6 text-center">
          <div className="font-display text-lg text-ink-hi">
            Join more programs to widen your match net
          </div>
          <p className="mt-2 text-[13px] text-ink-mid">
            Edit{" "}
            <code className="rounded-md border border-line-2 bg-base-2 px-1.5 py-0.5 font-mono text-[11px] text-volt">
              src/data/threepl-partners.ts
            </code>
            {" "}or insert rows into{" "}
            <code className="rounded-md border border-line-2 bg-base-2 px-1.5 py-0.5 font-mono text-[11px] text-volt">
              ThreePLPartner
            </code>
            . Set{" "}
            <code className="rounded-md border border-line-2 bg-base-2 px-1.5 py-0.5 font-mono text-[11px] text-volt">
              THREEPL_AFFILIATE_REF
            </code>
            {" "}in{" "}
            <code className="rounded-md border border-line-2 bg-base-2 px-1.5 py-0.5 font-mono text-[11px] text-volt">
              .env
            </code>
            {" "}to auto-substitute your sub-id into every link.
          </p>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  accent = "volt",
}: {
  label: string;
  value: string;
  accent?: "volt" | "lime";
}) {
  return (
    <div className="rounded-xl2 border border-line-1 bg-base-1 p-5">
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.22em] ${accent === "lime" ? "text-lime" : "text-volt"}`}
      >
        {label}
      </div>
      <div className="mt-3 font-display text-[28px] tracking-tightest text-ink-hi">
        {value}
      </div>
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
