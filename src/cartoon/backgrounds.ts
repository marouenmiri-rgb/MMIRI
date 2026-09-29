import { INK } from "./characters";
import type { Setting } from "./types";

export const W = 1080;
export const H = 1920;
export const FLOOR = 1480;

const O = `stroke="${INK}" stroke-width="8" stroke-linejoin="round"`;

/** Deterministic pseudo-random in [0,1) — frames must render identically. */
export function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function drawBackground(setting: Setting, t: number): string {
  switch (setting) {
    case "kitchen":
      return kitchen();
    case "office":
      return office(t);
    case "living-room":
      return livingRoom();
    case "street":
      return street(t);
    case "park":
      return park(t);
    case "beach":
      return beach(t);
    case "space":
      return space(t);
    case "store":
      return store();
  }
}

function wall(color: string, floor: string): string {
  return (
    `<rect width="${W}" height="${H}" fill="${color}"/>` +
    `<rect y="${FLOOR - 40}" width="${W}" height="${H - FLOOR + 40}" fill="${floor}"/>` +
    `<line x1="0" y1="${FLOOR - 40}" x2="${W}" y2="${FLOOR - 40}" stroke="${INK}" stroke-width="8"/>`
  );
}

function cloud(x: number, y: number, s: number): string {
  return `<g transform="translate(${x.toFixed(1)} ${y}) scale(${s})" fill="#fff" ${O}><path d="M -110 30 Q -120 -30 -60 -30 Q -40 -80 10 -70 Q 60 -100 90 -40 Q 140 -40 130 30 Z"/></g>`;
}

function kitchen(): string {
  const tiles: string[] = [];
  for (let y = 700; y < 1080; y += 76) {
    for (let x = 0; x < W; x += 76) {
      tiles.push(`<rect x="${x + 3}" y="${y + 3}" width="70" height="70" fill="#fff6e0" stroke="#e8d9b5" stroke-width="3"/>`);
    }
  }
  return (
    wall("#ffe7a8", "#d7a86e") +
    tiles.join("") +
    // upper cabinets
    `<rect x="40" y="200" width="420" height="330" rx="18" fill="#6fb3a7" ${O}/>` +
    `<line x1="250" y1="200" x2="250" y2="530" stroke="${INK}" stroke-width="8"/>` +
    `<circle cx="225" cy="440" r="12" fill="${INK}"/><circle cx="275" cy="440" r="12" fill="${INK}"/>` +
    // window
    `<rect x="600" y="220" width="400" height="330" rx="18" fill="#9fe0ff" ${O}/>` +
    `<line x1="800" y1="220" x2="800" y2="550" stroke="${INK}" stroke-width="8"/>` +
    `<line x1="600" y1="385" x2="1000" y2="385" stroke="${INK}" stroke-width="8"/>` +
    // counter
    `<rect x="-10" y="1080" width="${W + 20}" height="60" fill="#f4f1ea" ${O}/>` +
    `<rect x="-10" y="1140" width="${W + 20}" height="300" fill="#6fb3a7" ${O}/>` +
    // pot
    `<rect x="120" y="990" width="170" height="95" rx="18" fill="#ff7a4d" ${O}/>` +
    `<rect x="100" y="975" width="210" height="28" rx="12" fill="#e55f33" ${O}/>`
  );
}

