import { TopBar } from "@/components/TopBar";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { getCurrentUserId } from "@/lib/auth";
import { fixtureAds } from "@/lib/fixtures";
import { AgentPipeline } from "@/components/AgentPipeline";
import { AdReelCard } from "@/components/AdReelCard";
import { Sparkline } from "@/components/Sparkline";
import { HeroCapture } from "./HeroCapture";

async function loadAds() {
  if (!hasDb) return fixtureAds as unknown as AdRow[];
  const userId = await getCurrentUserId();
  if (!userId) return fixtureAds as unknown as AdRow[];
  const ads = await db.ad.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 18,
  });
  return ads.length ? (ads as unknown as AdRow[]) : (fixtureAds as unknown as AdRow[]);
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
  const ads = await loadAds();
  const active = ads.find((a) =>
    ["SCRAPING", "WRITING", "DIRECTING", "RENDERING"].includes(a.status),
  );

  // Fake-but-plausible trend lines for the hero stats row. Wire to real
  // aggregates when usage data exists.
  const stats = [
    {
      label: "Ads shipped",
      value: ads.filter((a) => a.status === "READY").length.toString().padStart(2, "0"),
      delta: "+2 today",
      trend: [2, 3, 3, 5, 4, 6, 8, 7, 9, 11],
      color: "#c3ff3e",
      fill: "rgba(195,255,62,0.15)",
    },
    {
      label: "Pipelines live",
      value: ads.filter((a) =>
        ["SCRAPING", "WRITING", "DIRECTING", "RENDERING"].includes(a.status),
      ).length.toString().padStart(2, "0"),
      delta: active ? "rendering" : "idle",
      trend: [1, 2, 1, 3, 2, 4, 3, 2, 1, 2],
      color: "#a78bfa",
      fill: "rgba(167,139,250,0.14)",
    },
    { label: "Leads on file", value: "0", delta: "ready", trend: [0, 1, 2, 2, 3, 5, 5, 6, 7, 9], color: "#a78bfa", fill: "rgba(167,139,250,0.14)" },
    { label: "Replies this week", value: "0", delta: "first send pending", trend: [0, 0, 1, 1, 2, 2, 3, 4, 4, 5], color: "#c3ff3e", fill: "rgba(195,255,62,0.15)" },
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
        <section className="surface-elevated relative overflow-hidden p-6">
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
            <div key={s.label} className="card relative overflow-hidden p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                {s.label}
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <div className="font-display text-4xl tracking-tightest text-ink-hi">
                  {s.value}
                </div>
                <div className="text-[11px] text-ink-mid">{s.delta}</div>
              </div>
              <div className="mt-3 -mx-1">
                <Sparkline values={s.trend} stroke={s.color} fill={s.fill} />
              </div>
            </div>
          ))}
        </section>

        {/* Reel wall */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                Reel wall
              </div>
              <h2 className="mt-1 font-display text-2xl tracking-tight">
                Your last {ads.length} cuts
              </h2>
            </div>
          </div>
          {ads.length === 0 ? (
            <div className="card grid place-items-center p-16 text-center">
              <div className="font-display text-xl text-ink-mid">
                No ads yet — paste a URL above to make one.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
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
