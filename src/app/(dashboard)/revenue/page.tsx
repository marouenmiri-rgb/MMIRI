import { TopBar } from "@/components/TopBar";
import { RevenuePulse } from "@/components/RevenuePulse";
import { PlatformIcon, PLATFORM_META, type PlatformKey } from "@/components/PlatformIcon";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { getCurrentUserId } from "@/lib/auth";
import { fixtureRevenue } from "@/lib/fixtures";
import { RevenueFeed } from "./RevenueFeed";

type Summary = Awaited<ReturnType<typeof loadSummary>>;

async function loadSummary() {
  if (!hasDb) return fixtureRevenue;
  const userId = await getCurrentUserId();
  if (!userId) return fixtureRevenue;

  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

  const [links, conversions, publishedPosts, topAgg] = await Promise.all([
    db.trackingLink.findMany({
      where: { userId },
      select: {
        clicks: true,
        conversions: true,
        revenueCents: true,
        socialPost: { select: { platform: true } },
      },
    }),
    db.conversion.findMany({
      where: { userId, occurredAt: { gte: since } },
      orderBy: { occurredAt: "asc" },
      include: {
        link: {
          include: {
            socialPost: {
              select: {
                platform: true,
                ad: { select: { productTitle: true } },
              },
            },
          },
        },
      },
    }),
    db.socialPost.findMany({
      where: { userId, status: "PUBLISHED" },
      select: { platform: true },
    }),
    db.trackingLink.groupBy({
      by: ["adId"],
      where: { userId, adId: { not: null } },
      _sum: { revenueCents: true, clicks: true, conversions: true },
      orderBy: { _sum: { revenueCents: "desc" } },
      take: 5,
    }),
  ]);

  const totals = {
    clicks: links.reduce((s, l) => s + l.clicks, 0),
    conversions: links.reduce((s, l) => s + l.conversions, 0),
    revenueCents: links.reduce((s, l) => s + l.revenueCents, 0),
  };

  const byPlatform: Record<
    PlatformKey,
    { clicks: number; conversions: number; revenueCents: number; posts: number }
  > = {
    TIKTOK: { clicks: 0, conversions: 0, revenueCents: 0, posts: 0 },
    INSTAGRAM: { clicks: 0, conversions: 0, revenueCents: 0, posts: 0 },
    YOUTUBE: { clicks: 0, conversions: 0, revenueCents: 0, posts: 0 },
    X: { clicks: 0, conversions: 0, revenueCents: 0, posts: 0 },
  };
  for (const l of links) {
    const p = l.socialPost?.platform as PlatformKey | undefined;
    if (!p) continue;
    byPlatform[p].clicks += l.clicks;
    byPlatform[p].conversions += l.conversions;
    byPlatform[p].revenueCents += l.revenueCents;
  }
  for (const post of publishedPosts) byPlatform[post.platform as PlatformKey].posts += 1;

  const adIds = topAgg.map((r) => r.adId).filter(Boolean) as string[];
  const adRows = adIds.length
    ? await db.ad.findMany({
        where: { id: { in: adIds } },
        select: { id: true, productTitle: true, thumbnailUrl: true },
      })
    : [];
  const byId = new Map(adRows.map((a) => [a.id, a]));

  const topAds = topAgg.map((r) => ({
    adId: r.adId!,
    title: byId.get(r.adId!)?.productTitle ?? "Untitled",
    thumbnailUrl: byId.get(r.adId!)?.thumbnailUrl ?? null,
    revenueCents: r._sum.revenueCents ?? 0,
    clicks: r._sum.clicks ?? 0,
    conversions: r._sum.conversions ?? 0,
  }));

  const byDay = new Map<string, number>();
  for (const c of conversions) {
    const k = c.occurredAt.toISOString().slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + c.revenueCents);
  }
  const series: { day: string; cents: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const k = d.toISOString().slice(0, 10);
    series.push({ day: k, cents: byDay.get(k) ?? 0 });
  }

  const recent = conversions.slice(-20).reverse().map((c) => ({
    id: c.id,
    revenueCents: c.revenueCents,
    currency: c.currency,
    occurredAt: c.occurredAt.toISOString(),
    platform: (c.link.socialPost?.platform as PlatformKey | null) ?? null,
    adTitle: c.link.socialPost?.ad?.productTitle ?? null,
  }));

  return { totals, byPlatform, topAds, series, recent };
}

