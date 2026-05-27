"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The dashboard's defining interaction: one huge URL bar, always visible.
 * Hits /api/ads/generate and routes straight into /generator?id=... so the
 * user drops into the live pipeline.
 */
export function HeroCapture() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/ads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl: url }),
      });
      if (!r.ok) {
        // Fallback: hand the URL off to the generator page.
        router.push(`/generator?url=${encodeURIComponent(url)}`);
        return;
      }
      const { id } = await r.json();
      router.push(`/generator?id=${id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={go} className="relative">
      <div
        aria-hidden
        className="absolute -inset-2 -z-10 rounded-3xl opacity-50 blur-xl"
        style={{
          background:
            "linear-gradient(90deg, rgba(124,77,255,0.4) 0%, rgba(34,211,238,0.25) 50%, rgba(195,255,62,0.3) 100%)",
        }}
      />
      <div className="glass relative flex items-center gap-2 p-2.5">
        <span className="flex h-11 items-center px-4 font-mono text-[11px] uppercase tracking-[0.28em] text-volt">
          URL ▸
        </span>
        <input
          className="flex-1 bg-transparent px-1 py-3 font-mono text-[16px] text-ink-hi placeholder:text-ink-dim outline-none"
          placeholder="https://yourstore.com/products/hero-mug"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button type="submit" disabled={busy || !url} className="btn-primary h-11">
          {busy ? "Starting pipeline…" : "Generate"}
          <span className="kbd !border-base-0/20 !bg-base-0/20 !text-base-0/70">↵</span>
        </button>
      </div>
      {err && <p className="mt-3 text-xs text-danger">{err}</p>}
    </form>
  );
}
