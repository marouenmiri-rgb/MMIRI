import type { Accessory, CastMember, CharacterKind, Expression } from "./types";

/**
 * Procedural cartoon characters, drawn as SVG in a local coordinate system
 * where the feet sit on y=0 and the body extends upward (negative y).
 * Everything is flat fills + a thick ink outline, so any body color reads
 * as the same "show".
 */

export const INK = "#1b1b2f";
const OUTLINE = `stroke="${INK}" stroke-width="9" stroke-linejoin="round"`;

type Geometry = {
  headTop: number;
  eyeY: number;
  eyeDX: number;
  eyeR: number;
  mouthY: number;
  armY: number;
  halfW: number;
};

const GEOMETRY: Record<CharacterKind, Geometry> = {
  blob: { headTop: -400, eyeY: -255, eyeDX: 62, eyeR: 40, mouthY: -175, armY: -170, halfW: 172 },
  human: { headTop: -430, eyeY: -265, eyeDX: 55, eyeR: 36, mouthY: -185, armY: -165, halfW: 130 },
  cat: { headTop: -445, eyeY: -245, eyeDX: 62, eyeR: 40, mouthY: -155, armY: -150, halfW: 165 },
  dog: { headTop: -380, eyeY: -265, eyeDX: 58, eyeR: 36, mouthY: -150, armY: -150, halfW: 165 },
  bear: { headTop: -420, eyeY: -260, eyeDX: 60, eyeR: 34, mouthY: -150, armY: -150, halfW: 168 },
  frog: { headTop: -365, eyeY: -295, eyeDX: 88, eyeR: 46, mouthY: -175, armY: -120, halfW: 198 },
  robot: { headTop: -480, eyeY: -270, eyeDX: 52, eyeR: 30, mouthY: -195, armY: -140, halfW: 150 },
  bird: { headTop: -420, eyeY: -255, eyeDX: 55, eyeR: 36, mouthY: -180, armY: -160, halfW: 160 },
};

export function geometryOf(kind: CharacterKind): Geometry {
  return GEOMETRY[kind];
}

export type CharacterPose = {
  expression: Expression;
  mouthOpen: boolean;
  blink: boolean;
  /** Seconds into the panel, for small idle wiggles (hearts, sweat). */
  t: number;
  /** Override arm pose (used for waving on the end card). */
  wave?: boolean;
};

export function drawCharacter(c: CastMember, pose: CharacterPose): string {
  const g = GEOMETRY[c.kind];
  const body = c.color;
  const dark = shade(body, -0.28);
  const light = shade(body, 0.35);
  const parts: string[] = [];

  // Floor shadow
  parts.push(
    `<ellipse cx="0" cy="6" rx="${g.halfW * 0.95}" ry="26" fill="#000" opacity="0.18"/>`,
  );

  // Behind-body extras
  if (c.kind === "cat") {
    parts.push(
      `<path d="M 140 -70 C 260 -90, 250 -230, 300 -300" fill="none" stroke="${INK}" stroke-width="44" stroke-linecap="round"/>`,
      `<path d="M 140 -70 C 260 -90, 250 -230, 300 -300" fill="none" stroke="${body}" stroke-width="28" stroke-linecap="round"/>`,
    );
  }
  if (c.kind === "dog") {
    parts.push(
      `<path d="M 150 -80 Q 250 -120 240 -200" fill="none" stroke="${INK}" stroke-width="40" stroke-linecap="round"/>`,
      `<path d="M 150 -80 Q 250 -120 240 -200" fill="none" stroke="${dark}" stroke-width="24" stroke-linecap="round"/>`,
    );
  }

  // Feet
  parts.push(
    `<ellipse cx="-70" cy="-8" rx="52" ry="26" fill="${dark}" ${OUTLINE}/>`,
    `<ellipse cx="70" cy="-8" rx="52" ry="26" fill="${dark}" ${OUTLINE}/>`,
  );

  // Arms go behind the body silhouette at the shoulder, so draw first.
  parts.push(drawArms(g, pose, body));

  parts.push(drawBody(c.kind, g, body, dark, light));
  parts.push(drawFace(c.kind, g, pose, body));
  parts.push(drawAccessory(c.accessory, c.kind, g));
  parts.push(drawEmotes(g, pose));

  return parts.join("");
}

