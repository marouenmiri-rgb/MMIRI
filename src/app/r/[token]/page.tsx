import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { loadClientStats, monthWindow } from "@/lib/clients";
import { PlatformIcon } from "@/components/PlatformIcon";
import type { PlatformKey } from "@/components/PlatformIcon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A client's report is a private link, not a search result.
export const metadata = { robots: { index: false, follow: false } };

function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/**
 * The public, white-label performance report. No login: whoever holds the link
 * can read it, which is what makes it sendable to a client. It shows only that
 * one client's numbers, and never anything about the operator's other clients.
 */
export default async function ClientReport({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { m?: string };
}) {
  if (!hasDb) notFound();

  const client = await db.client.findUnique({
    where: { reportToken: params.token },
  });
  if (!client) notFound();

  // ?m=1 shows last month, so a report sent on the 2nd still reads correctly.
  const monthsAgo = Math.min(Math.max(Number(searchParams.m ?? 0) || 0, 0), 12);
  const window = monthWindow(monthsAgo);
  const stats = await loadClientStats(client.id, window, client.retainerCents);

  const period = window.since.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const accent = client.accentColor;

  return (
    <main
      className="min-h-screen bg-base-0 px-6 py-14"
      style={{ ["--accent-500" as string]: hexToRgbChannels(accent) }}
    >
      <div className="mx-auto max-w-3xl">
        {/* Masthead */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div
              className="font-mono text-[11px] uppercase tracking-[0.24em]"
              style={{ color: accent }}
            >
              Performance report · {period}
            </div>
            <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight text-ink-hi">
              {client.name}
            </h1>
            {client.websiteUrl && (
              <a
                href={client.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[14px] text-ink-mid underline-offset-4 hover:underline"
              >
                {client.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
          <span className="chip-live">
            <span className="dot-live" />
            Live attribution
          </span>
        </header>

        {/* Headline number */}
        <section className="card mt-8 p-7">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-dim">
            Revenue attributed to social
          </div>
          <div className="mt-2 text-[56px] font-bold leading-none tracking-tight text-ink-hi">
            {money(stats.revenueCents, client.currency)}
          </div>

          {stats.returnMultiple !== null ? (
            /* A plain statement of account. Phrasing it as a verdict reads as a
               boast in a good month and an indictment in a slow one; the same
               three figures are honest either way. */
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-line-1 pt-5">
              <Figure
                label="Retainer"
                value={money(stats.retainerCents, client.currency)}
              />
              <Figure
                label="Attributed"
                value={money(stats.revenueCents, client.currency)}
              />
              <Figure
                label="Return"
                value={`${stats.returnMultiple.toFixed(1)}×`}
                accent={accent}
              />
            </div>
          ) : (
            <p className="mt-4 text-[15px] leading-relaxed text-ink-mid">
              Every order below was placed by someone who arrived through a post
              we shipped, matched by its tracking link.
            </p>
          )}
        </section>

        {/* The four numbers a client actually asks about */}
        <section className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Ads produced" value={String(stats.adsShipped)} />
          <Metric label="Posts published" value={String(stats.postsPublished)} />
          <Metric label="Clicks driven" value={stats.clicks.toLocaleString("en-US")} />
          <Metric label="Orders" value={String(stats.conversions)} />
        </section>

        {/* Channels */}
        {stats.byPlatform.length > 0 && (
          <section className="mt-8">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-dim">
              Where the revenue came from
            </h2>
            <div className="card mt-3 divide-y divide-line-1">
              {stats.byPlatform.map((p) => {
                const share =
                  stats.revenueCents > 0
                    ? (p.revenueCents / stats.revenueCents) * 100
                    : 0;
                return (
                  <div key={p.platform} className="flex items-center gap-4 px-5 py-4">
                    <PlatformIcon platform={p.platform as PlatformKey} className="h-6 w-6" />
                    <span className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-mid">
                      {p.platform}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-base-4">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${share}%`, background: accent }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-[14px] font-semibold tabular-nums text-ink-hi">
                      {money(p.revenueCents, client.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Top ads */}
        {stats.topAds.some((a) => a.revenueCents > 0) && (
          <section className="mt-8">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-dim">
              Best performing ads
            </h2>
            <div className="card mt-3 divide-y divide-line-1">
              {stats.topAds
                .filter((a) => a.revenueCents > 0)
                .map((ad, i) => (
                  <div key={ad.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="w-6 shrink-0 font-mono text-[12px] text-ink-dim">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium text-ink-hi">
                        {ad.title}
                      </div>
                      <div className="text-[12px] text-ink-lo">
                        {ad.clicks.toLocaleString("en-US")} clicks
                      </div>
                    </div>
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums text-ink-hi">
                      {money(ad.revenueCents, client.currency)}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {stats.revenueCents === 0 && (
          <p className="mt-8 rounded-2xl border border-line-1 bg-base-3/50 px-5 py-4 text-[14px] leading-relaxed text-ink-mid">
            No attributed orders in {period} yet. Revenue appears here as soon as
            a shopper reaches the store through one of the posts shipped for this
            account.
          </p>
        )}

        <footer className="mt-10 border-t border-line-1 pt-5 text-[12px] leading-relaxed text-ink-dim">
          Figures cover {period} and count only orders whose visit began at a
          tracked post. Organic and paid traffic from other sources is excluded,
          so this understates rather than overstates the contribution.
        </footer>
      </div>
    </main>
  );
}

function Figure({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </div>
      <div
        className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight text-ink-hi"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">
        {label}
      </div>
      <div className="mt-1.5 text-[26px] font-semibold tabular-nums tracking-tight text-ink-hi">
        {value}
      </div>
    </div>
  );
}

/** "#635BFF" -> "99 91 255", the channel form the theme tokens expect. */
function hexToRgbChannels(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "99 91 255";
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}
