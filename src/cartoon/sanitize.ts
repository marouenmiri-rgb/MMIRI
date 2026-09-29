import {
  ACCESSORIES,
  ACTIONS,
  CHARACTER_KINDS,
  EXPRESSIONS,
  POSITIONS,
  SETTINGS,
  VOICES,
  type CartoonSketch,
  type CastMember,
  type Panel,
  type PanelCharacter,
  type Position,
} from "./types";

const FALLBACK_COLORS = ["#ffb13b", "#5ec8ff", "#ff6fa8", "#8be36b", "#b78cff", "#ff7a4d"];

export const MAX_CAST = 3;
export const MAX_PANELS = 10;

/**
 * Claude's structured output already follows the schema, but the renderer
 * must never crash on a surprising value — clamp every field to something
 * drawable. Unknown enum values fall back to a safe default, bad colors to
 * a palette color, and panels referencing unknown cast ids drop them.
 */
export function sanitizeSketch(raw: unknown): CartoonSketch {
  const r = (raw ?? {}) as Partial<CartoonSketch>;

  const cast: CastMember[] = [];
  const seen = new Set<string>();
  for (const [i, c] of (Array.isArray(r.cast) ? r.cast : []).entries()) {
    if (cast.length >= MAX_CAST) break;
    const id = str(c?.id, `c${i}`).slice(0, 24);
    if (seen.has(id)) continue;
    seen.add(id);
    cast.push({
      id,
      name: str(c?.name, `Buddy ${i + 1}`).slice(0, 24),
      kind: oneOf(c?.kind, CHARACTER_KINDS, CHARACTER_KINDS[i % CHARACTER_KINDS.length]),
      color: hex(c?.color) ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      accessory: oneOf(c?.accessory, ACCESSORIES, "none"),
      voice: oneOf(c?.voice, VOICES, VOICES[i % VOICES.length]),
    });
  }
  if (cast.length === 0) {
    cast.push({
      id: "c0",
      name: "Blobby",
      kind: "blob",
      color: FALLBACK_COLORS[0],
      accessory: "none",
      voice: "mid",
    });
  }
  const castIds = new Set(cast.map((c) => c.id));

  const panels: Panel[] = [];
  for (const p of Array.isArray(r.panels) ? r.panels : []) {
    if (panels.length >= MAX_PANELS) break;
    const chars: PanelCharacter[] = [];
    const usedPos = new Set<Position>();
    for (const pc of Array.isArray(p?.characters) ? p.characters : []) {
      if (!castIds.has(pc?.id) || chars.some((x) => x.id === pc.id)) continue;
      if (chars.length >= MAX_CAST) break;
      let position = oneOf(pc?.position, POSITIONS, "center");
      if (usedPos.has(position)) {
        position = POSITIONS.find((x) => !usedPos.has(x)) ?? position;
      }
      usedPos.add(position);
      chars.push({
        id: pc.id,
        position,
        expression: oneOf(pc?.expression, EXPRESSIONS, "neutral"),
        action: oneOf(pc?.action, ACTIONS, "idle"),
      });
    }
    let speaker = str(p?.speaker, "");
    if (!castIds.has(speaker)) speaker = "";
    // A speaker who isn't drawn in the panel gets added so the bubble has
    // someone to point at.
    if (speaker && !chars.some((c) => c.id === speaker) && chars.length < MAX_CAST) {
      const position = POSITIONS.find((x) => !usedPos.has(x)) ?? "center";
      chars.push({ id: speaker, position, expression: "neutral", action: "idle" });
    }
    const line = speaker ? str(p?.line, "").slice(0, 140) : "";
    panels.push({
      setting: oneOf(p?.setting, SETTINGS, "living-room"),
      characters: chars,
      speaker: line ? speaker : "",
      line,
      sfx: str(p?.sfx, "").slice(0, 14),
      caption: str(p?.caption, "").slice(0, 80),
      durationSec: clamp(num(p?.durationSec, 3), 1.5, 6),
    });
  }
  if (panels.length === 0) {
    panels.push({
      setting: "living-room",
      characters: [
        { id: cast[0].id, position: "center", expression: "confused", action: "idle" },
      ],
      speaker: cast[0].id,
      line: "Huh. Nobody wrote me any lines.",
      sfx: "",
      caption: "",
      durationSec: 3,
    });
  }

  return {
    title: str(r.title, "Untitled Cartoon").slice(0, 60),
    logline: str(r.logline, "").slice(0, 200),
    cast,
    panels,
    cta: str(r.cta, "").slice(0, 70),
  };
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

function hex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return `#${h.toLowerCase()}`;
}
