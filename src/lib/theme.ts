/**
 * Theme colours for the places Tailwind classes can't reach — SVG paints,
 * inline gradients, canvas-ish inline styles. Every value resolves through
 * the same CSS variables as the Tailwind tokens, so these follow light/dark
 * automatically.
 *
 * Use them in `style` props rather than SVG presentation attributes:
 * browsers don't resolve `var()` inside attributes like `stroke="…"`.
 */
export const themeColor = {
  accent: "rgb(var(--accent-500))",
  accentSoft: "rgb(var(--accent-500) / 0.14)",
  accentFaint: "rgb(var(--accent-500) / 0.06)",
  mint: "rgb(var(--mint-500))",
  mintSoft: "rgb(var(--mint-500) / 0.16)",
  mintFaint: "rgb(var(--mint-500) / 0.06)",
  danger: "rgb(var(--danger))",
  warn: "rgb(var(--warn))",
  line: "rgb(var(--line-2))",
  lineFaint: "rgb(var(--line-1))",
  inkHi: "rgb(var(--ink-hi))",
  inkMid: "rgb(var(--ink-mid))",
  inkLo: "rgb(var(--ink-lo))",
  inkDim: "rgb(var(--ink-dim))",
  base0: "rgb(var(--base-0))",
  base1: "rgb(var(--base-1))",
  base3: "rgb(var(--base-3))",
} as const;
