"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DiscoverButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/leads/shopify/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, limit: 10 }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setMsg(
        `Found ${body.stores?.length ?? 0} · saved ${body.saved ?? 0}`,
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
        Discover stores
      </button>
    );
  }

  return (
    <form onSubmit={run} className="flex items-center gap-2">
      <input
        className="input w-64 font-mono"
        placeholder='niche, e.g. "outdoor cookware"'
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        autoFocus
        required
      />
      <button className="btn-primary" disabled={busy || keyword.length < 2}>
        {busy ? "Searching…" : "Search"}
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