function drawBody(
  kind: CharacterKind,
  g: Geometry,
  body: string,
  dark: string,
  light: string,
): string {
  switch (kind) {
    case "blob":
      return (
        `<path d="M -175 -20 C -195 -250, -125 -400, 0 -400 C 125 -400, 195 -250, 175 -20 C 110 12, -110 12, -175 -20 Z" fill="${body}" ${OUTLINE}/>` +
        `<ellipse cx="-80" cy="-320" rx="36" ry="20" fill="#fff" opacity="0.35" transform="rotate(-30 -80 -320)"/>`
      );
    case "human":
      return (
        `<rect x="-130" y="-400" width="260" height="392" rx="125" fill="${body}" ${OUTLINE}/>` +
        `<rect x="-130" y="-150" width="260" height="142" rx="40" fill="${dark}" ${OUTLINE}/>` +
        `<path d="M -138 -275 C -160 -440, 160 -455, 138 -275 C 100 -330, 45 -300, 0 -345 C -45 -300, -100 -330, -138 -275 Z" fill="#3b2a20" ${OUTLINE}/>`
      );
    case "cat":
      return (
        `<path d="M -150 -290 L -125 -445 L -45 -370 Z" fill="${body}" ${OUTLINE}/>` +
        `<path d="M 150 -290 L 125 -445 L 45 -370 Z" fill="${body}" ${OUTLINE}/>` +
        `<path d="M -128 -320 L -115 -405 L -75 -368 Z" fill="#ff9fbf"/>` +
        `<path d="M 128 -320 L 115 -405 L 75 -368 Z" fill="#ff9fbf"/>` +
        `<ellipse cx="0" cy="-195" rx="168" ry="188" fill="${body}" ${OUTLINE}/>` +
        `<ellipse cx="0" cy="-95" rx="95" ry="70" fill="${light}"/>` +
        `<path d="M -18 -200 L 18 -200 L 0 -180 Z" fill="#ff7aa2" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M -70 -195 L -190 -215 M -70 -180 L -190 -175 M 70 -195 L 190 -215 M 70 -180 L 190 -175" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`
      );
    case "dog":
      return (
        `<ellipse cx="0" cy="-190" rx="168" ry="185" fill="${body}" ${OUTLINE}/>` +
        `<ellipse cx="-160" cy="-270" rx="52" ry="105" fill="${dark}" ${OUTLINE} transform="rotate(18 -160 -270)"/>` +
        `<ellipse cx="160" cy="-270" rx="52" ry="105" fill="${dark}" ${OUTLINE} transform="rotate(-18 160 -270)"/>` +
        `<ellipse cx="0" cy="-175" rx="88" ry="62" fill="${light}" ${OUTLINE}/>` +
        `<ellipse cx="0" cy="-205" rx="30" ry="20" fill="${INK}"/>`
      );
    case "bear":
      return (
        `<circle cx="-120" cy="-355" r="55" fill="${body}" ${OUTLINE}/>` +
        `<circle cx="120" cy="-355" r="55" fill="${body}" ${OUTLINE}/>` +
        `<circle cx="-120" cy="-355" r="28" fill="${light}"/>` +
        `<circle cx="120" cy="-355" r="28" fill="${light}"/>` +
        `<ellipse cx="0" cy="-195" rx="172" ry="190" fill="${body}" ${OUTLINE}/>` +
        `<ellipse cx="0" cy="-172" rx="82" ry="58" fill="${light}" ${OUTLINE}/>` +
        `<ellipse cx="0" cy="-198" rx="26" ry="18" fill="${INK}"/>`
      );
    case "frog":
      return (
        `<circle cx="-88" cy="-295" r="72" fill="${body}" ${OUTLINE}/>` +
        `<circle cx="88" cy="-295" r="72" fill="${body}" ${OUTLINE}/>` +
        `<ellipse cx="0" cy="-150" rx="202" ry="150" fill="${body}" ${OUTLINE}/>` +
        `<ellipse cx="0" cy="-80" rx="120" ry="62" fill="${light}"/>` +
        // re-draw eye bumps' lower half over the body outline
        `<ellipse cx="-88" cy="-282" rx="62" ry="55" fill="${body}"/>` +
        `<ellipse cx="88" cy="-282" rx="62" ry="55" fill="${body}"/>`
      );
    case "robot":
      return (
        `<line x1="0" y1="-392" x2="0" y2="-455" stroke="${INK}" stroke-width="10"/>` +
        `<circle cx="0" cy="-462" r="20" fill="#ff4d6d" ${OUTLINE}/>` +
        `<rect x="-150" y="-392" width="300" height="384" rx="42" fill="${body}" ${OUTLINE}/>` +
        `<rect x="-112" y="-335" width="224" height="185" rx="26" fill="#1d2233" ${OUTLINE}/>` +
        `<circle cx="-110" cy="-80" r="12" fill="${dark}"/>` +
        `<circle cx="110" cy="-80" r="12" fill="${dark}"/>` +
        `<rect x="-60" y="-110" width="120" height="50" rx="12" fill="${light}" ${OUTLINE}/>`
      );
    case "bird":
      return (
        `<path d="M -10 -372 Q -40 -440 -5 -430 M 5 -372 Q 20 -450 40 -420 M -20 -370 Q -80 -420 -60 -400" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>` +
        `<ellipse cx="0" cy="-190" rx="162" ry="182" fill="${body}" ${OUTLINE}/>` +
        `<ellipse cx="0" cy="-95" rx="92" ry="72" fill="${light}"/>`
      );
  }
}

