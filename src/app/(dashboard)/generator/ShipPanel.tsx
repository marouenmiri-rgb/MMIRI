"use client";

import { useEffect, useState } from "react";
import { PlatformIcon, PLATFORM_META, type PlatformKey } from "@/components/PlatformIcon";

type Connection = {
  id: string;
  platform: PlatformKey;
  handle: string | null;
  demo: boolean;
};

type Captions = Record<Lowercase<PlatformKey>, string>;

const ORDER: PlatformKey[] = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "X"];

const PRESETS: { label: string; value: "now" | "+1h" | "+6h" | "+24h" }[] = [
  { label: "Launch now", value: "now" },
  { label: "+1h", value: "+1h" },
  { label: "+6h", value: "+6h" },
  { label: "Tomorrow", value: "+24h" },
];

export function ShipPanel({ adId, isReady }: { adId: string; isReady: boolean }) {
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [selected, setSelected] = useState<Record<PlatformKey, boolean>>({
    TIKTOK: false,
    INSTAGRAM: false,
    YOUTUBE: false,
    X: false,
  });
  const [captions, setCaptions] = useState<Captions>({
    tiktok: "",
    instagram: "",
    youtube: "",
    x: "",
  });
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["value"]>("now");
  const [custom, setCustom] = useState<string>("");
  const [genBusy, setGenBusy] = useState(false);
  const [shipBusy, setShipBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/social/connections")
      .then((r) => (r.ok ? r.json() : { connections: [] }))
      .then((b) => {
        setConnections(b.connections);
        const next = { ...selected };
        for (const c of b.connections as Connection[]) next[c.platform] = true;
        setSelected(next);
      })
      .catch(() => setConnections([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateCaptions() {
    setGenBusy(true);
    try {
      const r = await fetch("/api/social/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { captions } = await r.json();
      setCaptions(captions);
    } catch (e) {
      setResult(`Caption error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setGenBusy(false);
    }
  }

  async function ship() {
    setShipBusy(true);
    setResult(null);
    try {
      const chosen = (Object.keys(selected) as PlatformKey[]).filter(
        (p) => selected[p] && connections?.some((c) => c.platform === p),
      );
      if (chosen.length === 0) {
        setResult("Select at least one connected platform.");
        setShipBusy(false);
        return;
      }
      const posts = chosen.map((p) => ({
        platform: p,
        caption:
          captions[p.toLowerCase() as Lowercase<PlatformKey>] ||
          "Check this out.",
      }));

      const scheduledFor = buildScheduleIso(preset, custom);
      const body = {
        adId,
        posts,
        deliver: preset === "now" ? ("now" as const) : ("scheduled" as const),
        ...(preset !== "now" ? { scheduledFor } : {}),
      };

      const r = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setResult(
        preset === "now"
          ? `Shipped to ${chosen.length} channel${chosen.length === 1 ? "" : "s"}.`
          : `Scheduled ${chosen.length} post${chosen.length === 1 ? "" : "s"} for ${new Date(scheduledFor).toLocaleString()}.`,
      );
    } catch (e) {
      setResult(e instanceof Error ? e.message : String(e));
    } finally {
      setShipBusy(false);
    }
  }

  if (!isReady) {
    return (
      <section className="card p-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
          Ship
        </div>
        <p className="mt-2 text-sm text-ink-mid">
          Once rendering finishes, this panel unlocks to post the ad to your
          connected channels.
        </p>
      </section>
    );
  }

  const connected = new Set(connections?.map((c) => c.platform) ?? []);
  const anyConnected = connected.size > 0;

  return (
    <section className="card relative overflow-hidden p-6">
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-volt/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
              Ship to socials
            </div>
            <h3 className="mt-1 font-display text-xl tracking-tight">
              Launch or schedule across channels
            </h3>
          </div>
          <button
            type="button"
            onClick={generateCaptions}
            disabled={genBusy}
            className="btn-ink h-8 px-3 text-[12px]"
          >
            {genBusy ? "Drafting…" : "AI captions"}
          </button>
        </div>

        {!anyConnected && (
          <div className="mt-4 rounded-xl2 border border-line-2 bg-base-2 p-4 text-sm">
            <div className="font-medium text-ink-hi">No channels linked yet</div>
            <div className="mt-1 text-ink-mid">
              Head to{" "}
              <a className="text-volt hover:underline" href="/distribution">
                Autopilot
              </a>{" "}
              to connect TikTok, Instagram, YouTube, or X (demo-mode works
              without OAuth keys).
            </div>
          </div>
        )}

        {/* Platform chips */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {ORDER.map((p) => {
            const meta = PLATFORM_META[p];
            const isConnected = connected.has(p);
            const conn = connections?.find((c) => c.platform === p) ?? null;
            const isOn = selected[p] && isConnected;
            return (
              <button
                key={p}
                type="button"
                disabled={!isConnected}
                onClick={() =>
                  setSelected((s) => ({ ...s, [p]: !s[p] }))
                }
                className={
                  "flex items-center gap-3 rounded-xl2 border p-3 text-left transition " +
                  (isOn
                    ? "border-volt/50 bg-base-2 shadow-glow"
                    : isConnected
                      ? "border-line-2 bg-base-2 hover:border-line-3"
                      : "border-line-1 bg-base-1 opacity-50")
                }
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    background: meta.color,
                    color: meta.textOn,
                  }}
                >
                  <PlatformIcon platform={p} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-ink-hi">
                    {meta.label}
                  </div>
                  <div className="truncate font-mono text-[10px] text-ink-mid">
                    {conn?.handle
                      ? `${meta.handlePrefix}${conn.handle}`
                      : isConnected
                        ? "linked"
                        : "not linked"}
                  </div>
                </div>
                {isOn && <span className="text-volt">●</span>}
              </button>
            );
          })}
        </div>

        {/* Per-platform captions */}
        <div className="mt-5 space-y-3">
          {ORDER.filter((p) => selected[p] && connected.has(p)).map((p) => {
            const key = p.toLowerCase() as Lowercase<PlatformKey>;
            const meta = PLATFORM_META[p];
            return (
              <div
                key={p}
                className="rounded-xl2 border border-line-1 bg-base-2 p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-md"
                    style={{ background: meta.color, color: meta.textOn }}
                  >
                    <PlatformIcon platform={p} className="h-3 w-3" />
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink-mid">
                    {meta.label}
                  </span>
                </div>
                <textarea
                  value={captions[key]}
                  onChange={(e) =>
                    setCaptions((c) => ({ ...c, [key]: e.target.value }))
                  }
                  placeholder={
                    genBusy
                      ? "AI is writing…"
                      : "Caption for this platform (or click AI captions)"
                  }
                  rows={2}
                  className="mt-2 w-full resize-y bg-transparent font-mono text-[12px] text-ink-hi placeholder:text-ink-dim outline-none"
                />
              </div>
            );
          })}
        </div>

        {/* Schedule */}
        <div className="mt-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
            When
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {PRESETS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPreset(opt.value)}
                className={
                  "pill border transition " +
                  (preset === opt.value
                    ? "border-volt bg-volt/15 text-volt"
                    : "border-line-2 bg-base-2 text-ink-mid hover:text-ink-hi")
                }
              >
                {opt.label}
              </button>
            ))}
            <input
              type="datetime-local"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                if (e.target.value) setPreset("+24h");
              }}
              className="input w-60 font-mono text-[12px]"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-[11px] text-ink-mid">
            {result ?? (preset === "now" ? "Publishes immediately." : "Scheduled — the cron publisher takes it from here.")}
          </div>
          <button
            className={preset === "now" ? "btn-lime" : "btn-primary"}
            onClick={ship}
            disabled={shipBusy || !anyConnected}
          >
            {shipBusy ? "Working…" : preset === "now" ? "Launch now" : "Schedule"}
          </button>
        </div>
      </div>
    </section>
  );
}

function buildScheduleIso(
  preset: "now" | "+1h" | "+6h" | "+24h",
  custom: string,
): string {
  if (custom) return new Date(custom).toISOString();
  const hours = preset === "+1h" ? 1 : preset === "+6h" ? 6 : preset === "+24h" ? 24 : 0;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}