function office(t: number): string {
  const buildings: string[] = [];
  for (let i = 0; i < 7; i++) {
    const h = 120 + rand(i + 3) * 170;
    buildings.push(`<rect x="${230 + i * 90}" y="${620 - h}" width="80" height="${h}" fill="#7c8db5"/>`);
  }
  return (
    wall("#dfe7f2", "#9aa6b8") +
    `<rect x="200" y="200" width="680" height="440" rx="16" fill="#bfe6ff" ${O}/>` +
    cloud(360 + ((t * 20) % 300), 330, 0.7) +
    buildings.join("") +
    `<rect x="200" y="200" width="680" height="440" rx="16" fill="none" ${O}/>` +
    // clock
    `<circle cx="120" cy="330" r="70" fill="#fff" ${O}/>` +
    `<line x1="120" y1="330" x2="120" y2="285" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>` +
    `<line x1="120" y1="330" x2="${120 + Math.cos(t * 2) * 45}" y2="${330 + Math.sin(t * 2) * 45}" stroke="#e23b4e" stroke-width="6" stroke-linecap="round"/>` +
    // desk
    `<rect x="-10" y="1100" width="${W + 20}" height="50" fill="#b98352" ${O}/>` +
    `<rect x="60" y="1150" width="40" height="290" fill="#8a5d36" ${O}/>` +
    `<rect x="980" y="1150" width="40" height="290" fill="#8a5d36" ${O}/>` +
    // monitor + plant
    `<rect x="700" y="880" width="260" height="170" rx="14" fill="#2b3350" ${O}/>` +
    `<rect x="805" y="1050" width="50" height="50" fill="#555" ${O}/>` +
    `<rect x="110" y="990" width="110" height="110" rx="12" fill="#e0794f" ${O}/>` +
    `<path d="M 165 990 Q 120 880 90 900 M 165 990 Q 170 860 200 850 M 165 990 Q 230 900 250 930" fill="none" stroke="#3aa85b" stroke-width="22" stroke-linecap="round"/>`
  );
}

function livingRoom(): string {
  return (
    wall("#ffd3c4", "#b8875c") +
    // frames
    `<rect x="120" y="260" width="240" height="190" rx="10" fill="#fff4c2" ${O}/>` +
    `<path d="M 150 420 L 220 330 L 270 390 L 300 350 L 340 420 Z" fill="#6cbf6c"/>` +
    `<circle cx="310" cy="310" r="22" fill="#ffb13b"/>` +
    `<rect x="700" y="230" width="220" height="260" rx="10" fill="#c8e6ff" ${O}/>` +
    `<circle cx="810" cy="340" r="60" fill="#ff8fb1" ${O}/>` +
    // sofa behind
    `<rect x="60" y="930" width="960" height="260" rx="60" fill="#5b7bd5" ${O}/>` +
    `<rect x="20" y="1030" width="140" height="280" rx="50" fill="#4a68bd" ${O}/>` +
    `<rect x="920" y="1030" width="140" height="280" rx="50" fill="#4a68bd" ${O}/>` +
    `<rect x="120" y="1120" width="840" height="190" rx="40" fill="#6a8ae0" ${O}/>` +
    // lamp
    `<line x1="990" y1="930" x2="990" y2="620" stroke="${INK}" stroke-width="10"/>` +
    `<path d="M 920 620 L 1060 620 L 1030 520 L 950 520 Z" fill="#ffe36b" ${O}/>` +
    // rug
    `<ellipse cx="540" cy="1640" rx="470" ry="120" fill="#e0566f" ${O}/>` +
    `<ellipse cx="540" cy="1640" rx="380" ry="85" fill="none" stroke="#ffd166" stroke-width="10"/>`
  );
}

function sky(top: string, bottom: string, id: string): string {
  return (
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#${id})"/>`
  );
}

