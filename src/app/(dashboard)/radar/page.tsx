"use client";

import { useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { HookCard } from "@/components/HookCard";
import {
  CATEGORIES,
  HOOK_TEMPLATES,
  type HookCategory,
} from "@/data/hook-templates";
import clsx from "clsx";

export default function RadarPage() {
  const [active, setActive] = useState<HookCategory | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"momentum" | "category">("momentum");

  const filtered = useMemo(() => {
    let rows = HOOK_TEMPLATES.filter(
      (h) => active === "ALL" || h.category === active,
    );
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (h) =>
          h.formula.toLowerCase().includes(q) ||
          h.blurb.toLowerCase().includes(q) ||
          h.examples.some((e) => e.toLowerCase().includes(q)),
      );
    }
    if (sort === "momentum") {
      rows = [...rows].sort((a, b) => b.momentum - a.momentum);
    } else {
      rows = [...rows].sort((a, b) => a.category.localeCompare(b.category));
    }
    return rows;
  }, [active, query, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: HOOK_TEMPLATES.length };
    for (const h of HOOK_TEMPLATES) {
      c[h.category] = (c[h.category] ?? 0) + 1;
    }
    return c;
  }, []);

  const hotCount = HOOK_TEMPLATES.filter((h) => h.momentum >= 85).length;

  return (
    <>
      <TopBar
        eyebrow="Hook radar"
        title="What's working in feeds right now"
        subtitle="A curated bank of proven short-form video hook patterns. Click one to drop into the generator with the hook pre-loaded."
        action={
          <span className="chip-live">
            <span className="dot-live" /> {hotCount} hot
          </span>
        }
      />

      <div className="space-y-6 p-8">
        {/* Filters */}
        <div className="surface-elevated relative overflow-hidden p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Search hooks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input flex-1 min-w-[220px] font-mono text-[12px]"
            />
            <div className="flex items-center gap-1 rounded-xl2 border border-line-2 bg-base-2 p-1">
              {(["momentum", "category"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={clsx(
                    "rounded-lg px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition",
                    sort === s
                      ? "bg-base-0 text-volt"
                      : "text-ink-mid hover:text-ink-hi",
                  )}
                >
                  sort: {s}
                </button>
              ))}
            </div>
          </div>

          {/* Category chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CategoryChip
              label={`All (${counts.ALL ?? 0})`}
              color="#a78bfa"
              active={active === "ALL"}
              onClick={() => setActive("ALL")}
            />
            {CATEGORIES.map((c) => (
              <CategoryChip
                key={c.id}
                label={`${c.label} (${counts[c.id] ?? 0})`}
                color={c.color}
                active={active === c.id}
                onClick={() => setActive(c.id)}
              />
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="card grid place-items-center p-16 text-center text-sm text-ink-mid">
            No hooks match — try widening the search.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((h) => (
              <HookCard key={h.id} hook={h} />
            ))}
          </div>
        )}

        <div className="rounded-xl2 border border-dashed border-line-2 bg-base-2/50 p-5 text-[12px] text-ink-mid">
          <span className="font-mono uppercase tracking-[0.22em] text-volt">
            Coming next
          </span>{" "}
          — momentum scores are currently curated. The next rev wires a daily
          ingestion job that scrapes top-performing TikTok / Reels in your
          niche and re-scores hooks based on what's actually winning that week.
        </div>
      </div>
    </>
  );
}

function CategoryChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "pill border transition",
        active
          ? "text-base-0"
          : "border-line-2 bg-base-2 text-ink-mid hover:text-ink-hi",
      )}
      style={
        active
          ? { background: color, borderColor: color }
          : undefined
      }
    >
      {label}
    </button>
  );
}
