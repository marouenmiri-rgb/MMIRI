import { TopBar } from "@/components/TopBar";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { getCurrentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  drafted: number;
  sent: number;
  opened: number;
  replied: number;
};

function pct(a: number, b: number): string {
  if (!b) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

/**
 * Funnel counts come from the Outreach rows themselves: a message is sent once
 * it has a sentAt, opened once it has an openedAt, and so on. Nothing here is
 * estimated — an empty campaign reads as zeros.
 */
async function loadCampaigns(): Promise<CampaignRow[]> {
  if (!hasDb) return [];
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const campaigns = await db.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      status: true,
      outreach: {
        select: { sentAt: true, openedAt: true, repliedAt: true },
      },
    },
  });

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    drafted: c.outreach.filter((o) => !o.sentAt).length,
    sent: c.outreach.filter((o) => o.sentAt).length,
    opened: c.outreach.filter((o) => o.openedAt).length,
    replied: c.outreach.filter((o) => o.repliedAt).length,
  }));
}

export default async function CampaignsPage() {
  const campaigns = await loadCampaigns();

  return (
    <>
      <TopBar
        eyebrow="Outreach floor"
        title="Campaigns"
        subtitle="Sequenced sends, and what came back from them."
      />

      <div className="space-y-6 p-8">
        {campaigns.length === 0 ? (
          <div className="card p-12 text-center">
            <h2 className="text-[20px] font-semibold text-ink-hi">
              No campaigns yet.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-mid">
              Find storefronts on the Leads page, then send them an ad you made
              for their product. Sends, opens and replies show up here.
            </p>
            <a href="/leads" className="btn-primary mt-5 inline-flex">
              Find storefronts →
            </a>
          </div>
        ) : (
          campaigns.map((c) => {
            const openRate = c.sent > 0 ? (c.opened / c.sent) * 100 : 0;
            const replyRate = c.sent > 0 ? (c.replied / c.sent) * 100 : 0;
            return (
              <article key={c.id} className="card p-6">
                <header className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                      Sequence
                    </div>
                    <h3 className="mt-1 font-display text-2xl tracking-tight text-ink-hi">
                      {c.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="pill border border-line-2 bg-base-3 text-ink-mid">
                        {c.status}
                      </span>
                      {c.drafted > 0 && (
                        <span className="font-mono text-[11px] text-ink-dim">
                          {c.drafted} unsent draft{c.drafted === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>
                </header>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <FunnelStep label="Sent" value={c.sent} total={c.sent} tint="volt" sub={c.sent ? "100%" : "—"} />
                  <FunnelStep label="Opened" value={c.opened} total={c.sent} tint="volt" sub={pct(c.opened, c.sent)} />
                  <FunnelStep label="Replied" value={c.replied} total={c.sent} tint="mint" sub={pct(c.replied, c.sent)} />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-xl2 border border-line-1 bg-base-2 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                      Open rate
                    </div>
                    <div className="mt-2 font-display text-3xl tracking-tightest text-ink-hi">
                      {c.sent ? `${openRate.toFixed(0)}%` : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl2 border border-line-1 bg-base-2 p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                      Reply rate
                    </div>
                    <div className="mt-2 font-display text-3xl tracking-tightest text-mint">
                      {c.sent ? `${replyRate.toFixed(0)}%` : "—"}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}

function FunnelStep({
  label,
  value,
  total,
  tint,
  sub,
}: {
  label: string;
  value: number;
  total: number;
  tint: "volt" | "mint";
  sub: string;
}) {
  const bar = tint === "mint" ? "bg-mint" : "bg-volt";
  const width = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-xl2 border border-line-1 bg-base-2 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
        {label}
      </div>
      <div className="mt-1 font-display text-3xl tabular-nums tracking-tightest text-ink-hi">
        {value}
      </div>
      <div className={`font-mono text-[11px] ${tint === "mint" ? "text-mint" : "text-volt"}`}>
        {sub}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-base-4">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
