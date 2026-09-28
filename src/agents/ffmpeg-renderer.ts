import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ProductFacts, SceneBreakdown } from "./types";
import { safeFetch } from "@/lib/safe-fetch";

/**
 * Best-effort FFmpeg slideshow renderer for the MVP.
 *
 * Produces a vertical 1080×1920 MP4 from the director's scenes: one image
 * per scene, held for `durationSec`, with its line of dialogue burned in as
 * a subtitle. Voiceover is muxed in if provided.
 *
 * Returns { videoUrl: null, ... } when ffmpeg isn't available on PATH, so
 * the pipeline keeps working on machines without it (Phase 2 runs this in
 * a dedicated Fly/Railway worker with ffmpeg baked into the image).
 */
export async function renderSlideshow(args: {
  product: ProductFacts;
  breakdown: SceneBreakdown;
  voiceoverPath?: string;
  outDir?: string;
}): Promise<{ videoPath: string | null; thumbnailPath: string | null }> {
  if (!(await ffmpegAvailable())) return { videoPath: null, thumbnailPath: null };

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "adgen-render-"));
  const outDir = args.outDir ?? workDir;
  await fs.mkdir(outDir, { recursive: true });

  const scenes = args.breakdown.scenes;
  const frames: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const idx = parseImageRef(scenes[i].imageRef);
    const url = args.product.images[idx ?? 0];
    if (!url) continue;
    const file = path.join(workDir, `scene_${i}.jpg`);
    const ok = await downloadImage(url, file);
    if (ok) frames.push(file);
  }
  if (frames.length === 0) return { videoPath: null, thumbnailPath: null };

  const durations = frames.map((_, i) =>
    Math.max(1, Math.round(scenes[i]?.durationSec ?? 3)),
  );
  const total = durations.reduce((a, b) => a + b, 0);

  const assPath = path.join(workDir, "subs.ass");
  await fs.writeFile(assPath, toAss(scenes, durations));

  const videoPath = path.join(outDir, "ad.mp4");
  const thumbnailPath = path.join(outDir, "ad.jpg");

  // Each scene becomes its own clip so it can carry its own motion. A still
  // image held for four seconds reads as a slideshow; the same image drifting
  // slowly reads as a shot. That difference is what lets a 60-second cut work
  // off six photographs.
  const clips: string[] = [];
  for (let i = 0; i < frames.length; i++) {
    const clip = path.join(workDir, `clip_${i}.mp4`);
    const dur = durations[i]!;
    const fx = scenes[i]?.fx ?? "kenburns";
    await run("ffmpeg", [
      "-y",
      "-loop",
      "1",
      "-t",
      String(dur),
      "-i",
      frames[i]!,
      "-vf",
      sceneFilter(fx, dur, i),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-r",
      String(FPS),
      clip,
    ]);
    clips.push(clip);
  }

  // Concat the clips, then burn captions over the result — one subtitle file
  // timed against the whole video rather than per clip.
  const listPath = path.join(workDir, "list.txt");
  await fs.writeFile(listPath, clips.map((c) => `file '${c}'`).join("\n"));

  const audioIn = args.voiceoverPath ? ["-i", args.voiceoverPath] : [];
  const audioMap = args.voiceoverPath
    ? ["-map", "0:v", "-map", "1:a", "-shortest", "-c:a", "aac", "-b:a", "160k"]
    : ["-an"];

  await run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    ...audioIn,
    "-t",
    String(total),
    "-vf",
    `subtitles='${escapeFilterPath(assPath)}'`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    "-movflags",
    "+faststart",
    ...audioMap,
    videoPath,
  ]);

  // Thumbnail from the first frame of the rendered video.
  await run("ffmpeg", [
    "-y",
    "-i",
    videoPath,
    "-vframes",
    "1",
    "-q:v",
    "2",
    thumbnailPath,
  ]);

  return { videoPath, thumbnailPath };
}

const FPS = 25;

/** How much larger than the frame the source is scaled, leaving room to pan. */
const PAN_OVERSCAN = 1.22;

