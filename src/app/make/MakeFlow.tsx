"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AppearanceMenu } from "@/components/AppearanceMenu";

type Ad = {
  id: string;
  productTitle?: string | null;
  status: string;
  scriptJson?: {
    hook: string;
    problem: string;
    solution: string;
    cta: string;
    fullScript: string;
  } | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  error?: string | null;
};

/** The pipeline stages, in the order the orchestrator moves through them. */
const STAGES = [
  { key: "SCRAPING", label: "Reading the product page" },
  { key: "WRITING", label: "Writing the script" },
  { key: "DIRECTING", label: "Planning the shots" },
  { key: "RENDERING", label: "Rendering the video" },
  { key: "READY", label: "Done" },
] as const;

function stageIndex(status: string) {
  const i = STAGES.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
}

export function MakeFlow() {
  const [url, setUrl] = useState("");
  const [ad, setAd] = useState<Ad | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setAd(null);
    try {
      const r = await fetch("/api/ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl: url }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          body.message ?? body.detail ?? body.error ?? `HTTP ${r.status}`,
        );
      }
      poll(body.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function poll(id: string) {
    try {
      const r = await fetch(`/api/ads/${id}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const next: Ad = await r.json();
      setAd(next);
      if (next.status === "READY" || next.status === "FAILED") {
        setBusy(false);
        if (next.status === "FAILED") setErr(next.error ?? "The run failed.");
        return;
      }
      timer.current = setTimeout(() => poll(id), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    setAd(null);
    setErr(null);
    setBusy(false);
    setUrl("");
  }

  const done = ad?.status === "READY";
  const current = ad ? stageIndex(ad.status) : -1;

  return (
    <main className="relative min-h-screen">
      <div className="aurora-hero pointer-events-none fixed inset-0 -z-10" />
      <div className="grid-bg pointer-events-none fixed inset-0 -z-10 opacity-40" />

      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <AppearanceMenu compact />
          <Link href="/pricing" className="btn-ghost">
            Pricing
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-24 pt-10 sm:pt-16">
        {!ad && (
          <div className="text-center">
            <h1 className="font-display text-[clamp(32px,6vw,52px)] font-semibold leading-[1.05] tracking-ultratight text-ink-hi">
              Paste a product link.
              <br />
              <span className="text-aurora">Download the ad.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-ink-mid">
              We read the product page, write the script, and render a vertical
              9:16 video with subtitles. You download the MP4 and post it
              yourself — no account connections needed.
            </p>
          </div>
        )}

        <form onSubmit={start} className="card mt-9 p-5 sm:p-6">
          <label
            htmlFor="product-url"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt"
          >
            Product URL
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="product-url"
              className="input-hero flex-1"
              placeholder="https://yourstore.com/products/…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
              required
            />
            <button className="btn-primary sm:w-[160px]" disabled={busy || !url}>
              {busy ? "Making…" : "Make my video"}
            </button>
          </div>
          <p className="mt-3 text-[12px] text-ink-dim">
            Works best on Shopify and Amazon product pages. Takes about a
            minute.
          </p>
        </form>

        {err && (
          <div className="card mt-4 border-danger/40 bg-danger/5 p-4">
            <div className="text-[14px] font-medium text-danger">
              That didn&apos;t work
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-mid">{err}</p>
            <button className="btn-ink mt-3" onClick={reset}>
              Try another link
            </button>
          </div>
        )}

        {/* Progress */}
        {ad && !done && !err && (
          <div className="card mt-4 p-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-dim">
              Building your video
            </div>
            <ul className="mt-4 space-y-2.5">
              {STAGES.slice(0, 4).map((s, i) => {
                const state =
                  i < current ? "done" : i === current ? "now" : "todo";
                return (
                  <li key={s.key} className="flex items-center gap-3">
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                        state === "done"
                          ? "bg-mint text-white"
                          : state === "now"
                            ? "bg-volt text-white"
                            : "border border-line-2 text-ink-dim"
                      }`}
                    >
                      {state === "done" ? "✓" : i + 1}
                    </span>
                    <span
                      className={`text-[14px] ${
                        state === "todo" ? "text-ink-dim" : "text-ink-hi"
                      }`}
                    >
                      {s.label}
                    </span>
                    {state === "now" && (
                      <span className="dot-live ml-auto" aria-hidden />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Result */}
        {done && ad && (
          <div className="mt-4 grid gap-4 sm:grid-cols-[260px_1fr]">
            <div className="card overflow-hidden p-3">
              <div className="relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-xl bg-base-0">
                {ad.videoUrl ? (
                  <video
                    controls
                    playsInline
                    className="h-full w-full"
                    src={ad.videoUrl}
                    poster={ad.thumbnailUrl ?? undefined}
                  />
                ) : ad.thumbnailUrl ? (
                  <img
                    src={ad.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center p-4 text-center text-[12px] text-ink-dim">
                    No video file
                  </div>
                )}
              </div>
            </div>

            <div className="card p-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-mint">
                Ready
              </div>
              <h2 className="mt-1.5 text-[20px] font-semibold tracking-tight text-ink-hi">
                {ad.productTitle ?? "Your ad"}
              </h2>

              {ad.scriptJson?.hook && (
                <p className="mt-3 border-l-2 border-volt/40 pl-3 text-[14px] italic leading-relaxed text-ink-mid">
                  “{ad.scriptJson.hook}”
                </p>
              )}

              {ad.videoUrl ? (
                <a
                  className="btn-primary mt-5 w-full"
                  href={`/api/ads/${ad.id}/download`}
                >
                  Download MP4
                </a>
              ) : (
                <div className="mt-5 rounded-xl border border-warn/40 bg-warn/5 p-3.5">
                  <div className="text-[13px] font-medium text-warn">
                    Script ready, video not rendered
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-mid">
                    Rendering needs <code>ffmpeg</code> installed on the machine
                    running AdGen. The script and shot list below are still
                    yours to use.
                  </p>
                </div>
              )}

              {ad.scriptJson?.fullScript && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-[13px] font-medium text-ink-mid">
                    Read the full script
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-mid">
                    {ad.scriptJson.fullScript}
                  </p>
                </details>
              )}

              <button className="btn-ink mt-4 w-full" onClick={reset}>
                Make another
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
