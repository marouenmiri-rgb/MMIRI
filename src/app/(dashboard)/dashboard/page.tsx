import { TopBar } from "@/components/TopBar";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { getCurrentUserId } from "@/lib/auth";
import { AgentPipeline } from "@/components/AgentPipeline";
import { AdReelCard } from "@/components/AdReelCard";
import { Sparkline } from "@/components/Sparkline";
import { HeroCapture } from "./HeroCapture";
import { themeColor } from "@/lib/theme";

async function loadAds() {
  if (!hasDb) return [];
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const ads = await db.ad.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 18,
  });
  return ads as unknown as AdRow[];
}

/** Counts per day for the last 10 days, oldest first. */
function dailySeries(dates: Date[]): number[] {
  const buckets = new Map<string, number>();
  for (const d of dates) {
    const k = d.toISOString().slice(0, 10);
    buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  const out: number[] = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(buckets.get(d.toISOString().slice(0, 10)) ?? 0);
  }
  return out;
}

/**
 * Every figure and every sparkline point below is counted from real rows. The
 * trend lines used to be hard-coded, which meant a rising curve sat under a
 * zero on a brand new account.
 */
async function loadStats() {
  const empty = {
    adsReadyDates: [] as Date[],
    leadDates: [] as Date[],
    replyDates: [] as Date[],
    leadsTotal: 0,
    repliesThisWeek: 0,
  };
  if (!hasDb) return empty;
  const userId = await getCurrentUserId();
  if (!userId) return empty;

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 9);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [readyAds, leads, leadsTotal, replies, repliesThisWeek] =
    await Promise.all([
      db.ad.findMany({
        where: { userId, status: "READY", createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      db.lead.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      db.lead.count({ where: { userId } }),
      db.outreach.findMany({
        where: { campaign: { userId }, repliedAt: { gte: since } },
        select: { repliedAt: true },
      }),
      db.outreach.count({
        where: { campaign: { userId }, repliedAt: { gte: weekAgo } },
      }),
    ]);

  return {
    adsReadyDates: readyAds.map((a) => a.createdAt),
    leadDates: leads.map((l) => l.createdAt),
    replyDates: replies.map((r) => r.repliedAt!).filter(Boolean),
    leadsTotal,
    repliesThisWeek,
  };
}

type AdRow = {
  id: string;
  productTitle?: string | null;
  productUrl: string;
  status: string;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  createdAt: string | Date;
};

export default async function DashboardPage() {
  const [ads, s] = await Promise.all([loadAds(), loadStats()]);
  const active = ads.find((a) =>
    ["SCRAPING", "WRITING", "DIRECTING", "RENDERING"].includes(a.status),
  );

  const adsReady = ads.filter((a) => a.status === "READY").length;
  const pipelinesLive = ads.filter((a) =>
    ["SCRAPING", "WRITING", "DIRECTING", "RENDERING"].includes(a.status),
  ).length;

  const stats = [
    {
      label: "Ads shipped",
      value: adsReady.toString().padStart(2, "0"),
      delta: `${s.adsReadyDates.length} in 10 days`,
      trend: dailySeries(s.adsReadyDates),
      color: themeColor.mint,
      fill: themeColor.mintSoft,
    },
    {
      label: "Pipelines live",
      value: pipelinesLive.toString().padStart(2, "0"),
      delta: active ? "rendering" : "idle",
      trend: dailySeries([]),
      color: themeColor.accent,
      fill: themeColor.accentSoft,
    },
    {
      label: "Leads on file",
      value: s.leadsTotal.toString(),
      delta: s.leadsTotal > 0 ? "ready" : "none yet",
      trend: dailySeries(s.leadDates),
      color: themeColor.accent,
      fill: themeColor.accentSoft,
    },
    {
      label: "Replies this week",
      value: s.repliesThisWeek.toString(),
      delta: s.repliesThisWeek > 0 ? "this week" : "first send pending",
      trend: dailySeries(s.replyDates),
      color: themeColor.mint,
      fill: themeColor.mintSoft,
    },
  ];

  return (
    <>
      <TopBar
        eyebrow="Control room"
        title="Director's dashboard"
        subtitle="One URL in. One vertical ad out. Watch the lab work."
        action={
          <span className="chip-live">
            <span className="dot-live" /> {active ? "Pipeline live" : "Standby"}
          </span>
        }
      />

      <div className="space-y-10 p-8">
        {/* Hero capture — the primary interaction */}
        <section className="relative">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                New ad
              </div>
              <h2 className="mt-1 font-display text-2xl tracking-tight">
                Paste a product URL. The lab does the rest.
              </h2>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-dim">
              Or press <span className="kbd">⌘</span>
              <span className="kbd">K</span>
            </span>
          </div>
          <HeroCapture />
        </section>

        {/* Live pipeline strip */}
        <section className="glass relative overflow-hidden p-7">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
              Active pipeline
            </div>
            <div className="text-xs text-ink-mid">
              {active ? (
                <>
                  <span className="font-mono">#{active.id.slice(0, 6)}</span> ·{" "}
                  <span className="text-ink-hi">{active.productTitle ?? active.productUrl}</span>
                </>
              ) : (
                "No job running — paste a URL above"
              )}
            </div>
          </div>
          <AgentPipeline current={active?.status ?? null} />
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="glass relative overflow-hidden p-6 transition duration-500 ease-ios hover:-translate-y-0.5"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-dim">
                {s.label}
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <div className="font-display text-5xl font-semibold tracking-ultratight text-ink-hi">
                  {s.value}
                </div>
                <div className="text-[11px] text-ink-mid">{s.delta}</div>
              </div>
              <div className="mt-4 -mx-1">
                <Sparkline values={s.trend} stroke={s.color} fill={s.fill} />
              </div>
            </div>
          ))}
        </section>

        {/* Reel wall */}
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-volt">
                Reel wall
              </div>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tightest">
                Your last {ads.length} cuts
              </h2>
            </div>
          </div>
          {ads.length === 0 ? (
            <div className="glass grid place-items-center p-16 text-center">
              <div className="font-display text-xl text-ink-mid">
                No ads yet — paste a URL above to make one.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {ads.map((ad) => (
                <AdReelCard key={ad.id} ad={ad} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
