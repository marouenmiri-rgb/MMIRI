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
  /** Optional music bed. Mixed under the voiceover and faded at both ends. */
  musicPath?: string;
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

  // Audio. Silence is the loudest tell that something was generated, so a
  // music bed matters more than any single visual change — but it must sit
  // under the voice, not compete with it.
  const audio = buildAudio(args.voiceoverPath, args.musicPath, total);

  await run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    ...audio.inputs,
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
    ...audio.args,
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

/**
 * Assembles the audio graph.
 *
 * With both a voiceover and music, the music is ducked by a sidechain
 * compressor keyed off the voice — the bed drops while someone is speaking
 * and comes back in the gaps, which is what makes a mix sound produced rather
 * than layered. With only music, it simply sits at a comfortable level. With
 * neither, the video stays silent rather than carrying an empty track.
 */
export function buildAudio(
  voiceoverPath: string | undefined,
  musicPath: string | undefined,
  totalSeconds: number,
): { inputs: string[]; args: string[] } {
  const fadeOut = Math.max(0, totalSeconds - 1.5).toFixed(2);

  if (voiceoverPath && musicPath) {
    return {
      inputs: ["-i", voiceoverPath, "-stream_loop", "-1", "-i", musicPath],
      args: [
        "-filter_complex",
        [
          // The voice is needed twice — once as the sidechain key, once in the
          // mix — and a filtergraph label can only be consumed once, so it is
          // split explicitly.
          // apad keeps the voice track alive to the end of the edit. Without
          // it, a narration shorter than the visuals ends the mix early and
          // the video is cut off with it — the whole edit truncated to the
          // length of the voiceover. The -t below sets the real length.
          "[1:a]volume=1.0,aresample=async=1,apad,asplit=2[vo][key]",
          `[2:a]volume=0.16,afade=t=in:st=0:d=1.2,afade=t=out:st=${fadeOut}:d=1.5[bed]`,
          // Key the bed off the voice so words always sit on top.
          "[bed][key]sidechaincompress=threshold=0.05:ratio=8:attack=8:release=320[duck]",
          // normalize=0: amix otherwise divides every input by the number of
          // inputs, which quietly halves both the voice and the bed and makes
          // the levels set above mean nothing.
          "[vo][duck]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[mix]",
          "[mix]alimiter=limit=0.95[aout]",
        ].join(";"),
        "-map",
        "0:v",
        "-map",
        "[aout]",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
      ],
    };
  }

  if (musicPath) {
    return {
      inputs: ["-stream_loop", "-1", "-i", musicPath],
      args: [
        "-filter_complex",
        `[1:a]volume=0.5,afade=t=in:st=0:d=1.2,afade=t=out:st=${fadeOut}:d=1.5,alimiter=limit=0.95[aout]`,
        "-map",
        "0:v",
        "-map",
        "[aout]",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
      ],
    };
  }

  if (voiceoverPath) {
    return {
      inputs: ["-i", voiceoverPath],
      // No -shortest: a voiceover shorter than the edit must not truncate it.
      args: [
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-af",
        "apad",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
      ],
    };
  }

  return { inputs: [], args: ["-an"] };
}

const FPS = 25;

/**
 * The finishing pass every scene gets.
 *
 * Product photography is lit flat and shot on white, which is correct for a
 * catalogue and reads as a catalogue on a feed. A little contrast, a little
 * saturation, a vignette to hold the eye centre-frame and a trace of grain to
 * break up the clean gradients is what separates "photo on screen" from
 * "shot". It is folded into each scene's own render, so it costs nothing
 * beyond the pass already happening.
 */
const GRADE = [
  "eq=contrast=1.07:saturation=1.12:gamma=0.98",
  "curves=preset=medium_contrast",
  "vignette=PI/4.6",
  "noise=alls=5:allf=t",
].join(",");

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

  if (fx === "cut") return [...fill, GRADE].join(",");

  if (fx === "fade") {
    const out = Math.max(0, durationSec - 0.4).toFixed(2);
    return [
      ...fill,
      GRADE,
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
    GRADE,
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
    // Primary is the colour a word takes once it lands; Secondary is how it
    // waits beforehand. Karaoke timing moves words between the two, which is
    // the caption style short-form actually uses — a static block of text is
    // the tell that something was made from a template.
    "Style: Caption,DejaVu Sans,66,&H00FFFFFF,&H00B9B9B9,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,5,3,2,90,90,330,1",
    // The end card is its own style: larger, centred, no lower-third margin.
    "Style: Card,DejaVu Sans,96,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,2,0,1,0,0,5,120,120,0,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ].join("\n");

  let t = 0;
  const events: string[] = [];

  scenes.forEach((sc, i) => {
    const start = t;
    const dur = durations[i] ?? Math.max(1, Math.round(sc.durationSec));
    const end = t + dur;
    t = end;

    // A short rise as the line arrives, so it does not simply appear.
    const intro = "{\\fad(160,120)}";
    events.push(
      `Dialogue: 0,${ts(start)},${ts(end)},Caption,,0,0,0,,${intro}${karaoke(sc.text, dur)}`,
    );
  });

  return `${header}\n${events.join("\n")}\n`;
}

/**
 * Splits a line into ASS karaoke spans so words land one at a time.
 *
 * Timing is spread evenly across the scene rather than matched to speech:
 * without a forced alignment of the voiceover there is nothing to match to,
 * and an even cadence reads as deliberate. Longer words hold slightly longer,
 * which keeps it from sounding metronomic.
 */
function karaoke(text: string, durationSec: number): string {
  const words = assText(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";

  // Weight by length so "extraordinary" is not given the same beat as "a".
  const weights = words.map((w) => Math.max(3, w.replace(/\W/g, "").length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Hold the last word a beat longer than its share, so the line does not
  // finish before the shot does.
  const usable = Math.max(0, durationSec * 100 - 20);

  let spent = 0;
  return words
    .map((w, i) => {
      const last = i === words.length - 1;
      const cs = last
        ? Math.max(10, Math.round(usable - spent))
        : Math.max(8, Math.round((weights[i]! / totalWeight) * usable));
      spent += cs;
      return `{\\k${cs}}${w}`;
    })
    .join(" ");
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
