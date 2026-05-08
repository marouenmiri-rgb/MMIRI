import { TopBar } from "@/components/TopBar";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { getCurrentUserId } from "@/lib/auth";
import { DiscoverButton } from "./DiscoverButton";

type LeadRow = {
  id: string;
  brandName: string;
  websiteUrl: string;
  email: string | null;
  vertical: string | null;
  estMonthlyOrders: number | null;
  fitScore: number;
  fitReasons: string | null;
  matchedPartnerName: string | null;
  affiliateLink: string | null;
  outreachSubject: string | null;
  outreachBody: string | null;
  status: string;
  createdAt: string | Date;
};

async function loadLeads(): Promise<LeadRow[]> {
  if (!hasDb) return [];
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const leads = await db.threePLLead.findMany({
    where: { userId },
    orderBy: [{ fitScore: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: { matchedPartner: true },
  });
  return (leads as Array<LeadRow & { matchedPartner: { name: string } | null }>).map(
    (l) => ({
      id: l.id,
      brandName: l.brandName,
      websiteUrl: l.websiteUrl,
      email: l.email,
      vertical: l.vertical,
      estMonthlyOrders: l.estMonthlyOrders,
      fitScore: l.fitScore,
      fitReasons: l.fitReasons,
      matchedPartnerName: l.matchedPartner?.name ?? null,
      affiliateLink: l.affiliateLink,
      outreachSubject: l.outreachSubject,
      outreachBody: l.outreachBody,
      status: l.status,
      createdAt: l.createdAt,
    }),
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-lime border-lime/40 bg-lime/10";
  if (score >= 60) return "text-volt border-volt/40 bg-volt/10";
  return "text-ink-mid border-line-2 bg-base-2";
}

export default async function ThreePLPage() {
  const leads = await loadLeads();

  return (
    <>
      <TopBar
        eyebrow="3PL Finder"
        title="Brands ready to outsource fulfillment"
        subtitle="DTC stores scored for 3PL-fit, matched to a partner from your affiliate roster, with a draft pitch ready to send."
        action={<DiscoverButton />}
      />

      <div className="space-y-6 p-8">
        {leads.length === 0 ? (
          <div className="card grid place-items-center p-20 text-center">
            <div className="font-display text-xl text-ink-mid">
              No 3PL leads yet — type a niche (e.g. "supplements", "pet treats") and click Discover.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((l) => {
              const host = (() => {
                try {
                  return new URL(l.websiteUrl).host;
                } catch {
                  return l.websiteUrl;
                }
              })();
              return (
                <article
                  key={l.id}
                  className="card overflow-hidden p-6"
                >
                  <header className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                        {l.vertical ?? "unclassified"}
                        {l.estMonthlyOrders
                          ? ` · ~${l.estMonthlyOrders}/mo`
                          : ""}
                      </div>
                      <h3 className="mt-1 font-display text-2xl tracking-tight text-ink-hi">
                        {l.brandName}
                      </h3>
                      <a
                        href={l.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[12px] text-ink-mid hover:text-volt"
                      >
                        {host} ↗
                      </a>
                    </div>
                    <div
                      className={`flex flex-col items-center justify-center rounded-xl2 border px-5 py-3 ${scoreColor(l.fitScore)}`}
                    >
                      <div className="font-display text-3xl tracking-tightest">
                        {l.fitScore}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em]">
                        fit
                      </div>
                    </div>
                  </header>

                  <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="rounded-xl2 border border-line-1 bg-base-2 p-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                        Why this fits
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-ink-mid">
                        {l.fitReasons ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-xl2 border border-line-1 bg-base-2 p-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                        Matched 3PL
                      </div>
                      <p className="mt-2 font-display text-lg text-ink-hi">
                        {l.matchedPartnerName ?? "—"}
                      </p>
                      {l.affiliateLink ? (
                        <a
                          href={l.affiliateLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block truncate font-mono text-[11px] text-volt hover:text-lime"
                          title={l.affiliateLink}
                        >
                          {l.affiliateLink}
                        </a>
                      ) : null}
                    </div>
                    <div className="rounded-xl2 border border-line-1 bg-base-2 p-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                        Contact
                      </div>
                      <p className="mt-2 text-[13px] text-ink-hi">
                        {l.email ?? (
                          <span className="text-ink-dim">no email on file</span>
                        )}
                      </p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                        {l.status}
                      </p>
                    </div>
                  </div>

                  {l.outreachSubject && l.outreachBody ? (
                    <details className="mt-5 rounded-xl2 border border-line-1 bg-base-2 p-4">
                      <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim hover:text-ink-hi">
                        Draft pitch ↓
                      </summary>
                      <div className="mt-3 space-y-2">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                            Subject
                          </div>
                          <div className="text-[13px] text-ink-hi">
                            {l.outreachSubject}
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                            Body
                          </div>
                          <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-mid">
                            {l.outreachBody}
                          </pre>
                        </div>
                      </div>
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
