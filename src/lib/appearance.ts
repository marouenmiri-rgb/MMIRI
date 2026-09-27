/**
 * Appearance settings. Every axis is an independent attribute on <html>, and
 * globals.css keys all of its tokens off those attributes — so applying a
 * setting is one attribute write, with no re-render and no flash.
 *
 * The axes are orthogonal on purpose: each palette ships a light *and* a dark
 * variant, so switching palette never forces a mode change and vice versa.
 */

export type Palette = "studio" | "noir" | "aurora";
export type Mode = "light" | "dark" | "system";
export type Density = "compact" | "comfortable" | "spacious";
export type Radius = "sharp" | "soft" | "round";
export type Motion = "full" | "reduced";

export type Appearance = {
  palette: Palette;
  mode: Mode;
  density: Density;
  radius: Radius;
  motion: Motion;
};

export const DEFAULT_APPEARANCE: Appearance = {
  palette: "studio",
  mode: "system",
  density: "comfortable",
  radius: "soft",
  motion: "full",
};

export const STORAGE_KEY = "adgen-appearance";

/** Swatch stops are literal hex so the picker renders correctly in any theme. */
export const PALETTES: {
  id: Palette;
  label: string;
  blurb: string;
  swatch: [string, string, string];
}[] = [
  {
    id: "studio",
    label: "Studio",
    blurb: "Cool neutrals, indigo, emerald. Calm and precise.",
    swatch: ["#635BFF", "#10A360", "#F6F8FB"],
  },
  {
    id: "noir",
    label: "Noir",
    blurb: "Warm stone and brass. Editorial, high contrast.",
    swatch: ["#A16207", "#5F7A5F", "#F7F5F1"],
  },
  {
    id: "aurora",
    label: "Aurora",
    blurb: "Violet and cyan on tinted glass. Vivid and soft.",
    swatch: ["#9333EA", "#0D9488", "#F7F5FD"],
  },
];

export const MODES: { id: Mode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export const DENSITIES: { id: Density; label: string; blurb: string }[] = [
  { id: "compact", label: "Compact", blurb: "More on screen" },
  { id: "comfortable", label: "Comfortable", blurb: "Balanced" },
  { id: "spacious", label: "Spacious", blurb: "Room to breathe" },
];

export const RADII: { id: Radius; label: string }[] = [
  { id: "sharp", label: "Sharp" },
  { id: "soft", label: "Soft" },
  { id: "round", label: "Round" },
];

/** Narrow an unknown value to a member of `allowed`, else fall back. */
function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function normalize(raw: unknown): Appearance {
  const o = (raw ?? {}) as Partial<Record<keyof Appearance, unknown>>;
  return {
    palette: pick(o.palette, ["studio", "noir", "aurora"], DEFAULT_APPEARANCE.palette),
    mode: pick(o.mode, ["light", "dark", "system"], DEFAULT_APPEARANCE.mode),
    density: pick(
      o.density,
      ["compact", "comfortable", "spacious"],
      DEFAULT_APPEARANCE.density,
    ),
    radius: pick(o.radius, ["sharp", "soft", "round"], DEFAULT_APPEARANCE.radius),
    motion: pick(o.motion, ["full", "reduced"], DEFAULT_APPEARANCE.motion),
  };
}

export function readAppearance(): Appearance {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"));
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

/** "system" resolves against the OS preference; the others pass through. */
export function resolveMode(mode: Mode): "light" | "dark" {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyAppearance(a: Appearance) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.setAttribute("data-theme", resolveMode(a.mode));
  el.setAttribute("data-palette", a.palette);
  el.setAttribute("data-density", a.density);
  el.setAttribute("data-radius", a.radius);
  el.setAttribute("data-motion", a.motion);
}

export function saveAppearance(a: Appearance) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch {
    // Private mode / blocked storage — the change still applies to this page.
  }
}
