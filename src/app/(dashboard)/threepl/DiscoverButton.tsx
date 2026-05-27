"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUGGESTED_NICHES } from "@/lib/threepl-fixtures";

const SCAN_PHASES = [
  "expanding niche",
  "querying public web",
  "inspecting candidate stores",
  "scoring 3PL fit",
  "matching affiliate partners",
  "drafting pitches",
] as const;

export function DiscoverButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [niche, setNiche] = useState("");
  const [limit, setLimit] = useState(8);
  const [minFit, setMinFit] = useState(50);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setPhase(0);
    const phaseInterval = setInterval(() => {
      setPhase((p) => Math.min(SCAN_PHASES.length - 1, p + 1));
    }, 2400);

    try {
      const r = await fetch("/api/leads/threepl/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, limit, minFitScore: minFit }),
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
      clearInterval(phaseInterval);
      setBusy(false);
      setPhase(0);
    }
  }

  if (!open) {
    return (
      <button className="btn-lime" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Discover 3PL leads
      </button>
    );
  }

  return (
    <div className="w-[420px] rounded-xl2 border border-line-2 bg-base-2/95 p-4 shadow-card backdrop-blur">
      <form onSubmit={run} className="space-y-3">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
            Niche
          </label>
          <input
            className="input mt-1 font-mono"
            placeholder='e.g. "supplements", "pet treats"'
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            autoFocus
            required
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTED_NICHES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setNiche(s)}
                className="rounded-full border border-line-2 bg-base-1 px-2.5 py-0.5 font-mono text-[10px] text-ink-mid transition hover:border-volt/40 hover:text-ink-hi"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                Limit
              </label>
              <span className="font-mono text-[11px] text-ink-hi">{limit}</span>
            </div>
            <input
              type="range"
              min={3}
              max={20}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="mt-1 w-full accent-volt"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-dim">
                Min fit
              </label>
              <span className="font-mono text-[11px] text-ink-hi">{minFit}</span>
            </div>
            <input
              type="range"
              min={30}
              max={90}
              step={5}
              value={minFit}
              onChange={(e) => setMinFit(Number(e.target.value))}
              className="mt-1 w-full accent-lime"
            />
          </div>
        </div>

        {busy ? (
          <div className="rounded-xl2 border border-line-2 bg-base-1 p-3">
            <div className="flex items-center gap-2">
              <span className="dot-live" />
              <span className="font-mono text-[11px] text-ink-mid">
                {SCAN_PHASES[phase]}…
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-base-3">
              <div
                className="h-full bg-gradient-to-r from-volt to-lime transition-all"
                style={{
                  width: `${((phase + 1) / SCAN_PHASES.length) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            className="btn-primary flex-1"
            disabled={busy || niche.length < 2}
          >
            {busy ? "Scanning…" : "Run pipeline"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              setMsg(null);
            }}
          >
            Cancel
          </button>
        </div>
        {msg ? (
          <div className="font-mono text-[11px] text-ink-mid">{msg}</div>
        ) : null}
      </form>
    </div>
  );
}
