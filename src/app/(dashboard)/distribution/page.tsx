import { TopBar } from "@/components/TopBar";
import { Launchpad, type LaunchpadConnection } from "@/components/Launchpad";
import {
  DistributionTimeline,
  type TimelinePost,
} from "@/components/DistributionTimeline";
import { PlatformIcon, PLATFORM_META, type PlatformKey } from "@/components/PlatformIcon";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { getCurrentUserId } from "@/lib/auth";
import { allPlatformMeta } from "@/social/registry";
import { fixtureDistribution } from "@/lib/fixtures";

type PageProps = { searchParams: { connected?: string; demo?: string; err?: string } };

async function load(): Promise<{
  connections: Record<PlatformKey, LaunchpadConnection | null>;
  posts: TimelinePost[];
  credentialed: Record<PlatformKey, boolean>;
}> {
  const credentialed = Object.fromEntries(
    allPlatformMeta().map((m) => [m.platform, m.hasCredentials]),
  ) as Record<PlatformKey, boolean>;

  const empty: Record<PlatformKey, LaunchpadConnection | null> = {
    TIKTOK: null,
    INSTAGRAM: null,
    YOUTUBE: null,
    X: null,
  };

  if (!hasDb) {
    return {
      connections: fixtureDistribution.connections,
      posts: fixtureDistribution.posts,
      credentialed,
    };
  }
  const userId = await getCurrentUserId();
  if (!userId) {
    return { connections: empty, posts: [], credentialed };
  }

  const [rows, posts] = await Promise.all([
    db.socialConnection.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            posts: { where: { status: { in: ["SCHEDULED", "PUBLISHING"] } } },
          },
        },
        posts: {
          where: { status: "PUBLISHED" },
          select: { id: true },
        },
      },
    }),
    db.socialPost.findMany({
      where: { userId },
      orderBy: { scheduledFor: "asc" },
      take: 200,
      include: {
        ad: { select: { productTitle: true, thumbnailUrl: true } },
      },
    }),
  ]);

  const connections: Record<PlatformKey, LaunchpadConnection | null> = { ...empty };
  for (const r of rows) {
    connections[r.platform as PlatformKey] = {
      id: r.id,
      platform: r.platform as PlatformKey,
      handle: r.handle,
      demo: r.demo,
      queued: r._count.posts,
      published: r.posts.length,
    };
  }

  return {
    connections,
    credentialed,
    posts: posts.map((p) => ({
      id: p.id,
      platform: p.platform as PlatformKey,
      scheduledFor: p.scheduledFor,
      status: p.status,
      externalUrl: p.externalUrl,
      ad: p.ad ? { productTitle: p.ad.productTitle, thumbnailUrl: p.ad.thumbnailUrl } : null,
    })),
  };
}

export default async function DistributionPage({ searchParams }: PageProps) {
  const { connections, posts, credentialed } = await load();

  // Recent drops (last 8 published)
  const recent = posts
    .filter((p) => p.status === "PUBLISHED")
    .sort(
      (a, b) =>
        +new Date(b.scheduledFor) - +new Date(a.scheduledFor),
    )
    .slice(0, 8);

  const banner = bannerFor(searchParams);

  return (
    <>
      <TopBar
        eyebrow="Distribution"
        title="Autopilot"
        subtitle="Connect TikTok, Instagram, YouTube, X. Schedule once. The lab ships while you sleep."
        action={
          <a href="/generator" className="btn-primary">
            Ship an ad →
          </a>
        }
      />

      <div className="space-y-8 p-8">
        {banner && (
          <div
            className={
              banner.tone === "ok"
                ? "card p-4 text-sm text-lime border-lime/30"
                : "card p-4 text-sm text-danger border-danger/30"
            }
          >
            {banner.text}
          </div>
        )}

        {/* Launchpad */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                Launchpad
              </div>
              <h2 className="mt-1 font-display text-2xl tracking-tight">
                Your channels
              </h2>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-dim">
              {
                Object.values(connections).filter(Boolean).length
              }{" "}
              / 4 linked
            </span>
          </div>
          <Launchpad connections={connections} credentialed={credentialed} />
        </section>

        {/* Timeline */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                Next 7 days
              </div>
              <h2 className="mt-1 font-display text-2xl tracking-tight">
                Launch grid
              </h2>
            </div>
            <span className="flex items-center gap-3 text-[11px] text-ink-mid">
              <LegendSwatch color="#a78bfa" label="scheduled" />
              <LegendSwatch color="#c3ff3e" label="published" />
              <LegendSwatch color="#ef4444" label="failed" />
            </span>
          </div>
          <DistributionTimeline posts={posts} />
        </section>

        {/* Recent drops */}
        <section>
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            Recent drops
          </div>
          {recent.length === 0 ? (
            <div className="card grid place-items-center p-12 text-center text-sm text-ink-mid">
              No posts shipped yet. Connect a channel, then head to the generator
              to launch one.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {recent.map((p) => {
                const meta = PLATFORM_META[p.platform];
                return (
                  <li
                    key={p.id}
                    className="card flex items-center gap-4 p-4"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl2"
                      style={{ background: meta.color, color: meta.textOn }}
                    >
                      <PlatformIcon platform={p.platform} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink-hi">
                        {p.ad?.productTitle ?? "Untitled"}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-ink-mid">
                        {meta.label} ·{" "}
                        {new Date(p.scheduledFor).toLocaleString()}
                      </div>
                    </div>
                    {p.externalUrl ? (
                      <a
                        href={p.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost h-8 px-3 text-[12px]"
                      >
                        Open ↗
                      </a>
                    ) : (
                      <span className="pill border border-line-2 bg-base-2 text-ink-mid">
                        no link
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2 w-4 rounded-sm"
        style={{ background: color, opacity: 0.4, border: `1px solid ${color}` }}
      />
      <span className="font-mono uppercase tracking-wider">{label}</span>
    </span>
  );
}

function bannerFor(
  s: PageProps["searchParams"],
): { tone: "ok" | "err"; text: string } | null {
  if (s.connected) {
    return {
      tone: "ok",
      text:
        s.demo === "1"
          ? `${PLATFORM_META[s.connected as PlatformKey]?.label ?? s.connected} linked in demo mode — posts publish to a simulated URL.`
          : `${PLATFORM_META[s.connected as PlatformKey]?.label ?? s.connected} linked · autopilot armed.`,
    };
  }
  if (s.err) {
    return { tone: "err", text: `Connection failed: ${s.err}` };
  }
  return null;
}