/**
 * Fills the 9:16 frame, then drifts across it.
 *
 * The obvious way to do this is ffmpeg's `zoompan`, and it is unusably slow:
 * measured here, one four-second clip took 94 seconds even with the source
 * already at output size, which for a fourteen-scene cut is around twenty
 * minutes a video. `crop` with time-based x/y is the same effect for 1.3
 * seconds — roughly seventy times faster — because nothing is rescaled per
 * frame.
 *
 * It is a pan rather than a push, since `crop` only accepts time expressions
 * for position, not for width and height. A slow drift reads the same way on
 * a feed, and it is what stops a held photograph looking like a slideshow.
 */
function sceneFilter(
  fx: "kenburns" | "cut" | "fade" | undefined,
  durationSec: number,
  index: number,
): string {
  const fill = [
    "scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    `fps=${FPS}`,
    "setsar=1",
  ];

  if (fx === "cut") return fill.join(",");

  if (fx === "fade") {
    const out = Math.max(0, durationSec - 0.4).toFixed(2);
    return [
      ...fill,
      `fade=t=in:st=0:d=0.3`,
      `fade=t=out:st=${out}:d=0.4`,
    ].join(",");
  }

  // Overscan, then walk a 1080x1920 window across it over the scene's length.
  const w = Math.round(1080 * PAN_OVERSCAN);
  const h = Math.round(1920 * PAN_OVERSCAN);
  const d = durationSec.toFixed(2);

  // Four directions, cycled, so consecutive shots never drift the same way.
  const moves = [
    { x: `(in_w-out_w)*(t/${d})`, y: `(in_h-out_h)*0.5` },
    { x: `(in_w-out_w)*(1-t/${d})`, y: `(in_h-out_h)*0.5` },
    { x: `(in_w-out_w)*0.5`, y: `(in_h-out_h)*(t/${d})` },
    { x: `(in_w-out_w)*0.5`, y: `(in_h-out_h)*(1-t/${d})` },
  ];
  const move = moves[index % moves.length]!;

  return [
    `scale=${w}:${h}:force_original_aspect_ratio=increase`,
    `crop=${w}:${h}`,
    `fps=${FPS}`,
    `crop=1080:1920:x='${move.x}':y='${move.y}'`,
    "setsar=1",
  ].join(",");
}

function parseImageRef(ref: string): number | null {
  const m = ref.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Captions as ASS rather than SRT.
 *
 * SRT carries no canvas size, so libass renders it against its own small
 * default and then scales up to 1080x1920 — which turned a FontSize of 36
 * into roughly 240px of text sitting across the middle of the frame. ASS lets
 * us state PlayResX/PlayResY explicitly, so a point size means what it says.
 *
 * The style is the one short-form captions actually use: bold, lower third,
 * outline plus shadow instead of an opaque box, and wide side margins so long
 * lines wrap instead of running to the edges.
 */
export function toAss(
  scenes: SceneBreakdown["scenes"],
  durations: number[],
): string {
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    // White fill, black outline + soft shadow, bold, bottom-centre, lifted
    // clear of the platform UI that overlays the bottom of a 9:16 feed.
    "Style: Caption,DejaVu Sans,64,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,4,3,2,90,90,320,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");

  let t = 0;
  const events = scenes.map((sc, i) => {
    const start = t;
    const end = t + (durations[i] ?? Math.max(1, Math.round(sc.durationSec)));
    t = end;
    return `Dialogue: 0,${ts(start)},${ts(end)},Caption,,0,0,0,,${assText(sc.text)}`;
  });

  return `${header}\n${events.join("\n")}\n`;
}

/** ASS timestamps are H:MM:SS.cc with a single leading hour digit. */
function ts(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${pad(m)}:${pad(s)}.00`;
}

/** Commas and braces are syntax in an ASS event line; newlines become \\N. */
function assText(text: string): string {
  return text
    .replace(/\r?\n/g, "\\N")
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .trim();
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function escapeFilterPath(p: string): string {
  // subtitles filter needs colons/backslashes escaped.
  return p.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
    // The page chose these URLs, so they get the same check as the page did.
    const res = await safeFetch(url, { maxBytes: 12 * 1024 * 1024 });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(dest, buf);
    return true;
  } catch {
    return false;
  }
}

async function ffmpegAvailable(): Promise<boolean> {
  try {
    await run("ffmpeg", ["-version"], { silent: true });
    return true;
  } catch {
    return false;
  }
}

function run(
  cmd: string,
  args: string[],
  opts: { silent?: boolean } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: opts.silent ? "ignore" : ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-400)}`));
    });
  });
}