export default async function RevenuePage() {
  const data: Summary = await loadSummary();
  const cvr =
    data.totals.clicks > 0
      ? (data.totals.conversions / data.totals.clicks) * 100
      : 0;
  const aov =
    data.totals.conversions > 0
      ? data.totals.revenueCents / data.totals.conversions
      : 0;

  return (
    <>
      <TopBar
        eyebrow="Revenue desk"
        title="Revenue Pulse"
        subtitle="Every dollar a post earns, attributed to the exact ad and platform that drove it."
        action={
          <a href="/generator" className="btn-primary">
            Make more revenue →
          </a>
        }
      />

      <div className="space-y-8 p-8">
        <RevenuePulse
          series={data.series}
          totalCents={data.totals.revenueCents}
        />

        {/* Tiles */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Tile label="Clicks" value={formatNum(data.totals.clicks)} sub="tracked" />
          <Tile
            label="Conversions"
            value={formatNum(data.totals.conversions)}
            sub={`${cvr.toFixed(1)}% CVR`}
          />
          <Tile
            label="AOV"
            value={money(aov)}
            sub="avg order"
            accent
          />
          <Tile
            label="Revenue / post"
            value={money(
              totalPublished(data) > 0
                ? data.totals.revenueCents / totalPublished(data)
                : 0,
            )}
            sub={`${totalPublished(data)} published`}
            accent
          />
        </section>

        {/* Leaderboard */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                Channel leaderboard
              </div>
              <h2 className="mt-1 font-display text-2xl tracking-tight">
                Who's bringing the money
              </h2>
            </div>
          </div>
          <Leaderboard byPlatform={data.byPlatform} />
        </section>

        {/* Top ads */}
        <section>
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            Top earning ads
          </div>
          {data.topAds.length === 0 ? (
            <div className="card grid place-items-center p-12 text-center text-sm text-ink-mid">
              No attributed revenue yet. Ship a post — the UTM-tagged short
              links handle attribution automatically.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {data.topAds.map((a, i) => (
                <li key={a.adId} className="card flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl2 border border-line-2 bg-base-2 font-display text-base text-ink-hi">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  {a.thumbnailUrl && (
                    <img
                      src={a.thumbnailUrl}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-ink-hi">
                      {a.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-ink-mid">
                      {a.clicks} clicks · {a.conversions} conversions
                    </div>
                  </div>
                  <div className="font-display text-xl tracking-tight text-lime">
                    {money(a.revenueCents)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Live feed */}
        <section>
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            Live conversion feed
          </div>
          <RevenueFeed initial={data.recent} />
        </section>
      </div>
    </>
  );
}

function totalPublished(data: Summary): number {
  return Object.values(data.byPlatform).reduce((s, p) => s + p.posts, 0);
}

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="card relative overflow-hidden p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
        {label}
      </div>
      <div
        className={
          "mt-3 font-display text-4xl tracking-tightest " +
          (accent ? "text-lime" : "text-ink-hi")
        }
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] text-ink-mid">{sub}</div>
    </div>
  );
}

function Leaderboard({
  byPlatform,
}: {
  byPlatform: Summary["byPlatform"];
}) {
  const entries = (Object.keys(byPlatform) as PlatformKey[])
    .map((p) => ({ platform: p, ...byPlatform[p] }))
    .sort((a, b) => b.revenueCents - a.revenueCents);
  const max = Math.max(1, ...entries.map((e) => e.revenueCents));

  return (
    <div className="card overflow-hidden">
      <ul>
        {entries.map((e) => {
          const meta = PLATFORM_META[e.platform];
          const pct = (e.revenueCents / max) * 100;
          return (
            <li
              key={e.platform}
              className="grid grid-cols-[160px_1fr_auto] items-center gap-4 border-t border-line-1 px-5 py-4 first:border-t-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md"
                  style={{ background: meta.color, color: meta.textOn }}
                >
                  <PlatformIcon platform={e.platform} className="h-3.5 w-3.5" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mid">
                  {meta.label}
                </span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-base-3">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${meta.color}, ${meta.color}aa)`,
                  }}
                />
              </div>
              <div className="text-right">
                <div className="font-display text-base text-ink-hi">
                  {money(e.revenueCents)}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                  {e.conversions} conv · {e.clicks} clicks
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function money(cents: number): string {
  const v = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: v >= 100 ? 0 : 2,
    }).format(v);
  } catch {
    return `$${v.toFixed(2)}`;
  }
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
