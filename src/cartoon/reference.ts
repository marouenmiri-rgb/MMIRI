import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { mediaDuration, runFfmpeg } from "@/lib/ffmpeg";
import { transcribeAudio } from "@/agents/transcriber";
import type { ImageInput } from "@/lib/claude";

/**
 * What the Cartoonist gets to "watch" from a shared video: a handful of
 * evenly spaced frames (Claude reads them as images) plus the spoken
 * words when speech-to-text is configured.
 */
export type VideoStudy = {
  frames: ImageInput[];
  transcript: string | null;
  durationSec: number | null;
};

export const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
export const MAX_REFERENCE_CHARS = 8000;
const FRAME_WIDTH = 512;

export function frameCount(durationSec: number | null): number {
  if (!durationSec || durationSec <= 0) return 6;
  return Math.min(10, Math.max(4, Math.round(durationSec / 4)));
}

/** Evenly spaced sample times, skipping the very first/last instants. */
export function frameTimes(durationSec: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => ((i + 0.5) / n) * durationSec);
}

export async function studyVideo(file: string): Promise<VideoStudy> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "adgen-ref-"));
  try {
    const durationSec = await mediaDuration(file);
    const times = durationSec ? frameTimes(durationSec, frameCount(durationSec)) : [0];

    const frames: ImageInput[] = [];
    for (const [i, t] of times.entries()) {
      const out = path.join(workDir, `f${i}.jpg`);
      try {
        await runFfmpeg([
          "-y",
          "-ss", t.toFixed(2),
          "-i", file,
          "-frames:v", "1",
          "-vf", `scale=${FRAME_WIDTH}:-2`,
          "-q:v", "4",
          out,
        ], { silent: true });
        frames.push({ mediaType: "image/jpeg", data: (await fs.readFile(out)).toString("base64") });
      } catch {
        // unreadable timestamp — skip it
      }
    }
    if (frames.length === 0) {
      throw new Error("Couldn't read any frames from that video. Try an MP4, MOV or WebM file.");
    }

    let transcript: string | null = null;
    const audio = path.join(workDir, "audio.mp3");
    try {
      await runFfmpeg(
        ["-y", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audio],
        { silent: true },
      );
      transcript = await transcribeAudio(audio);
    } catch {
      // no audio track
    }

    return {
      frames,
      transcript: transcript ? transcript.slice(0, MAX_REFERENCE_CHARS) : null,
      durationSec,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
