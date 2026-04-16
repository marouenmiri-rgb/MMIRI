"use client";

import clsx from "clsx";
import { PLATFORM_META, PlatformIcon, type PlatformKey } from "./PlatformIcon";

export type TimelinePost = {
  id: string;
  platform: PlatformKey;
  scheduledFor: string | Date;
  status: "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "DRAFT";
  externalUrl: string | null;
  ad: { productTitle: string | null; thumbnailUrl: string | null } | null;
};

const PLATFORMS: PlatformKey[] = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "X"];
const HOURS = 24;

/**
 * Horizontal timeline with one swim lane per platform. Shows a 7-day
 * window starting today. Each post is a chip positioned at its
 * scheduled hour. Published = lime, scheduled = volt, failed = danger.
 */
export function DistributionTimeline({ posts }: { posts: TimelinePost[] }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  const byPlatform: Record<PlatformKey, TimelinePost[]> = {
    TIKTOK: [],
    INSTAGRAM: [],
    YOUTUBE: [],
    X: [],
  };
  for (const p of posts) byPlatform[p.platform].push(p);

  return (
    <div className="card overflow-hidden">
      {/* Header row: day markers */}
      <div className="grid grid-cols-[120px_repeat(7,_minmax(0,_1fr))] border-b border-line-1">
        <div className="flex items-center px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-dim">
          Launch grid
        </div>
        {days.map((d, i) => {
          const isToday = sameDay(d, new Date());
          return (
            <div
              key={i}
              className={clsx(
                "border-l border-line-1 px-3 py-3",
                isToday ? "bg-base-2" : "",
              )}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </div>
              <div
                className={clsx(
                  "mt-0.5 font-display text-sm tracking-tight",
                  isToday ? "text-volt" : "text-ink-hi",
                )}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Swim lanes */}
      {PLATFORMS.map((p) => {
        const meta = PLATFORM_META[p];
        return (
          <div
            key={p}
            className="grid grid-cols-[120px_repeat(7,_minmax(0,_1fr))] border-b border-line-1 last:border-b-0"
          >
            <div className="flex items-center gap-2 px-4 py-4">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{ background: meta.color, color: meta.textOn }}
              >
                <PlatformIcon platform={p} className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mid">
                {meta.label}
              </span>
            </div>
            {days.map((d, i) => {
              const dayPosts = byPlatform[p].filter((post) =>
                sameDay(new Date(post.scheduledFor), d),
              );
              return (
                <div
                  key={i}
                  className="relative border-l border-line-1 bg-base-1/30 min-h-[54px]"
                >
                  {dayPosts.map((post) => (
                    <PostChip key={post.id} post={post} color={meta.color} />
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function PostChip({ post, color }: { post: TimelinePost; color: string }) {
  const scheduled = new Date(post.scheduledFor);
  const pctFromTop = Math.min(
    0.92,
    (scheduled.getHours() + scheduled.getMinutes() / 60) / HOURS,
  );
  const title = post.ad?.productTitle ?? "Untitled";

  const body =
    post.status === "PUBLISHED" ? (
      <a
        href={post.externalUrl ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="block rounded-md border border-lime/40 bg-lime/15 px-2 py-1 text-[11px] text-lime hover:bg-lime/25"
        title={`Published · ${title}`}
      >
        <span className="font-mono">
          {scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>{" "}
        {title}
      </a>
    ) : post.status === "FAILED" ? (
      <div
        className="rounded-md border border-danger/40 bg-danger/15 px-2 py-1 text-[11px] text-danger"
        title={`Failed · ${title}`}
      >
        <span className="font-mono">
          {scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>{" "}
        failed
      </div>
    ) : (
      <div
        className="rounded-md border px-2 py-1 text-[11px]"
        style={{
          borderColor: `${color}66`,
          background: `${color}22`,
          color,
        }}
        title={`${post.status.toLowerCase()} · ${title}`}
      >
        <span className="font-mono">
          {scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>{" "}
        {title}
      </div>
    );

  return (
    <div
      className="absolute left-1 right-1"
      style={{ top: `${pctFromTop * 100}%` }}
    >
      {body}
    </div>
  );
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
