"use client";

import { useEffect, useState } from "react";
import {
  DENSITIES,
  MODES,
  PALETTES,
  RADII,
  applyAppearance,
  readAppearance,
  saveAppearance,
  DEFAULT_APPEARANCE,
  type Appearance,
} from "@/lib/appearance";
import { SegmentedControl, Toggle } from "./AppearanceMenu";

/**
 * The full appearance surface on /settings. Same state as the top-bar menu —
 * both read and write the one persisted record — but with room to show each
 * theme as a real preview card rather than a swatch.
 */
export function AppearancePanel() {
  const [a, setA] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setA(readAppearance());
    setMounted(true);
  }, []);

  function update(patch: Partial<Appearance>) {
    const next = { ...a, ...patch };
    setA(next);
    applyAppearance(next);
    saveAppearance(next);
  }

  function reset() {
    setA(DEFAULT_APPEARANCE);
    applyAppearance(DEFAULT_APPEARANCE);
    saveAppearance(DEFAULT_APPEARANCE);
  }

  return (
    <div className="card p-6" style={{ opacity: mounted ? 1 : 0.6 }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-volt">
            Appearance
          </div>
          <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-ink-hi">
            Make it yours
          </h2>
          <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-ink-mid">
            Three themes, each with a light and a dark variant. Everything
            applies instantly and is remembered on this device.
          </p>
        </div>
        <button type="button" onClick={reset} className="btn-ink shrink-0">
          Reset
        </button>
      </div>

      {/* Theme cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {PALETTES.map((p) => {
          const selected = a.palette === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => update({ palette: p.id })}
              aria-pressed={selected}
              className={`group overflow-hidden rounded-2xl border text-left transition-all
                          duration-300 ease-ios ${
                            selected
                              ? "border-volt/60 shadow-glow"
                              : "border-line-1 hover:border-line-3 hover:shadow-lift"
                          }`}
            >
              <ThemePreview colors={p.swatch} />
              <div className="border-t border-line-1 px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-ink-hi">
                    {p.label}
                  </span>
                  {selected && (
                    <span className="pill bg-volt/12 text-volt">Active</span>
                  )}
                </div>
                <p className="mt-1 text-[12px] leading-snug text-ink-lo">
                  {p.blurb}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Options */}
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <Field label="Mode" hint="System follows your OS setting.">
          <SegmentedControl
            options={MODES.map((m) => ({ id: m.id, label: m.label }))}
            value={a.mode}
            onChange={(id) => update({ mode: id as Appearance["mode"] })}
          />
        </Field>
        <Field label="Density" hint="Retunes spacing across the whole app.">
          <SegmentedControl
            options={DENSITIES.map((d) => ({ id: d.id, label: d.label }))}
            value={a.density}
            onChange={(id) => update({ density: id as Appearance["density"] })}
          />
        </Field>
        <Field label="Corners" hint="From editorial-sharp to fully round.">
          <SegmentedControl
            options={RADII.map((r) => ({ id: r.id, label: r.label }))}
            value={a.radius}
            onChange={(id) => update({ radius: id as Appearance["radius"] })}
          />
        </Field>
      </div>

      <label className="mt-5 flex cursor-pointer items-center justify-between rounded-xl border border-line-1 bg-base-3/40 px-4 py-3 transition hover:bg-base-3">
        <span>
          <span className="block text-[13px] font-medium text-ink-hi">
            Reduce motion
          </span>
          <span className="block text-[12px] text-ink-lo">
            Disables transitions and looping animations. Your OS setting is
            always respected regardless.
          </span>
        </span>
        <Toggle
          on={a.motion === "reduced"}
          onChange={(on) => update({ motion: on ? "reduced" : "full" })}
        />
      </label>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">
        {label}
      </div>
      {children}
      <p className="mt-1.5 text-[11px] leading-snug text-ink-lo">{hint}</p>
    </div>
  );
}

/**
 * A miniature of the app in that palette — page, card, accent bar and a
 * couple of text rows. Uses the palette's literal swatch colours so the
 * preview is accurate even while a different theme is active.
 */
function ThemePreview({ colors }: { colors: [string, string, string] }) {
  const [accent, support, surface] = colors;
  return (
    <div className="relative h-[92px] overflow-hidden" style={{ background: surface }}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 15% 0%, ${accent}22, transparent 60%),
                       radial-gradient(ellipse 60% 50% at 100% 100%, ${support}1f, transparent 60%)`,
        }}
      />
      <div
        className="absolute left-3 top-3 flex h-[62px] w-[86px] flex-col gap-1.5 rounded-lg p-2"
        style={{ background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.10)" }}
      >
        <span className="h-1.5 w-8 rounded-full" style={{ background: accent }} />
        <span className="h-1 w-full rounded-full" style={{ background: "#0000001a" }} />
        <span className="h-1 w-3/4 rounded-full" style={{ background: "#0000001a" }} />
        <span className="mt-auto h-2.5 w-10 rounded-full" style={{ background: accent }} />
      </div>
      <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1.5">
        <span className="h-2.5 w-14 rounded-full" style={{ background: support }} />
        <span className="h-1.5 w-10 rounded-full" style={{ background: `${accent}66` }} />
      </div>
    </div>
  );
}