function street(t: number): string {
  const out: string[] = [sky("#7cc8ff", "#d4efff", "skySt")];
  out.push(cloud(-100 + ((t * 30) % 1300), 260, 1), cloud(700 - ((t * 18) % 900), 420, 0.7));
  const colors = ["#ff8f6b", "#ffd166", "#7bd389", "#b28dff", "#ff6f91"];
  for (let i = 0; i < 5; i++) {
    const x = i * 230 - 40;
    const h = 520 + rand(i) * 300;
    const top = FLOOR - 120 - h;
    out.push(`<rect x="${x}" y="${top}" width="220" height="${h}" fill="${colors[i]}" ${O}/>`);
    for (let r = 0; r < Math.floor(h / 140); r++) {
      for (let c = 0; c < 2; c++) {
        const lit = rand(i * 31 + r * 7 + c) > 0.45;
        out.push(
          `<rect x="${x + 35 + c * 90}" y="${top + 40 + r * 140}" width="60" height="80" rx="8" fill="${lit ? "#fff3a8" : "#5a6b8c"}" stroke="${INK}" stroke-width="6"/>`,
        );
      }
    }
  }
  out.push(
    `<rect y="${FLOOR - 120}" width="${W}" height="80" fill="#c9c9c9" ${O}/>`,
    `<rect y="${FLOOR - 40}" width="${W}" height="${H - FLOOR + 40}" fill="#5b5f6b"/>`,
    ...[0, 1, 2, 3].map((i) => `<rect x="${i * 300 + 60}" y="1720" width="160" height="22" rx="10" fill="#f4f4f4"/>`),
    // street lamp
    `<rect x="960" y="700" width="22" height="700" fill="#333" ${O}/>`,
    `<path d="M 971 700 Q 971 640 900 650" fill="none" stroke="#333" stroke-width="16"/>`,
    `<ellipse cx="895" cy="660" rx="45" ry="22" fill="#ffe66b" ${O}/>`,
  );
  return out.join("");
}

function park(t: number): string {
  const trees = [120, 900]
    .map(
      (x, i) =>
        `<rect x="${x - 25}" y="${FLOOR - 460}" width="50" height="400" fill="#8a5d36" ${O}/>` +
        `<circle cx="${x}" cy="${FLOOR - 520 + Math.sin(t * 2 + i) * 6}" r="170" fill="${i ? "#3fae5a" : "#4cc06a"}" ${O}/>`,
    )
    .join("");
  return (
    sky("#6ec6ff", "#e0f6ff", "skyPk") +
    `<circle cx="850" cy="300" r="110" fill="#ffd93b" ${O}/>` +
    cloud(-150 + ((t * 25) % 1400), 330, 1.1) +
    `<ellipse cx="200" cy="${FLOOR}" rx="700" ry="330" fill="#7ed56f" ${O}/>` +
    `<ellipse cx="950" cy="${FLOOR + 40}" rx="600" ry="300" fill="#6cc95e" ${O}/>` +
    trees +
    `<rect y="${FLOOR - 40}" width="${W}" height="${H - FLOOR + 40}" fill="#59b84f"/>` +
    [0, 1, 2, 3, 4, 5]
      .map((i) => `<circle cx="${80 + i * 190}" cy="${1650 + (i % 2) * 120}" r="14" fill="${i % 2 ? "#fff" : "#ff7ab8"}"/>`)
      .join("")
  );
}

function beach(t: number): string {
  const wave = (y: number, amp: number, phase: number, color: string) => {
    let d = `M 0 ${y}`;
    for (let x = 0; x <= W; x += 60) {
      d += ` L ${x} ${(y + Math.sin(x / 80 + t * 3 + phase) * amp).toFixed(1)}`;
    }
    d += ` L ${W} ${FLOOR} L 0 ${FLOOR} Z`;
    return `<path d="${d}" fill="${color}"/>`;
  };
  return (
    sky("#58c4ff", "#ffe9c7", "skyBc") +
    `<circle cx="780" cy="380" r="130" fill="#ffcf3b" ${O}/>` +
    cloud(100 + ((t * 15) % 900), 250, 0.8) +
    wave(1020, 14, 0, "#2f9be0") +
    wave(1120, 12, 1.5, "#4fb3f0") +
    `<rect y="${FLOOR - 120}" width="${W}" height="${H - FLOOR + 120}" fill="#ffd98a"/>` +
    `<path d="M 0 ${FLOOR - 120} Q 540 ${FLOOR - 170} ${W} ${FLOOR - 120}" fill="#ffd98a" stroke="${INK}" stroke-width="8"/>` +
    // palm
    `<path d="M 130 ${FLOOR - 80} Q 170 1100 110 760" fill="none" stroke="${INK}" stroke-width="54" stroke-linecap="round"/>` +
    `<path d="M 130 ${FLOOR - 80} Q 170 1100 110 760" fill="none" stroke="#b07a45" stroke-width="38" stroke-linecap="round"/>` +
    [-60, -20, 30, 80]
      .map((a) => `<ellipse cx="110" cy="760" rx="170" ry="38" fill="#35b456" ${O} transform="rotate(${a + Math.sin(t * 2) * 4} 110 760) translate(120 0)"/>`)
      .join("") +
    // umbrella
    `<line x1="900" y1="${FLOOR - 30}" x2="900" y2="1150" stroke="${INK}" stroke-width="12"/>` +
    `<path d="M 740 1170 Q 900 1000 1060 1170 Z" fill="#ff5c7a" ${O}/>`
  );
}

