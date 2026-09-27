"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * Quick appearance switcher. Lives in the top bar and on the marketing nav.
 * Changes apply instantly (one attribute write on <html>) and persist.
 *
 * `compact` renders only the palette row + mode — for the marketing nav, where
 * the layout options aren't relevant.
 */
export function AppearanceMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [mounted, setMounted] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setA(readAppearance());
    setMounted(true);
  }, []);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function update(patch: Partial<Appearance>) {
    const next = { ...a, ...patch };
    setA(next);
    applyAppearance(next);
    saveAppearance(next);
  }

  const active = PALETTES.find((p) => p.id === a.palette) ?? PALETTES[0];

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Appearance"
        aria-expanded={open}
        title="Appearance"
        className="group inline-flex h-8 items-center gap-2 rounded-full border border-line-2
                   bg-base-1/70 px-2.5 text-ink-lo backdrop-blur transition-all duration-300
                   ease-ios hover:border-line-3 hover:text-ink-hi active:scale-95"
      >
        <span
          className="flex items-center transition-opacity duration-200"
          style={{ opacity: mounted ? 1 : 0 }}
        >
          <Swatch colors={active.swatch} />
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div
          className="popover absolute right-0 z-50 mt-2 w-[320px] p-4"
          style={{ animation: "riseIn 0.24s cubic-bezier(0.22,1,0.36,1) both" }}
        >
          <Section label="Theme" />
          <div className="mt-2 space-y-1.5">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => update({ palette: p.id })}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left
                            transition-all duration-200 ease-ios ${
                              a.palette === p.id
                                ? "border-volt/50 bg-volt/[0.07]"
                                : "border-transparent hover:border-line-2 hover:bg-base-3"
                            }`}
              >
                <Swatch colors={p.swatch} size={18} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink-hi">
                    {p.label}
                  </span>
                  <span className="block truncate text-[11px] text-ink-lo">
                    {p.blurb}
                  </span>
                </span>
                {a.palette === p.id && <Check />}
              </button>
            ))}
          </div>

          <Section label="Mode" className="mt-4" />
          <SegmentedControl
            options={MODES.map((m) => ({ id: m.id, label: m.label }))}
            value={a.mode}
            onChange={(id) => update({ mode: id as Appearance["mode"] })}
          />

          {!compact && (
            <>
              <Section label="Density" className="mt-4" />
              <SegmentedControl
                options={DENSITIES.map((d) => ({ id: d.id, label: d.label }))}
                value={a.density}
                onChange={(id) => update({ density: id as Appearance["density"] })}
              />

              <Section label="Corners" className="mt-4" />
              <SegmentedControl
                options={RADII.map((r) => ({ id: r.id, label: r.label }))}
                value={a.radius}
                onChange={(id) => update({ radius: id as Appearance["radius"] })}
              />

              <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-line-1 px-3 py-2.5 transition hover:bg-base-3">
                <span>
                  <span className="block text-[13px] font-medium text-ink-hi">
                    Reduce motion
                  </span>
                  <span className="block text-[11px] text-ink-lo">
                    Turn off animations
                  </span>
                </span>
                <Toggle
                  on={a.motion === "reduced"}
                  onChange={(on) => update({ motion: on ? "reduced" : "full" })}
                />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- pieces ---------- */

function Section({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div
      className={`font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim ${className}`}
    >
      {label}
    </div>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mt-2 flex gap-1 rounded-xl border border-line-1 bg-base-3/60 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-medium transition-all
                      duration-200 ease-ios ${
                        value === o.id
                          ? "bg-base-1 text-ink-hi shadow-xs"
                          : "text-ink-lo hover:text-ink-hi"
                      }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Swatch({
  colors,
  size = 16,
}: {
  colors: [string, string, string];
  size?: number;
}) {
  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full border border-line-2"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {colors.map((c, i) => (
        <span key={i} style={{ background: c, width: size / 3, height: size }} />
      ))}
    </span>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-volt">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="transition-transform duration-300 ease-ios"
      style={{ transform: open ? "rotate(180deg)" : "none" }}
    >
      <path d="M5 9l7 7 7-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-300
                  ease-ios ${on ? "bg-volt" : "bg-base-4"}`}
    >
      <span
        className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ease-ios"
        style={{ transform: on ? "translateX(19px)" : "translateX(3px)" }}
      />
    </button>
  );
}
