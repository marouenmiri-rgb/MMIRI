"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

type Insight = {
  id: string;
  kind: "WEEKLY_BRIEF" | "WINNING_HOOK" | "LOSING_HOOK" | "BUDGET_SHIFT";
  title: string;
  body: string;
  evidenceJson: { action?: string } | null;
  createdAt: string;
  actioned: boolean;
};

const KIND_META: Record<
  Insight["kind"],
  { label: string; chip: string; glyph: string }
> = {
  WEEKLY_BRIEF: {
    label: "This week",
    chip: "bg-volt/10 text-volt-400 border-volt/30",
    glyph: "▸",
  },
  WINNING_HOOK: {
    label: "Winner",
    chip: "bg-lime/10 text-lime border-lime/30",
    glyph: "🏆",
  },
  LOSING_HOOK: {
    label: "Retire",
    chip: "bg-danger/10 text-danger border-danger/30",
    glyph: "✕",
  },
  BUDGET_SHIFT: {
    label: "Lean in",
    chip: "bg-warn/10 text-warn border-warn/30",
    glyph: "↑",
  },
};

export function InsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/insights");
    if (!r.ok) return;
    const b = await r.json();
    setInsights(b.insights ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/insights", { method: "POST" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      setSummary(body.summary ?? null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card relative overflow-hidden p-6">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-volt/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
              Strategist
            </div>
            <h3 className="mt-1 font-display text-xl tracking-tight">
              Weekly brief
            </h3>
            <p className="mt-1 max-w-xl text-sm text-ink-mid">
              Claude reads your attribution data and tells you what's winning,
              what's losing, and what to do next.
            </p>
          </div>
          <button
            onClick={run}
            disabled={busy}
            className="btn-primary h-9 px-3 text-[12px]"
          >
            {busy ? "Thinking…" : "Run this week's brief"}
          </button>
        </div>

        {summary && (
          <div className="mt-4 rounded-xl2 border border-volt/30 bg-volt/5 p-4 text-sm leading-relaxed text-ink-hi">
            {summary}
          </div>
        )}

        {err && <p className="mt-3 text-sm text-danger">{err}</p>}

        {insights.length === 0 ? (
          <div className="mt-5 rounded-xl2 border border-dashed border-line-2 bg-base-2/50 p-6 text-center text-sm text-ink-mid">
            Run the brief to get three concrete moves for the week —
            promote the winner, retire the loser, and lean into the
            channel that's paying rent.
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {insights.map((ins) => {
              const meta = KIND_META[ins.kind];
              return (
                <li
                  key={ins.id}
                  className={clsx(
                    "rounded-xl2 border p-4 transition",
                    "border-line-2 bg-base-2",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={clsx("pill border", meta.chip)}>
                      <span className="font-mono">{meta.glyph}</span>{" "}
                      {meta.label}
                    </span>
                    <span className="font-mono text-[11px] text-ink-dim">
                      {new Date(ins.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2 font-display text-base tracking-tight text-ink-hi">
                    {ins.title}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-mid">
                    {ins.body}
                  </p>
                  {ins.evidenceJson?.action && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl2 border border-line-1 bg-base-3 p-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-volt">
                        Next move
                      </span>
                      <span className="text-sm text-ink-hi">
                        {ins.evidenceJson.action}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
