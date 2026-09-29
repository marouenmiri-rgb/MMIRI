import { drawBackground, FLOOR, H, rand, W } from "./backgrounds";
import { drawCharacter, geometryOf, INK } from "./characters";
import type { Action, CartoonSketch, CastMember, Panel, Position } from "./types";

/**
 * Turns a sketch + a point in time into one SVG frame. The renderer calls
 * this ~15×/second and rasterizes each frame, so everything here is a pure
 * function of (sketch, timeline, t): no randomness, no I/O.
 */

export const TITLE_SEC = 1.8;
export const END_SEC = 2.4;

const FONT = `font-family="Arial Rounded MT Bold, Nunito, Comic Sans MS, DejaVu Sans, Arial, sans-serif" font-weight="800"`;

export type Segment =
  | { kind: "title"; start: number; duration: number }
  | { kind: "panel"; start: number; duration: number; index: number; talkSec: number }
  | { kind: "end"; start: number; duration: number };

export type Timeline = { segments: Segment[]; duration: number };

/**
 * Lay the sketch out in time. `talkSec[i]` is how long panel i's line takes
 * to say (from real TTS audio when we have it) — panels stretch to fit.
 */
export function buildTimeline(sketch: CartoonSketch, talkSec?: (number | null)[]): Timeline {
  const segments: Segment[] = [];
  let t = 0;
  segments.push({ kind: "title", start: t, duration: TITLE_SEC });
  t += TITLE_SEC;
  sketch.panels.forEach((p, index) => {
    const estimate = p.line ? Math.min(4.5, 0.35 + p.line.length * 0.055) : 0;
    const talk = talkSec?.[index] ?? estimate;
    const duration = Math.max(p.durationSec, talk + 0.7);
    segments.push({ kind: "panel", start: t, duration, index, talkSec: talk });
    t += duration;
  });
  segments.push({ kind: "end", start: t, duration: END_SEC });
  t += END_SEC;
  return { segments, duration: t };
}

export function segmentAt(tl: Timeline, t: number): Segment {
  for (const s of tl.segments) {
    if (t < s.start + s.duration) return s;
  }
  return tl.segments[tl.segments.length - 1];
}

