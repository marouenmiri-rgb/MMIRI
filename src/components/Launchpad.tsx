"use client";

import { PlatformIcon, PLATFORM_META, type PlatformKey } from "./PlatformIcon";
import { useRouter } from "next/navigation";

export type LaunchpadConnection = {
  id: string;
  platform: PlatformKey;
  handle: string | null;
  demo: boolean;
  queued: number;
  published: number;
};

export function Launchpad({
  connections,
  credentialed,
}: {
  connections: Record<PlatformKey, LaunchpadConnection | null>;
  credentialed: Record<PlatformKey, boolean>;
}) {
  const router = useRouter();
  const order: PlatformKey[] = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "X"];

  async function disconnect(id: string) {
    await fetch(`/api/social/connections/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {order.map((p) => {
        const meta = PLATFORM_META[p];
        const conn = connections[p];
        const connected = Boolean(conn);
        const real = credentialed[p];
        const startUrl = `/api/social/connect/${p.toLowerCase()}/start${real ? "" : "?demo=1"}`;
        return (
          <div
            key={p}
            className="group relative overflow-hidden rounded-xl2 border border-line-1 bg-base-1 transition hover:-translate-y-0.5 hover:border-line-3"
          >
            {/* Brand bar */}
            <div
              className="h-1.5 w-full"
              style={{ background: meta.color }}
            />

            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl2"
                    style={{ background: meta.color, color: meta.textOn }}
                  >
                    <PlatformIcon platform={p} className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display text-[15px] tracking-tight text-ink-hi">
                      {meta.label}
                    </div>
                    <div className="font-mono text-[11px] text-ink-mid">
                      {conn?.handle
                        ? `${meta.handlePrefix}${conn.handle}`
                        : "not linked"}
                    </div>
                  </div>
                </div>
                {connected ? (
                  <span className="chip-live">
                    <span className="dot-live" /> live
                  </span>
                ) : (
                  <span className="pill border border-line-2 bg-base-2 text-ink-mid">
                    offline
                  </span>
                )}
              </div>

              {/* Signal strength bars */}
              <div className="mt-4 flex items-end gap-1" aria-hidden>
                {[0, 1, 2, 3, 4].map((i) => {
                  const active = connected && i < (conn?.demo ? 3 : 5);
                  return (
                    <span
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{
                        height: `${6 + i * 4}px`,
                        background: active
                          ? meta.color
                          : "rgba(255,255,255,0.06)",
                      }}
                    />
                  );
                })}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg border border-line-1 bg-base-2 px-3 py-2">
                  <dt className="font-mono uppercase tracking-wider text-ink-dim">
                    Queued
                  </dt>
                  <dd className="mt-0.5 font-display text-lg text-ink-hi">
                    {conn?.queued ?? 0}
                  </dd>
                </div>
                <div className="rounded-lg border border-line-1 bg-base-2 px-3 py-2">
                  <dt className="font-mono uppercase tracking-wider text-ink-dim">
                    Published
                  </dt>
                  <dd className="mt-0.5 font-display text-lg text-ink-hi">
                    {conn?.published ?? 0}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center justify-between gap-2">
                {connected ? (
                  <>
                    {conn?.demo && (
                      <span className="pill border border-warn/30 bg-warn/10 text-warn">
                        demo mode
                      </span>
                    )}
                    <button
                      className="btn-ink h-8 px-3 text-[12px] ml-auto"
                      onClick={() => conn && disconnect(conn.id)}
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-dim">
                      {real ? "OAuth configured" : "demo auth"}
                    </span>
                    <a
                      href={startUrl}
                      className="btn-primary h-8 px-3 text-[12px] ml-auto"
                      style={{ background: meta.color, color: meta.textOn, boxShadow: "none" }}
                    >
                      Connect →
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
