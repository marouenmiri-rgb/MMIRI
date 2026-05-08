"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DiscoverButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [niche, setNiche] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/leads/threepl/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, limit: 8, minFitScore: 50 }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setMsg(
        `Scanned ${body.candidatesScanned ?? 0} · qualified ${body.leads?.length ?? 0} · saved ${body.saved ?? 0}`,
      );
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-lime" onClick={() => setOpen(true)}>
        Discover 3PL leads
      </button>
    );
  }

  return (
    <form onSubmit={run} className="flex items-center gap-2">
      <input
        className="input w-72 font-mono"
        placeholder='niche, e.g. "supplements" or "pet treats"'
        value={niche}
        onChange={(e) => setNiche(e.target.value)}
        autoFocus
        required
      />
      <button className="btn-primary" disabled={busy || niche.length < 2}>
        {busy ? "Scanning…" : "Discover"}
      </button>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => {
          setOpen(false);
          setMsg(null);
        }}
      >
        Cancel
      </button>
      {msg ? <span className="ml-2 text-xs text-ink-mid">{msg}</span> : null}
    </form>
  );
}
