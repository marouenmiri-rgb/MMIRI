import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { env } from "@/lib/env";
import { ffmpegAvailable, mediaDuration, runFfmpeg } from "@/lib/ffmpeg";
import { synthesizeVoiceover } from "@/agents/voiceover";
import { buildTimeline, renderFrameSvg, type Timeline } from "./scene";
import type { CartoonSketch, Voice } from "./types";

/**
 * Cartoon renderer: sketch → animated 9:16 MP4.
 *
 *   1. Dialogue audio — one ElevenLabs line per panel when ELEVENLABS_API_KEY
 *      is set (panels stretch to fit the real line length); otherwise each
 *      character "babbles" in their own pitch, Animal Crossing–style.
 *   2. SFX — a synthesized boing on every panel with an sfx burst, and a
 *      whoosh under the title card. No audio assets to ship.
 *   3. Frames — each frame is an SVG from scene.ts, rasterized with resvg
 *      and piped straight into ffmpeg (nothing hits disk).
 *
 * Returns nulls when ffmpeg isn't available, like the slideshow renderer.
 */

const FPS = 15;
const RENDER_WIDTH = 720; // rasterize at 720p, ffmpeg upscales to 1080×1920

// ElevenLabs premade voices, picked by the character's voice register.
const VOICE_IDS: Record<Voice, string> = {
  high: "jBpfuIE2acCO8z3wKNLl", // Gigi — animated, childlike
  mid: "TxGEqnHWrfWFTfGW9XjX", // Josh — young, bright
  low: "pNInz6obpgDQGcFmaJgB", // Adam — deep
};

const BABBLE_HZ: Record<Voice, number> = { high: 560, mid: 340, low: 200 };

export type CartoonRender = {
  videoPath: string | null;
  thumbnailPath: string | null;
  durationSec: number;
  voiced: boolean;
};