export function renderFrameSvg(sketch: CartoonSketch, tl: Timeline, t: number): string {
  const seg = segmentAt(tl, t);
  const local = t - seg.start;
  let inner: string;
  if (seg.kind === "title") inner = titleCard(sketch, local, seg.duration);
  else if (seg.kind === "end") inner = endCard(sketch, local);
  else inner = panelFrame(sketch, sketch.panels[seg.index], local, seg.duration, seg.talkSec);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${inner}</svg>`;
}

// ---------------------------------------------------------------- panels

const SLOT_X: Record<number, Record<Position, number>> = {
  1: { left: 540, center: 540, right: 540 },
  2: { left: 300, center: 540, right: 780 },
  3: { left: 200, center: 540, right: 880 },
};
const SLOT_SCALE: Record<number, number> = { 1: 1.3, 2: 1.05, 3: 0.82 };

function panelFrame(
  sketch: CartoonSketch,
  panel: Panel,
  t: number,
  duration: number,
  talkSec: number,
): string {
  const castById = new Map(sketch.cast.map((c) => [c.id, c]));
  const n = Math.max(1, Math.min(3, panel.characters.length));
  const scale = SLOT_SCALE[n];

  // Two characters both asking for "center"/"left" still need distinct
  // slots; sort by requested position so left stays left.
  const order: Position[] = ["left", "center", "right"];
  const placed = [...panel.characters].sort(
    (a, b) => order.indexOf(a.position) - order.indexOf(b.position),
  );
  const slots: Position[] =
    n === 1 ? ["center"] : n === 2 ? ["left", "right"] : ["left", "center", "right"];

  const zoom = 1 + 0.035 * Math.min(1, t / duration);
  const out: string[] = [];
  out.push(`<g transform="translate(540 1100) scale(${zoom.toFixed(4)}) translate(-540 -1100)">`);
  out.push(drawBackground(panel.setting, t));

  let speakerAnchor: { x: number; y: number } | null = null;
  placed.forEach((pc, i) => {
    const member = castById.get(pc.id);
    if (!member) return;
    const baseX = SLOT_X[n][slots[i]];
    const talking = panel.speaker === pc.id && t < talkSec + 0.15;
    const mouthOpen = talking && Math.floor(t * 9) % 2 === 0;
    const blink = isBlinking(member.id, t);
    const m = motion(pc.action, t, baseX, member.id);
    const g = geometryOf(member.kind);
    const s = scale * m.squash;
    const flip = baseX > 540 && n > 1 ? -1 : 1; // face toward the middle
    out.push(
      `<g transform="translate(${(baseX + m.dx).toFixed(1)} ${(FLOOR + m.dy).toFixed(1)}) rotate(${m.rotate.toFixed(1)} 0 ${(-200 * scale).toFixed(0)}) scale(${(scale * m.scaleX * flip).toFixed(3)} ${s.toFixed(3)})">`,
      drawCharacter(member, { expression: pc.expression, mouthOpen, blink, t }),
      `</g>`,
    );
    if (panel.speaker === pc.id) {
      speakerAnchor = { x: baseX + m.dx, y: FLOOR + m.dy + g.headTop * scale };
    }
  });
  out.push(`</g>`);

  if (panel.caption) out.push(captionBox(panel.caption, t));
  if (panel.line && speakerAnchor) {
    const speaker = castById.get(panel.speaker)!;
    out.push(speechBubble(panel.line, speaker, speakerAnchor, t, talkSec, !!panel.caption));
  }
  if (panel.sfx) out.push(sfxBurst(panel.sfx, t, placed.length > 1 ? 540 : 800));
  return out.join("");
}

function isBlinking(id: string, t: number): boolean {
  const offset = hashStr(id) % 2000;
  return (t * 1000 + offset) % 2600 < 110;
}

type Motion = { dx: number; dy: number; rotate: number; squash: number; scaleX: number };

function motion(action: Action, t: number, baseX: number, id: string): Motion {
  const phase = (hashStr(id) % 100) / 100;
  const m: Motion = { dx: 0, dy: 0, rotate: 0, squash: 1, scaleX: 1 };
  const breathe = Math.sin((t + phase) * Math.PI * 2 * 0.9);
  m.squash = 1 + breathe * 0.015;
  switch (action) {
    case "bounce": {
      const b = Math.abs(Math.sin((t + phase) * Math.PI * 2.6));
      m.dy = -b * 70;
      m.squash = b < 0.15 ? 0.94 : 1.02;
      break;
    }
    case "jump": {
      const u = (t - 0.25) / 0.6;
      if (u > 0 && u < 1) m.dy = -Math.sin(u * Math.PI) * 300;
      else if (u >= 1 && u < 1.2) m.squash = 0.9;
      break;
    }
    case "shake":
      m.dx = Math.sin(t * 55) * 14;
      m.rotate = Math.sin(t * 40) * 2;
      break;
    case "enter-left":
    case "enter-right": {
      const u = Math.min(1, t / 0.55);
      const from = action === "enter-left" ? -baseX - 300 : W - baseX + 300;
      m.dx = from * (1 - easeOutBack(u));
      if (u < 1) m.rotate = Math.sin(t * 30) * 5;
      break;
    }
    case "fall-in": {
      const u = Math.min(1, t / 0.7);
      m.dy = -1700 * (1 - easeOutBounce(u));
      break;
    }
    case "spin": {
      const u = Math.min(1, t / 0.7);
      m.scaleX = Math.cos(u * Math.PI * 4);
      if (Math.abs(m.scaleX) < 0.08) m.scaleX = 0.08;
      break;
    }
  }
  return m;
}

// ---------------------------------------------------------------- overlays

function speechBubble(
  text: string,
  speaker: CastMember,
  anchor: { x: number; y: number },
  t: number,
  talkSec: number,
  pushDown: boolean,
): string {
  const pop = easeOutBack(Math.min(1, t / 0.18));
  const reveal = talkSec > 0 ? Math.min(1, t / Math.max(0.3, talkSec * 0.85)) : 1;
  const fontSize = text.length > 90 ? 46 : text.length > 50 ? 52 : 58;
  const maxChars = Math.floor(820 / (fontSize * 0.56));
  const lines = wrap(text, maxChars);
  const shown = Math.ceil(text.length * reveal);
  const lineH = fontSize * 1.18;
  const boxW = Math.min(900, Math.max(360, longest(lines) * fontSize * 0.56 + 110));
  const boxH = lines.length * lineH + 90;
  const cx = clamp(anchor.x, boxW / 2 + 40, W - boxW / 2 - 40);
  const top = pushDown ? 360 : 250;
  const cy = top + boxH / 2;
  const tailTipY = Math.min(anchor.y - 30, cy + boxH / 2 + 190);
  const tailX = clamp(anchor.x, cx - boxW / 2 + 90, cx + boxW / 2 - 90);

  let count = 0;
  const textRows = lines
    .map((ln, i) => {
      const visible = ln.slice(0, Math.max(0, shown - count));
      count += ln.length + 1;
      return `<text x="${cx}" y="${(cy - boxH / 2 + 62 + i * lineH + fontSize * 0.35).toFixed(0)}" font-size="${fontSize}" ${FONT} text-anchor="middle" fill="${INK}">${esc(visible)}</text>`;
    })
    .join("");

  const tag = esc(speaker.name.toUpperCase());
  const tagW = speaker.name.length * 22 + 50;
  return (
    `<g transform="translate(${cx} ${cy}) scale(${pop.toFixed(3)}) translate(${-cx} ${-cy})">` +
    `<path d="M ${tailX - 45} ${cy + boxH / 2 - 10} L ${anchor.x > tailX ? tailX + 70 : tailX - 70} ${tailTipY} L ${tailX + 45} ${cy + boxH / 2 - 10} Z" fill="#fff" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>` +
    `<rect x="${cx - boxW / 2}" y="${cy - boxH / 2}" width="${boxW}" height="${boxH}" rx="56" fill="#fff" stroke="${INK}" stroke-width="9"/>` +
    // cover the tail's top edge so bubble + tail read as one shape
    `<rect x="${tailX - 38}" y="${cy + boxH / 2 - 26}" width="76" height="24" fill="#fff"/>` +
    `<rect x="${cx - boxW / 2 + 36}" y="${cy - boxH / 2 - 28}" width="${tagW}" height="52" rx="26" fill="${speaker.color}" stroke="${INK}" stroke-width="7"/>` +
    `<text x="${cx - boxW / 2 + 36 + tagW / 2}" y="${cy - boxH / 2 + 10}" font-size="30" ${FONT} text-anchor="middle" fill="${INK}">${tag}</text>` +
    textRows +
    `</g>`
  );
}

function captionBox(text: string, t: number): string {
  const lines = wrap(text, 30);
  const h = lines.length * 50 + 40;
  const slide = (1 - easeOutBack(Math.min(1, t / 0.3))) * -300;
  return (
    `<g transform="translate(${slide.toFixed(1)} 0) rotate(-2 300 200)">` +
    `<rect x="60" y="130" width="${Math.min(900, longest(lines) * 24 + 70)}" height="${h}" fill="#ffe14d" stroke="${INK}" stroke-width="8"/>` +
    lines
      .map((l, i) => `<text x="95" y="${185 + i * 50}" font-size="40" ${FONT} fill="${INK}">${esc(l.toUpperCase())}</text>`)
      .join("") +
    `</g>`
  );
}

function sfxBurst(text: string, t: number, x: number): string {
  const delay = 0.35;
  if (t < delay) return "";
  const u = Math.min(1, (t - delay) / 0.2);
  const s = easeOutBack(u) * (1 + Math.sin(t * 18) * 0.03);
  const y = 1000;
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const r = i % 2 === 0 ? 230 : 150 + rand(i + text.length) * 30;
    const a = (i / 24) * Math.PI * 2;
    pts.push(`${(Math.cos(a) * r * 1.25).toFixed(0)},${(Math.sin(a) * r * 0.8).toFixed(0)}`);
  }
  const fontSize = text.length > 8 ? 70 : 96;
  return (
    `<g transform="translate(${x} ${y}) rotate(-10) scale(${s.toFixed(3)})">` +
    `<polygon points="${pts.join(" ")}" fill="#ffd23f" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>` +
    `<text x="0" y="${fontSize * 0.35}" font-size="${fontSize}" ${FONT} text-anchor="middle" fill="#ff3b3b" stroke="${INK}" stroke-width="5" paint-order="stroke">${esc(text.toUpperCase())}</text>` +
    `</g>`
  );
}

// ---------------------------------------------------------------- cards

function sunburst(t: number, a: string, b: string): string {
  const rays: string[] = [`<rect width="${W}" height="${H}" fill="${a}"/>`];
  const rot = t * 12;
  for (let i = 0; i < 16; i++) {
    const a0 = ((i * 2) / 32) * Math.PI * 2;
    const a1 = ((i * 2 + 1) / 32) * Math.PI * 2;
    const R = 2000;
    rays.push(
      `<path d="M 0 0 L ${(Math.cos(a0) * R).toFixed(0)} ${(Math.sin(a0) * R).toFixed(0)} L ${(Math.cos(a1) * R).toFixed(0)} ${(Math.sin(a1) * R).toFixed(0)} Z" fill="${b}"/>`,
    );
  }
  return `<g>${rays[0]}<g transform="translate(540 900) rotate(${rot.toFixed(1)})">${rays.slice(1).join("")}</g></g>`;
}

function titleCard(sketch: CartoonSketch, t: number, duration: number): string {
  const pop = easeOutBack(Math.min(1, t / 0.4));
  const lines = wrap(sketch.title, 13);
  const fontSize = lines.length > 2 ? 104 : 124;
  const out: string[] = [sunburst(t, "#ff6fa8", "#ff8fbd")];
  out.push(`<g transform="translate(540 820) scale(${pop.toFixed(3)}) rotate(${(-4 + Math.sin(t * 3) * 1.5).toFixed(2)})">`);
  lines.forEach((l, i) => {
    const y = (i - (lines.length - 1) / 2) * fontSize * 1.05 + fontSize * 0.35;
    out.push(
      `<text x="0" y="${y.toFixed(0)}" font-size="${fontSize}" ${FONT} text-anchor="middle" fill="#fff" stroke="${INK}" stroke-width="16" paint-order="stroke" stroke-linejoin="round">${esc(l.toUpperCase())}</text>`,
    );
  });
  out.push(`</g>`);
  // cast peeks in from the bottom
  const peek = easeOutBack(Math.min(1, Math.max(0, (t - 0.3) / 0.5)));
  const n = sketch.cast.length;
  sketch.cast.forEach((c, i) => {
    const x = n === 1 ? 540 : 200 + (i * 680) / (n - 1);
    const y = H + 120 - peek * 520;
    out.push(
      `<g transform="translate(${x} ${y.toFixed(0)}) scale(0.9)">${drawCharacter(c, { expression: "happy", mouthOpen: false, blink: isBlinking(c.id, t), t, wave: true })}</g>`,
    );
  });
  if (t > duration - 0.15) {
    out.push(`<rect width="${W}" height="${H}" fill="#fff" opacity="${((t - (duration - 0.15)) / 0.15).toFixed(2)}"/>`);
  }
  return out.join("");
}

function endCard(sketch: CartoonSketch, t: number): string {
  const out: string[] = [sunburst(t, "#5ec8ff", "#84d6ff")];
  const pop = easeOutBack(Math.min(1, t / 0.35));
  out.push(
    `<g transform="translate(540 430) scale(${pop.toFixed(3)}) rotate(-3)">` +
      `<text x="0" y="40" font-size="140" ${FONT} text-anchor="middle" fill="#ffe14d" stroke="${INK}" stroke-width="18" paint-order="stroke" stroke-linejoin="round">THE END</text>` +
      `</g>`,
  );
  if (sketch.cta) {
    const lines = wrap(sketch.cta, 24);
    const h = lines.length * 64 + 60;
    const boxW = Math.min(960, longest(lines) * 34 + 100);
    const ctaPop = easeOutBack(Math.min(1, Math.max(0, (t - 0.3) / 0.35)));
    out.push(
      `<g transform="translate(540 700) scale(${ctaPop.toFixed(3)})">` +
        `<rect x="${-boxW / 2}" y="0" width="${boxW}" height="${h}" rx="40" fill="#fff" stroke="${INK}" stroke-width="10"/>` +
        lines
          .map((l, i) => `<text x="0" y="${70 + i * 64}" font-size="56" ${FONT} text-anchor="middle" fill="${INK}">${esc(l)}</text>`)
          .join("") +
        `</g>`,
    );
  }
  const n = sketch.cast.length;
  const scale = n === 1 ? 1.2 : n === 2 ? 1 : 0.8;
  sketch.cast.forEach((c, i) => {
    const x = n === 1 ? 540 : 230 + (i * 620) / (n - 1);
    const hop = Math.abs(Math.sin((t + i * 0.3) * Math.PI * 2)) * 40;
    out.push(
      `<g transform="translate(${x} ${(1620 - hop).toFixed(0)}) scale(${scale})">${drawCharacter(c, {
        expression: "happy",
        mouthOpen: Math.floor(t * 6 + i) % 2 === 0,
        blink: isBlinking(c.id, t),
        t,
        wave: true,
      })}</g>`,
    );
  });
  return out.join("");
}

// ---------------------------------------------------------------- utils

export function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const word = w.length > maxChars ? w.slice(0, maxChars) : w;
    if (!cur) cur = word;
    else if ((cur + " " + word).length <= maxChars) cur += " " + word;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function longest(lines: string[]): number {
  return lines.reduce((m, l) => Math.max(m, l.length), 0);
}

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function easeOutBack(u: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
}

function easeOutBounce(u: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (u < 1 / d1) return n1 * u * u;
  if (u < 2 / d1) return n1 * (u -= 1.5 / d1) * u + 0.75;
  if (u < 2.5 / d1) return n1 * (u -= 2.25 / d1) * u + 0.9375;
  return n1 * (u -= 2.625 / d1) * u + 0.984375;
}