function drawFace(
  kind: CharacterKind,
  g: Geometry,
  pose: CharacterPose,
  body: string,
): string {
  const e = pose.expression;
  const parts: string[] = [];
  const robot = kind === "robot";
  const eyeInk = robot ? "#6ff5ff" : INK;

  // Blush
  if (!robot && (e === "happy" || e === "love" || e === "laughing" || e === "smug")) {
    for (const s of [-1, 1]) {
      parts.push(
        `<ellipse cx="${s * (g.eyeDX + 42)}" cy="${g.eyeY + 58}" rx="30" ry="17" fill="#ff5c8a" opacity="0.45"/>`,
      );
    }
  }

  // Eyes
  for (const s of [-1, 1]) {
    const ex = s * g.eyeDX;
    const ey = g.eyeY;
    const r = g.eyeR;
    if (e === "love") {
      parts.push(heart(ex, ey, r * 1.1, "#ff3b6b"));
      continue;
    }
    if (e === "happy" || e === "laughing") {
      parts.push(
        `<path d="M ${ex - r * 0.85} ${ey + r * 0.25} Q ${ex} ${ey - r * 1.0} ${ex + r * 0.85} ${ey + r * 0.25}" fill="none" stroke="${eyeInk}" stroke-width="11" stroke-linecap="round"/>`,
      );
      continue;
    }
    if (pose.blink) {
      parts.push(
        `<line x1="${ex - r * 0.8}" y1="${ey}" x2="${ex + r * 0.8}" y2="${ey}" stroke="${eyeInk}" stroke-width="10" stroke-linecap="round"/>`,
      );
      continue;
    }
    const big = e === "shocked" || e === "scared" ? 1.18 : 1;
    const pr =
      e === "shocked" || e === "scared" ? r * 0.26 : robot ? r * 0.55 : r * 0.46;
    let px = 0;
    let py = 0;
    if (e === "sad") py = r * 0.3;
    if (e === "smug") px = r * 0.3;
    if (e === "confused") px = s * r * 0.25;
    if (e === "scared") px = Math.sin(pose.t * 40) * r * 0.12;
    if (robot) {
      parts.push(`<circle cx="${ex + px}" cy="${ey + py}" r="${pr}" fill="${eyeInk}"/>`);
    } else {
      parts.push(
        `<circle cx="${ex}" cy="${ey}" r="${r * big}" fill="#fff" stroke="${INK}" stroke-width="6"/>`,
        `<circle cx="${ex + px}" cy="${ey + py}" r="${pr}" fill="${INK}"/>`,
        `<circle cx="${ex + px + pr * 0.35}" cy="${ey + py - pr * 0.4}" r="${Math.max(3, pr * 0.3)}" fill="#fff"/>`,
      );
    }
    if (e === "smug" && !robot) {
      // heavy lids: cover the top half with the body color
      parts.push(
        `<path d="M ${ex - r - 4} ${ey - 2} A ${r + 4} ${r + 4} 0 0 1 ${ex + r + 4} ${ey - 2} Z" fill="${body}"/>`,
        `<line x1="${ex - r}" y1="${ey}" x2="${ex + r}" y2="${ey}" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
      );
    }
  }

  // Brows
  const by = g.eyeY - g.eyeR * 1.5;
  const brow = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${eyeInk}" stroke-width="10" stroke-linecap="round"/>`;
  const dx = g.eyeDX;
  switch (e) {
    case "angry":
      parts.push(brow(-dx - 38, by - 14, -dx + 32, by + 16), brow(dx + 38, by - 14, dx - 32, by + 16));
      break;
    case "sad":
    case "scared":
      parts.push(brow(-dx - 34, by + 10, -dx + 30, by - 14), brow(dx + 34, by + 10, dx - 30, by - 14));
      break;
    case "shocked":
      parts.push(brow(-dx - 30, by - 26, -dx + 30, by - 30), brow(dx + 30, by - 26, dx - 30, by - 30));
      break;
    case "confused":
      parts.push(brow(-dx - 30, by - 22, -dx + 30, by - 30), brow(dx + 30, by + 6, dx - 30, by + 2));
      break;
    case "smug":
      parts.push(brow(-dx - 30, by, -dx + 30, by - 6), brow(dx + 30, by - 18, dx - 30, by - 6));
      break;
  }

  parts.push(drawMouth(kind, g, pose));
  return parts.join("");
}

function drawMouth(kind: CharacterKind, g: Geometry, pose: CharacterPose): string {
  const e = pose.expression;
  const my = g.mouthY;
  const ink = kind === "robot" ? "#6ff5ff" : INK;
  const cavity = "#4a1427";
  const tongue = "#ff7a8a";

  if (kind === "robot") {
    // equalizer-bar mouth on the screen
    const bars = [-54, -27, 0, 27, 54];
    return bars
      .map((x, i) => {
        const h = pose.mouthOpen ? 14 + ((i * 37 + Math.round(pose.t * 20)) % 5) * 7 : e === "sad" ? 6 : 10;
        return `<rect x="${x - 9}" y="${my - h / 2}" width="18" height="${h}" rx="4" fill="${ink}"/>`;
      })
      .join("");
  }

  if (kind === "bird") {
    const open = pose.mouthOpen || e === "shocked" || e === "laughing" ? 34 : 0;
    return (
      `<path d="M -42 ${my - 12} L 42 ${my - 12} L 0 ${my + 34} Z" fill="#ffae2b" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>` +
      (open
        ? `<path d="M -34 ${my + 4} L 34 ${my + 4} L 0 ${my + 4 + open + 20} Z" fill="#ff8c1a" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`
        : "")
    );
  }

  if (pose.mouthOpen) {
    if (e === "happy" || e === "laughing" || e === "love") {
      return (
        `<path d="M -62 ${my} Q 0 ${my + 110} 62 ${my} Z" fill="${cavity}" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>` +
        `<ellipse cx="0" cy="${my + 40}" rx="26" ry="12" fill="${tongue}"/>`
      );
    }
    return (
      `<ellipse cx="0" cy="${my + 12}" rx="${e === "shocked" ? 34 : 40}" ry="${e === "shocked" ? 50 : 32}" fill="${cavity}" stroke="${INK}" stroke-width="8"/>` +
      `<ellipse cx="0" cy="${my + 30}" rx="20" ry="9" fill="${tongue}"/>`
    );
  }

  switch (e) {
    case "happy":
    case "love":
      return `<path d="M -58 ${my} Q 0 ${my + 64} 58 ${my}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`;
    case "laughing":
      return (
        `<path d="M -75 ${my - 6} Q 0 ${my + 140} 75 ${my - 6} Z" fill="${cavity}" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>` +
        `<ellipse cx="0" cy="${my + 50}" rx="32" ry="15" fill="${tongue}"/>`
      );
    case "shocked":
      return `<ellipse cx="0" cy="${my + 14}" rx="30" ry="44" fill="${cavity}" stroke="${INK}" stroke-width="8"/>`;
    case "angry":
      return (
        `<rect x="-58" y="${my - 6}" width="116" height="40" rx="12" fill="#fff" stroke="${INK}" stroke-width="8"/>` +
        `<line x1="-50" y1="${my + 14}" x2="50" y2="${my + 14}" stroke="${INK}" stroke-width="5"/>` +
        `<line x1="-20" y1="${my - 4}" x2="-20" y2="${my + 32}" stroke="${INK}" stroke-width="5"/>` +
        `<line x1="20" y1="${my - 4}" x2="20" y2="${my + 32}" stroke="${INK}" stroke-width="5"/>`
      );
    case "sad":
      return `<path d="M -50 ${my + 28} Q 0 ${my - 22} 50 ${my + 28}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`;
    case "smug":
      return `<path d="M -48 ${my + 8} Q 10 ${my + 30} 58 ${my - 16}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`;
    case "confused":
      return `<path d="M -52 ${my + 6} Q -26 ${my - 14} 0 ${my + 6} Q 26 ${my + 26} 52 ${my + 6}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`;
    case "scared":
      return (
        `<rect x="-56" y="${my - 8}" width="112" height="44" rx="14" fill="${cavity}" stroke="${INK}" stroke-width="8"/>` +
        `<path d="M -48 ${my + 2} L -32 ${my + 16} L -16 ${my + 2} L 0 ${my + 16} L 16 ${my + 2} L 32 ${my + 16} L 48 ${my + 2}" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>`
      );
    default:
      return `<path d="M -40 ${my + 8} Q 0 ${my + 22} 40 ${my + 8}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`;
  }
}

type ArmTarget = { hand: [number, number]; elbow?: [number, number] };

function drawArms(g: Geometry, pose: CharacterPose, body: string): string {
  const e = pose.expression;
  const sy = g.armY;
  const hw = g.halfW;
  const wiggle = Math.sin(pose.t * 10) * 18;

  const arm = (s: -1 | 1): ArmTarget => {
    if (pose.wave && s === 1) {
      return { hand: [hw + 80 + wiggle * 0.5, sy - 190 + wiggle] };
    }
    switch (e) {
      case "happy":
        return { hand: [s * (hw + 95), sy - 150 + (s === 1 ? wiggle : -wiggle)] };
      case "shocked":
        return { hand: [s * (hw + 110), sy - 200] };
      case "laughing":
        return { hand: [s * (hw - 70), sy + 95], elbow: [s * (hw + 60), sy + 50] };
      case "angry":
        return { hand: [s * (hw - 20), sy + 105], elbow: [s * (hw + 85), sy + 40] };
      case "smug":
        return s === 1
          ? { hand: [hw + 150, sy - 30] }
          : { hand: [-(hw - 20), sy + 105], elbow: [-(hw + 85), sy + 40] };
      case "confused":
        return s === 1
          ? { hand: [hw - 30, g.headTop + 40], elbow: [hw + 110, sy - 90] }
          : { hand: [-(hw + 50), sy + 130] };
      case "scared":
        return { hand: [s * (hw - 25), g.eyeY + 70], elbow: [s * (hw + 90), sy + 20] };
      case "love":
        return { hand: [s * 38, sy + 30], elbow: [s * (hw + 40), sy + 70] };
      case "sad":
        return { hand: [s * (hw + 30), sy + 150] };
      default:
        return { hand: [s * (hw + 55), sy + 135] };
    }
  };

  const out: string[] = [];
  for (const s of [-1, 1] as const) {
    const { hand, elbow } = arm(s);
    const sx = s * (hw - 18);
    const ctrl = elbow ?? [(sx + hand[0]) / 2 + s * 30, (sy + hand[1]) / 2];
    const d = `M ${sx} ${sy} Q ${ctrl[0]} ${ctrl[1]} ${hand[0]} ${hand[1]}`;
    out.push(
      `<path d="${d}" fill="none" stroke="${INK}" stroke-width="34" stroke-linecap="round"/>`,
      `<path d="${d}" fill="none" stroke="${body}" stroke-width="18" stroke-linecap="round"/>`,
      `<circle cx="${hand[0]}" cy="${hand[1]}" r="26" fill="${body}" stroke="${INK}" stroke-width="8"/>`,
    );
  }
  return out.join("");
}

function drawAccessory(a: Accessory, kind: CharacterKind, g: Geometry): string {
  const top = kind === "cat" ? -372 : kind === "frog" ? -300 : kind === "robot" ? -392 : g.headTop + 18;
  switch (a) {
    case "party-hat":
      return (
        `<path d="M -60 ${top + 10} L 0 ${top - 150} L 60 ${top + 10} Z" fill="#ff4fa0" ${OUTLINE}/>` +
        `<path d="M -38 ${top - 50} L 38 ${top - 50} M -22 ${top - 95} L 22 ${top - 95}" stroke="#ffe14d" stroke-width="12"/>` +
        `<circle cx="0" cy="${top - 155}" r="20" fill="#ffe14d" ${OUTLINE}/>`
      );
    case "top-hat":
      return (
        `<rect x="-100" y="${top - 12}" width="200" height="26" rx="10" fill="#222" ${OUTLINE}/>` +
        `<rect x="-62" y="${top - 150}" width="124" height="142" rx="10" fill="#222" ${OUTLINE}/>` +
        `<rect x="-62" y="${top - 45}" width="124" height="26" fill="#e23b4e"/>`
      );
    case "cap":
      return (
        `<path d="M -120 ${top + 30} C -120 ${top - 90}, 120 ${top - 90}, 120 ${top + 30} Z" fill="#2f7bff" ${OUTLINE}/>` +
        `<path d="M 60 ${top + 26} L 200 ${top + 34} Q 200 ${top + 6} 100 ${top} Z" fill="#1d5fd6" ${OUTLINE}/>`
      );
    case "crown":
      return `<path d="M -80 ${top + 10} L -90 ${top - 90} L -40 ${top - 40} L 0 ${top - 110} L 40 ${top - 40} L 90 ${top - 90} L 80 ${top + 10} Z" fill="#ffd23f" ${OUTLINE}/>`;
    case "glasses": {
      const y = g.eyeY;
      const dx = g.eyeDX;
      const r = g.eyeR + 14;
      return (
        `<circle cx="${-dx}" cy="${y}" r="${r}" fill="#9fe3ff" fill-opacity="0.25" stroke="${INK}" stroke-width="9"/>` +
        `<circle cx="${dx}" cy="${y}" r="${r}" fill="#9fe3ff" fill-opacity="0.25" stroke="${INK}" stroke-width="9"/>` +
        `<line x1="${-dx + r}" y1="${y}" x2="${dx - r}" y2="${y}" stroke="${INK}" stroke-width="9"/>`
      );
    }
    case "bow":
      return (
        `<path d="M 30 ${top + 20} L 120 ${top - 30} L 120 ${top + 60} Z" fill="#ff4f7a" ${OUTLINE}/>` +
        `<path d="M 30 ${top + 20} L -60 ${top - 30} L -60 ${top + 60} Z" fill="#ff4f7a" ${OUTLINE}/>` +
        `<circle cx="30" cy="${top + 20}" r="22" fill="#ff7a9a" ${OUTLINE}/>`
      );
    default:
      return "";
  }
}

function drawEmotes(g: Geometry, pose: CharacterPose): string {
  const e = pose.expression;
  const t = pose.t;
  const x = g.halfW + 10;
  const y = g.headTop + 40;
  switch (e) {
    case "love": {
      const out: string[] = [];
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.6 + i / 3) % 1;
        out.push(
          `<g opacity="${(1 - p).toFixed(2)}">${heart((i - 1) * 90, y - 40 - p * 180, 22 + i * 4, "#ff3b6b")}</g>`,
        );
      }
      return out.join("");
    }
    case "scared":
    case "confused": {
      const dy = (t * 80) % 60;
      return `<path d="M ${x} ${y + dy} q -22 38 0 50 q 22 -12 0 -50 z" fill="#6cc7ff" stroke="${INK}" stroke-width="5"/>`;
    }
    case "angry": {
      const s = 1 + Math.sin(t * 12) * 0.12;
      return `<g transform="translate(${x - 20} ${y - 20}) scale(${s.toFixed(2)})"><path d="M -30 -10 Q -10 -10 -10 -30 M 10 -30 Q 10 -10 30 -10 M 30 10 Q 10 10 10 30 M -10 30 Q -10 10 -30 10" fill="none" stroke="#ff2d2d" stroke-width="10" stroke-linecap="round"/></g>`;
    }
    case "sad": {
      const p = (t * 1.2) % 1;
      return `<ellipse cx="${-g.eyeDX}" cy="${g.eyeY + g.eyeR + 10 + p * 120}" rx="10" ry="16" fill="#6cc7ff" opacity="${(1 - p).toFixed(2)}"/>`;
    }
    case "shocked":
      return `<path d="M ${x - 30} ${y - 60} l 22 -60 M ${x + 10} ${y - 40} l 50 -40 M ${x + 20} ${y} l 60 -10" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>`;
    default:
      return "";
  }
}

export function heart(cx: number, cy: number, r: number, fill: string): string {
  const s = r / 20;
  return `<path transform="translate(${cx} ${cy}) scale(${s.toFixed(3)})" d="M 0 14 C -26 -4 -18 -24 -6 -20 C -2 -19 0 -15 0 -12 C 0 -15 2 -19 6 -20 C 18 -24 26 -4 0 14 Z" fill="${fill}" stroke="${INK}" stroke-width="${(4 / s).toFixed(2)}"/>`;
}

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb color. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)),
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