function space(t: number): string {
  const stars: string[] = [];
  for (let i = 0; i < 70; i++) {
    const x = rand(i) * W;
    const y = rand(i + 100) * (FLOOR - 200);
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
    stars.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(2 + rand(i + 200) * 4).toFixed(1)}" fill="#fff" opacity="${tw.toFixed(2)}"/>`);
  }
  const craters = [120, 420, 760, 980]
    .map((x, i) => `<ellipse cx="${x}" cy="${1600 + (i % 2) * 150}" rx="${70 + i * 10}" ry="28" fill="#9a9aa8" stroke="${INK}" stroke-width="6"/>`)
    .join("");
  return (
    sky("#0b0b2b", "#3b1d6e", "skySp") +
    stars.join("") +
    `<circle cx="820" cy="420" r="150" fill="#ff9f5a" ${O}/>` +
    `<ellipse cx="820" cy="420" rx="260" ry="50" fill="none" stroke="#ffd98a" stroke-width="16" transform="rotate(-18 820 420)"/>` +
    `<circle cx="200" cy="${300 + Math.sin(t) * 10}" r="46" fill="#e6e6f0" ${O}/>` +
    `<rect y="${FLOOR - 40}" width="${W}" height="${H - FLOOR + 40}" fill="#b8b8c6"/>` +
    `<path d="M 0 ${FLOOR - 40} Q 270 ${FLOOR - 90} 540 ${FLOOR - 40} T ${W} ${FLOOR - 40}" fill="#b8b8c6" stroke="${INK}" stroke-width="8"/>` +
    craters
  );
}

function store(): string {
  const out: string[] = [wall("#e9f7ef", "#d0d4db")];
  const colors = ["#ff6b6b", "#ffd166", "#4ecdc4", "#a78bfa", "#ff9f43", "#54a0ff"];
  for (let s = 0; s < 3; s++) {
    const y = 380 + s * 250;
    out.push(`<rect x="30" y="${y + 150}" width="1020" height="26" fill="#9aa4b1" ${O}/>`);
    for (let i = 0; i < 9; i++) {
      const h = 90 + rand(s * 10 + i) * 60;
      out.push(
        `<rect x="${50 + i * 110}" y="${y + 150 - h}" width="90" height="${h}" rx="8" fill="${colors[(s * 3 + i) % colors.length]}" stroke="${INK}" stroke-width="6"/>`,
      );
    }
  }
  out.push(
    `<rect x="330" y="140" width="420" height="120" rx="20" fill="#ff3b5c" ${O} transform="rotate(-3 540 200)"/>`,
    `<text x="540" y="228" font-size="84" font-weight="900" text-anchor="middle" fill="#fff" font-family="DejaVu Sans, Arial, sans-serif" transform="rotate(-3 540 200)">SALE!</text>`,
  );
  return out.join("");
}
