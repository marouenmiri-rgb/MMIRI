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
      <div className="absolute -inset-px -z-10 rounded-xl2 bg-gradient-to-r from-volt/40 via-transparent to-lime/30 opacity-60 blur" />
      <div className="relative flex items-center gap-2 rounded-xl2 border border-line-2 bg-base-1/80 p-2 backdrop-blur">
        <span className="flex h-10 items-center px-3 font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
          URL ▸
        </span>
        <input
          className="flex-1 bg-transparent px-1 py-2.5 font-mono text-[15px] text-ink-hi placeholder:text-ink-dim outline-none"
          placeholder="https://yourstore.com/products/hero-mug"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={busy || !url}
          className="btn-primary h-10"
        >
          {busy ? "Starting pipeline…" : "Generate"}
          <span className="kbd !border-base-0/20 !bg-base-0/20 !text-base-0/70">↵</span>
        </button>
      </div>
      {err && (
        <p className="mt-2 text-xs text-danger">{err}</p>
      )}
    </form>
  );
}
