"use client";

import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { StatusPill } from "@/components/StatusPill";

type AdResult = {
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
  scenesJson?: {
    style: string;
    scenes: { text: string; imageRef: string; durationSec: number }[];
  } | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  error?: string | null;
};

export default function GeneratorPage() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [ad, setAd] = useState<AdResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
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
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      const { id } = await r.json();
      poll(id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function poll(id: string) {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const r = await fetch(`/api/ads/${id}`);
      if (r.ok) {
        const data = (await r.json()) as AdResult;
        setAd(data);
        if (data.status === "READY" || data.status === "FAILED") {
          setBusy(false);
          if (data.status === "FAILED") setErr(data.error ?? "Job failed");
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
        title="Ad Generator"
        subtitle="Paste a product URL. Get a ready-to-post short-form video ad."
      />
      <div className="space-y-6 p-8">
        <form onSubmit={submit} className="card p-6">
          <label className="text-sm font-medium text-ink-800">Product URL</label>
          <div className="mt-3 flex gap-3">
            <input
              className="input"
              placeholder="https://yourstore.com/products/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <button className="btn-primary" disabled={busy || !url}>
              {busy ? "Generating…" : "Generate ad"}
            </button>
          </div>
          {err ? (
            <p className="mt-3 text-sm text-rose-600">{err}</p>
          ) : (
            <p className="mt-3 text-xs text-ink-400">
              Tip: Shopify and Amazon product pages work best. Generation runs
              scraper → copywriter → creative director → renderer.
            </p>
          )}
        </form>

        {ad ? (
          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-ink-500">Ad ID</div>
                  <div className="font-mono text-sm">{ad.id}</div>
                </div>
                <StatusPill status={ad.status} />
              </div>
              {ad.productTitle ? (
                <div className="mt-4 text-lg font-semibold">
                  {ad.productTitle}
                </div>
              ) : null}
            </div>

            {ad.scriptJson ? (
              <div className="card p-6">
                <h3 className="text-sm font-semibold">Ad script</h3>
                <dl className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(
                    [
                      ["Hook", ad.scriptJson.hook],
                      ["Problem", ad.scriptJson.problem],
                      ["Solution", ad.scriptJson.solution],
                      ["CTA", ad.scriptJson.cta],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs uppercase tracking-wider text-ink-400">
                        {k}
                      </dt>
                      <dd className="mt-1 text-sm text-ink-800">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 rounded-xl2 bg-ink-50 p-4 text-sm italic text-ink-700">
                  “{ad.scriptJson.fullScript}”
                </div>
              </div>
            ) : null}

            {ad.scenesJson ? (
              <div className="card p-6">
                <h3 className="text-sm font-semibold">Scene plan</h3>
                <p className="mt-1 text-xs text-ink-500">
                  Style: {ad.scenesJson.style}
                </p>
                <ol className="mt-4 space-y-3">
                  {ad.scenesJson.scenes.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-4 rounded-xl2 border border-ink-100 p-4"
                    >
                      <div className="shrink-0 rounded-lg bg-ink-100 px-2 py-1 text-xs font-medium">
                        Scene {i + 1} · {s.durationSec}s
                      </div>
                      <div className="flex-1 text-sm">
                        <div className="font-medium text-ink-800">{s.text}</div>
                        <div className="mt-1 text-xs text-ink-400">
                          Image ref: {s.imageRef}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {ad.videoUrl ? (
              <div className="card p-6">
                <h3 className="text-sm font-semibold">Final video</h3>
                <video
                  controls
                  className="mt-4 w-full rounded-xl2"
                  src={ad.videoUrl}
                  poster={ad.thumbnailUrl ?? undefined}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