export async function renderCartoon(args: {
  sketch: CartoonSketch;
  outDir: string;
  onProgress?: (fraction: number) => void;
}): Promise<CartoonRender> {
  const { sketch, outDir } = args;
  await fs.mkdir(outDir, { recursive: true });

  const thumbnailPath = path.join(outDir, "cartoon.png");
  if (!(await ffmpegAvailable())) {
    const tl = buildTimeline(sketch);
    await writeThumbnail(sketch, tl, thumbnailPath);
    return { videoPath: null, thumbnailPath, durationSec: tl.duration, voiced: false };
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "adgen-cartoon-"));
  try {
    const lines = await synthesizeLines(sketch, workDir);
    const tl = buildTimeline(
      sketch,
      lines.map((l) => l?.durationSec ?? null),
    );

    const audioPath = path.join(workDir, "mix.wav");
    await mixAudio(sketch, tl, lines, audioPath);

    const videoPath = path.join(outDir, "cartoon.mp4");
    const totalFrames = Math.ceil(tl.duration * FPS);
    await runFfmpeg(
      [
        "-y",
        "-f", "image2pipe",
        "-framerate", String(FPS),
        "-c:v", "png",
        "-i", "-",
        "-i", audioPath,
        "-vf", "scale=1080:1920:flags=lanczos,fps=30",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "160k",
        "-t", tl.duration.toFixed(2),
        "-movflags", "+faststart",
        videoPath,
      ],
      {
        feed: async (stdin) => {
          for (let f = 0; f < totalFrames; f++) {
            const png = rasterize(renderFrameSvg(sketch, tl, f / FPS));
            if (!stdin.write(png)) {
              await new Promise<void>((r) => stdin.once("drain", () => r()));
            }
            if (f % 30 === 0) args.onProgress?.(f / totalFrames);
          }
        },
      },
    );

    await writeThumbnail(sketch, tl, thumbnailPath);
    return {
      videoPath,
      thumbnailPath,
      durationSec: tl.duration,
      voiced: lines.some(Boolean),
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function rasterize(svg: string, width = RENDER_WIDTH): Buffer {
  return new Resvg(svg, { fitTo: { mode: "width", value: width } })
    .render()
    .asPng();
}

async function writeThumbnail(sketch: CartoonSketch, tl: Timeline, file: string) {
  // First panel, once the characters have landed and the line is fully typed.
  const first = tl.segments.find((s) => s.kind === "panel");
  const t =
    first && first.kind === "panel"
      ? first.start + Math.min(first.duration - 0.1, Math.max(1.2, first.talkSec * 0.85 + 0.2))
      : 0;
  await fs.writeFile(file, rasterize(renderFrameSvg(sketch, tl, t), 540));
}

type Line = { file: string; durationSec: number } | null;

async function synthesizeLines(sketch: CartoonSketch, workDir: string): Promise<Line[]> {
  if (!env.ELEVENLABS_API_KEY) return sketch.panels.map(() => null);
  const voiceOf = new Map(sketch.cast.map((c) => [c.id, c.voice]));
  return Promise.all(
    sketch.panels.map(async (p, i): Promise<Line> => {
      if (!p.line) return null;
      try {
        const file = await synthesizeVoiceover({
          script: p.line,
          outDir: workDir,
          voiceId: VOICE_IDS[voiceOf.get(p.speaker) ?? "mid"],
          fileName: `line_${i}.mp3`,
        });
        if (!file) return null;
        const durationSec = await mediaDuration(file);
        return durationSec ? { file, durationSec } : null;
      } catch {
        return null; // this line falls back to babble
      }
    }),
  );
}

/**
 * Builds the full soundtrack in one ffmpeg call: every clip is an input,
 * delayed to its start time, then mixed. Synthesized sounds come from
 * `aevalsrc`, so there are no audio assets to ship.
 */
async function mixAudio(
  sketch: CartoonSketch,
  tl: Timeline,
  lines: Line[],
  out: string,
): Promise<void> {
  const voiceOf = new Map(sketch.cast.map((c) => [c.id, c.voice]));
  const inputs: string[] = [];
  const delays: number[] = [];

  const add = (input: string[], atSec: number) => {
    inputs.push(...input);
    delays.push(Math.max(0, Math.round(atSec * 1000)));
  };

  // silent bed so the mix always spans the whole video
  add(["-f", "lavfi", "-i", `anullsrc=r=44100:cl=mono:d=${tl.duration.toFixed(2)}`], 0);
  add(["-f", "lavfi", "-i", aeval(WHOOSH, 0.9)], 0.1);

  for (const seg of tl.segments) {
    if (seg.kind === "end") add(["-f", "lavfi", "-i", aeval(TADA, 1.2)], seg.start + 0.1);
    if (seg.kind !== "panel") continue;
    const panel = sketch.panels[seg.index];
    const line = lines[seg.index];
    if (line) {
      add(["-i", line.file], seg.start + 0.1);
    } else if (panel.line && seg.talkSec > 0) {
      const hz = BABBLE_HZ[voiceOf.get(panel.speaker) ?? "mid"];
      add(["-f", "lavfi", "-i", aeval(babble(hz), seg.talkSec)], seg.start + 0.05);
    }
    if (panel.sfx) add(["-f", "lavfi", "-i", aeval(BOING, 0.6)], seg.start + 0.35);
  }

  const n = delays.length;
  const chains = delays
    .map((d, i) => `[${i}:a]aformat=sample_rates=44100:channel_layouts=mono,adelay=${d}:all=1[a${i}]`)
    .join(";");
  const mixIn = delays.map((_, i) => `[a${i}]`).join("");
  const filter = `${chains};${mixIn}amix=inputs=${n}:duration=first:normalize=0,alimiter=limit=0.9[out]`;

  await runFfmpeg([
    "-y",
    ...inputs,
    "-filter_complex", filter,
    "-map", "[out]",
    "-t", tl.duration.toFixed(2),
    out,
  ]);
}

function aeval(expr: string, d: number): string {
  return `aevalsrc='${expr}':s=44100:d=${d.toFixed(2)}`;
}

/** Syllable-gated tone with a wobbling pitch — reads as cartoon gibberish. */
function babble(hz: number): string {
  const f = `${hz}*(1+0.18*sin(2*PI*2.7*t)+0.08*sin(2*PI*6.1*t))`;
  return `0.22*(sin(2*PI*${f}*t)+0.35*sin(4*PI*${f}*t))*pow(sin(PI*9*t),2)`;
}

const BOING = "0.45*sin(2*PI*(120+220*exp(-5*t))*t*(1+0.25*sin(2*PI*14*t)))*exp(-4*t)";
const WHOOSH = "0.18*(random(0)*2-1)*sin(PI*t/0.9)";
const TADA =
  "0.16*(sin(2*PI*523*t)+sin(2*PI*659*t)*gte(t,0.12)+sin(2*PI*784*t)*gte(t,0.24))*exp(-2.2*t)";

