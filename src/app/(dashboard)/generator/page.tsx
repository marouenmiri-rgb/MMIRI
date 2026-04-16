"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { StatusPill } from "@/components/StatusPill";
import { AgentPipeline, PIPELINE } from "@/components/AgentPipeline";
import { ShipPanel } from "./ShipPanel";

type AdResult = {
  id: string;
  productTitle?: string | null;
  productUrl?: string;
  status: string;
  scriptJson?: {
    hook: string;
    problem: string;
    solution: string;
    cta: string;
    fullScript: string;
  } | null;
  scenesJson?: {
    style: string;
    scenes: { text: string; imageRef: string; durationSec: number }[];
  } | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  error?: string | null;
  updatedAt?: string;
};

export default function GeneratorPage() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [ad, setAd] = useState<AdResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  // If ?id= or ?url= are in the URL, jump to that context.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = new URLSearchParams(window.location.search);
    const id = qs.get("id");
    const preset = qs.get("url");
    if (preset) setUrl(preset);
    if (id) poll(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function writeLog(line: string) {
    setLog((l) => [...l.slice(-29), `${new Date().toLocaleTimeString()}  ${line}`]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setAd(null);
    setLog([]);
    writeLog(`▸ POST /api/ads/generate  productUrl=${url}`);
    try {
      const r = await fetch("/api/ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl: url }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      const { id } = await r.json();
      writeLog(`◂ queued ad ${id}`);
      poll(id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function poll(id: string) {
    setBusy(true);
    let prev = "";
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const r = await fetch(`/api/ads/${id}`);
      if (r.ok) {
        const data = (await r.json()) as AdResult;
        setAd(data);
        if (data.status !== prev) {
          writeLog(`⇒ ${data.status.toLowerCase()}`);
          prev = data.status;
        }
        if (data.status === "READY" || data.status === "FAILED") {
          setBusy(false);
          if (data.status === "FAILED") {
            writeLog(`✕ ${data.error ?? "job failed"}`);
            setErr(data.error ?? "Job failed");
          } else {
            writeLog(`✓ on air`);
          }
          return;
        }
      }
    }
    setBusy(false);
    setErr("Timed out waiting for job to finish");
  }

  return (
    <>
      <TopBar
        eyebrow="Pipeline studio"
        title={ad?.productTitle ?? "New ad"}
        subtitle={
          ad
            ? ad.productUrl ?? "Watching the lab work."
            : "Paste a product URL. Five agents take it from there."
        }
        action={ad ? <StatusPill status={ad.status} /> : null}
      />

      <div className="space-y-8 p-8">
        {/* URL capture */}
        {!ad && (
          <form onSubmit={submit} className="surface-elevated p-6">
            <label className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
              Product URL
            </label>
            <div className="mt-3 flex gap-3">
              <input
                className="input-hero flex-1"
                placeholder="https://yourstore.com/products/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <button className="btn-primary" disabled={busy || !url}>
                {busy ? "Running…" : "Roll pipeline"}
              </button>
            </div>
            {err ? (
              <p className="mt-3 text-sm text-danger">{err}</p>
            ) : (
              <p className="mt-3 text-xs text-ink-dim">
                Shopify & Amazon PDPs work best. Runs: Observe → Write → Direct → Render → Ship.
              </p>
            )}
          </form>
        )}

        {/* Live pipeline — always visible once running */}
        <section className="surface-elevated relative overflow-hidden p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
              Live pipeline
            </div>
            {ad && <span className="font-mono text-xs text-ink-mid">#{ad.id.slice(0, 6)}</span>}
          </div>
          <AgentPipeline current={ad?.status ?? null} />
        </section>

        {ad && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              {/* Script */}
              <section className="card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                      Ad script
                    </div>
                    <h3 className="mt-1 font-display text-xl tracking-tight">Act structure</h3>
                  </div>
                  <StepTag idx={1} />
                </div>
                {ad.scriptJson ? (
                  <>
                    <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {(
                        [
                          ["Hook", ad.scriptJson.hook],
                          ["Problem", ad.scriptJson.problem],
                          ["Solution", ad.scriptJson.solution],
                          ["CTA", ad.scriptJson.cta],
                        ] as const
                      ).map(([k, v]) => (
                        <div key={k} className="rounded-xl2 border border-line-1 bg-base-2 p-4">
                          <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                            {k}
                          </dt>
                          <dd className="mt-2 text-sm leading-relaxed text-ink-hi">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-5 rounded-xl2 border border-line-1 bg-base-0 p-4">
                      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-volt">
                        <span className="dot-live" /> Voice-over
                      </div>
                      <p className="text-sm italic leading-relaxed text-ink-hi">
                        "{ad.scriptJson.fullScript}"
                      </p>
                    </div>
                  </>
                ) : (
                  <SkeletonLines />
                )}
              </section>

              {/* Scenes */}
              <section className="card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                      Shot list
                    </div>
                    <h3 className="mt-1 font-display text-xl tracking-tight">
                      {ad.scenesJson?.style ? `Style: ${ad.scenesJson.style}` : "Scene plan"}
                    </h3>
                  </div>
                  <StepTag idx={2} />
                </div>
                {ad.scenesJson ? (
                  <ol className="space-y-2">
                    {ad.scenesJson.scenes.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-4 rounded-xl2 border border-line-1 bg-base-2 p-4 transition hover:border-volt/40"
                      >
                        <div className="shrink-0 rounded-lg border border-line-2 bg-base-3 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-volt">
                          {String(i + 1).padStart(2, "0")} · {s.durationSec}s
                        </div>
                        <div className="flex-1 text-sm">
                          <div className="text-ink-hi">{s.text}</div>
                          <div className="mt-1 font-mono text-[10px] text-ink-dim">
                            ref {s.imageRef}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <SkeletonLines />
                )}
              </section>
            </div>

            {/* Right rail: phone preview + agent feed */}
            <div className="space-y-6">
              <section className="card overflow-hidden p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
                    Preview · 9:16
                  </div>
                  {ad.videoUrl && (
                    <span className="chip-live">
                      <span className="dot-live" /> Ready
                    </span>
                  )}
                </div>
                <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl border border-line-2 bg-base-0">
                  {ad.videoUrl ? (
                    <video
                      controls
                      className="h-full w-full"
                      src={ad.videoUrl}
                      poster={ad.thumbnailUrl ?? undefined}
                    />
                  ) : ad.thumbnailUrl ? (
                    <img
                      src={ad.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover opacity-80"
                    />
                  ) : (
                    <div className="absolute inset-0 spot" />
                  )}
                  {!ad.videoUrl && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                      <div className="shimmer absolute inset-0" />
                      <div className="relative font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                        rendering…
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Ship to socials */}
              <ShipPanel adId={ad.id} isReady={ad.status === "READY"} />

              {/* Console */}
              <section className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-line-1 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-danger/60" />
                      <span className="h-2 w-2 rounded-full bg-warn/60" />
                      <span className="h-2 w-2 rounded-full bg-lime/60" />
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-mid">
                      console
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-dim">adgen/lab</span>
                </div>
                <pre className="max-h-64 overflow-auto bg-base-0 p-4 font-mono text-[11px] leading-relaxed text-ink-mid">
                  {log.length ? log.join("\n") : "waiting for pipeline…"}
                  {busy && (
                    <span className="text-volt">
                      {"\n$ "}
                      <span className="animate-caret">▍</span>
                    </span>
                  )}
                </pre>
              </section>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function StepTag({ idx }: { idx: number }) {
  const step = PIPELINE[idx];
  return (
    <span className="pill border border-line-2 bg-base-2 text-ink-mid">
      Step {String(idx + 1).padStart(2, "0")} · {step.agent}
    </span>
  );
}

function SkeletonLines() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="shimmer h-5 rounded-lg bg-base-2"
          style={{ width: `${90 - i * 12}%` }}
        />
      ))}
    </div>
  );
}
