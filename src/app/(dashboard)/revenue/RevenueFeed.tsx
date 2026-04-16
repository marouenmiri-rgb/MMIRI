"use client";

import { useEffect, useState } from "react";
import { PlatformIcon, PLATFORM_META, type PlatformKey } from "@/components/PlatformIcon";

type Event = {
  id: string;
  revenueCents: number;
  currency: string;
  occurredAt: string;
  platform: PlatformKey | null;
  adTitle: string | null;
};

/**
 * Live conversion feed. Polls /api/analytics/summary every 30s and
 * animates new events in with a lime ripple so the page stays alive
 * during a demo call.
 */
export function RevenueFeed({ initial }: { initial: Event[] }) {
  const [events, setEvents] = useState<Event[]>(initial);
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const tick = async () => {
      try {
        const r = await fetch("/api/analytics/summary");
        if (!r.ok) return;
        const data = await r.json();
        setEvents((prev) => {
          const prevIds = new Set(prev.map((e) => e.id));
          const fresh = (data.recent as Event[]).filter((e) => !prevIds.has(e.id));
          if (fresh.length === 0) return data.recent ?? prev;
          setJustAdded((s) => new Set([...s, ...fresh.map((e) => e.id)]));
          setTimeout(() => {
            setJustAdded((s) => {
              const n = new Set(s);
              for (const e of fresh) n.delete(e.id);
              return n;
            });
          }, 2000);
          return data.recent ?? prev;
        });
      } catch {
        /* swallow */
      }
    };
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, []);

  if (events.length === 0) {
    return (
      <div className="card grid place-items-center p-12 text-center text-sm text-ink-mid">
        No conversions yet. The Shopify webhook at{" "}
        <code className="ml-1 font-mono text-volt">
          /api/webhooks/shopify/orders
        </code>{" "}
        matches orders to posts via <code className="font-mono">utm_content</code>.
      </div>
    );
  }

  return (
    <ul className="card divide-y divide-line-1 overflow-hidden">
      {events.map((e) => {
        const meta = e.platform ? PLATFORM_META[e.platform] : null;
        const fresh = justAdded.has(e.id);
        return (
          <li
            key={e.id}
            className={
              "flex items-center gap-4 px-5 py-3 transition " +
              (fresh ? "bg-lime/10" : "")
            }
          >
            {meta ? (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: meta.color, color: meta.textOn }}
              >
                <PlatformIcon platform={e.platform!} className="h-4 w-4" />
              </span>
            ) : (
              <span className="h-8 w-8 rounded-lg border border-line-2 bg-base-2" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-ink-hi">
                {e.adTitle ?? "Untitled ad"}
              </div>
              <div className="font-mono text-[11px] text-ink-mid">
                {new Date(e.occurredAt).toLocaleString()}
              </div>
            </div>
            <div
              className={
                "font-display text-lg tracking-tight " +
                (fresh ? "text-lime" : "text-ink-hi")
              }
            >
              +{money(e.revenueCents, e.currency)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function money(cents: number, currency = "USD"): string {
  const v = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: v >= 100 ? 0 : 2,
    }).format(v);
  } catch {
    return `$${v.toFixed(2)}`;
  }
}
