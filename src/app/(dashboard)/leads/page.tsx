import { TopBar } from "@/components/TopBar";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { getCurrentUserId } from "@/lib/auth";
import { fixtureLeads } from "@/lib/fixtures";
import { DiscoverButton } from "./DiscoverButton";

type LeadRow = {
  id: string;
  storeName: string;
  websiteUrl: string;
  email: string | null;
  createdAt: string | Date;
  socialsJson?: unknown;
};

async function loadLeads(): Promise<LeadRow[]> {
  if (!hasDb) return fixtureLeads as unknown as LeadRow[];
  const userId = await getCurrentUserId();
  if (!userId) return fixtureLeads as unknown as LeadRow[];
  const leads = await db.lead.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return leads.length
    ? (leads as unknown as LeadRow[])
    : (fixtureLeads as unknown as LeadRow[]);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || "·";
}

function gradientFor(seed: string): string {
  // Deterministic, stable per-store gradient so the UI doesn't reshuffle.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = h % 360;
  const b = (a + 60) % 360;
  return `linear-gradient(135deg, hsl(${a} 70% 55% / 0.35), hsl(${b} 70% 40% / 0.35))`;
}

export default async function LeadsPage() {
  const leads = await loadLeads();

  return (
    <>
      <TopBar
        eyebrow="Lead lab"
        title="Storefronts you can pitch"
        subtitle="Shopify stores, discovered and enriched. Ready for the outreach crew."
        action={<DiscoverButton />}
      />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
                className="group relative overflow-hidden rounded-xl2 border border-line-1 bg-base-1 p-5 transition hover:-translate-y-0.5 hover:border-volt/40 hover:shadow-glow"
              >
                <div
                  className="absolute inset-x-0 top-0 h-24 opacity-80 transition group-hover:opacity-100"
                  style={{ background: gradientFor(l.storeName) }}
                />
                <div className="relative flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl2 border border-line-2 bg-base-0 font-display text-base text-ink-hi">
                    {initials(l.storeName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-[15px] tracking-tight text-ink-hi">
                      {l.storeName}
                    </div>
                    <div className="truncate font-mono text-[11px] text-ink-mid">
                      {host}
                    </div>
                  </div>
                </div>

                <dl className="relative mt-5 space-y-2 text-[12px]">
                  <div className="flex items-center justify-between">
                    <dt className="font-mono uppercase tracking-wider text-ink-dim">Email</dt>
                    <dd className="truncate text-ink-hi">
                      {l.email ?? <span className="text-ink-dim">unknown</span>}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-mono uppercase tracking-wider text-ink-dim">Added</dt>
                    <dd className="text-ink-mid">
                      {new Date(l.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </dd>
                  </div>
                </dl>

                <div className="relative mt-5 flex items-center justify-between">
                  <a
                    href={l.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] text-ink-mid hover:text-volt"
                  >
                    Visit ↗
                  </a>
                  <button
                    className="btn-ink h-8 px-3 text-[12px]"
                    disabled={!l.email}
                    title={l.email ? "Draft outreach" : "No email on file"}
                  >
                    Pitch →
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {leads.length === 0 && (
          <div className="card grid place-items-center p-20 text-center">
            <div className="font-display text-xl text-ink-mid">
              No leads yet — click "Discover stores" to run a niche search.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
