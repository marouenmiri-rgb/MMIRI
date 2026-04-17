"use client";

import { useState } from "react";
import { categoryMeta, type HookTemplate } from "@/data/hook-templates";

/**
 * One hook on the Radar grid. The momentum bar at the top glows lime
 * when the score is hot (>= 85). Click "Use this hook" to drop into the
 * generator with the hook formula pre-loaded as a hint to the
 * copywriter agent.
 */
export function HookCard({ hook }: { hook: HookTemplate }) {
  const meta = categoryMeta(hook.category);
  const [open, setOpen] = useState(false);
  const [productUrl, setProductUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hot = hook.momentum >= 85;

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl, hookHint: hook.formula }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      window.location.href = `/generator?id=${body.id}`;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl2 border border-line-1 bg-base-1 transition hover:border-line-3">
      {/* Momentum bar */}
      <div className="relative h-1 w-full bg-base-3">
        <div
          className="h-full transition-all"
          style={{
            width: `${hook.momentum}%`,
            background: hot
              ? "linear-gradient(90deg, #c3ff3e, #a3e019)"
              : meta.color,
            boxShadow: hot ? `0 0 12px ${meta.color}80` : undefined,
          }}
        />
      </div>

      <div className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between">
          <span
            className="pill border"
            style={{
              borderColor: `${meta.color}55`,
              background: `${meta.color}15`,
              color: meta.color,
            }}
          >
            {meta.label}
          </span>
          <span
            className={
              "font-mono text-[11px] tracking-wider " +
              (hot ? "text-lime" : "text-ink-mid")
            }
          >
            {hot && <span className="dot-live mr-1.5 inline-block" />}
            momentum {hook.momentum}
          </span>
        </div>

        {/* Formula */}
        <h3 className="mt-3 font-display text-lg leading-snug tracking-tight text-ink-hi">
          “{hook.formula}”
        </h3>

        <p className="mt-2 text-[12px] leading-relaxed text-ink-mid">
          {hook.blurb}
        </p>

        {/* Examples */}
        <ul className="mt-3 space-y-1 text-[12px] text-ink-mid">
          {hook.examples.map((ex, i) => (
            <li
              key={i}
              className="rounded-md border border-line-1 bg-base-2 px-2 py-1.5 italic"
            >
              {ex}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-4">
          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className="btn-ghost h-8 w-full text-[12px]"
            >
              Use this hook →
            </button>
          ) : (
            <form onSubmit={generate} className="space-y-2">
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://yourstore.com/products/..."
                className="input font-mono text-[12px]"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy || !productUrl}
                  className={hot ? "btn-lime h-8 flex-1 text-[12px]" : "btn-primary h-8 flex-1 text-[12px]"}
                >
                  {busy ? "Starting…" : "Generate"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-ink h-8 px-3 text-[12px]"
                >
                  ✕
                </button>
              </div>
              {err && <p className="text-[11px] text-danger">{err}</p>}
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
