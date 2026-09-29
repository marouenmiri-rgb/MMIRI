import { promises as fs } from "node:fs";
import path from "node:path";
import { safeFetch } from "@/lib/safe-fetch";

/**
 * Stock b-roll from Pexels.
 *
 * Product photographs are the one thing this pipeline always has, and the one
 * thing that cannot show the product in use. A few seconds of real footage cut
 * between stills — steam rising, hands pouring, a kitchen in morning light —
 * moves the result further toward looking filmed than any amount of grading.
 *
 * Gated on PEXELS_API_KEY. Without it every function here returns nothing and
 * the pipeline renders exactly as it did before, the same way the voiceover
 * and email integrations degrade.
 */

/**
 * Read per call, not once at module load. Imports are hoisted above any code
 * that sets environment variables, so a module-level read silently keeps the
 * default and the override appears to do nothing.
 */
function apiBase(): string {
  return process.env.PEXELS_API_BASE ?? "https://api.pexels.com";
}

export type BrollClip = {
  /** Local path of the downloaded file. */
  filePath: string;
  /** Seconds of usable footage. */
  durationSec: number;
  /** For the attribution line Pexels asks for but does not require. */
  credit: { photographer: string; url: string };
};

type PexelsVideoFile = {
  link: string;
  width: number | null;
  height: number | null;
  file_type: string | null;
  quality: string | null;
};

type PexelsVideo = {
  id: number;
  duration: number;
  user?: { name?: string; url?: string };
  url?: string;
  video_files?: PexelsVideoFile[];
};

export function hasBroll(): boolean {
  return Boolean(process.env.PEXELS_API_KEY);
}

/**
 * Finds one portrait clip for a query and saves it locally.
 *
 * Returns null for every failure — no key, nothing found, nothing portrait,
 * a download that fails. A missing b-roll shot must never fail a render; the
 * scene falls back to a product still instead.
 */
export async function fetchBrollClip(
  query: string,
  outDir: string,
  opts: { minSeconds?: number; seed?: number } = {},
): Promise<BrollClip | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  const minSeconds = opts.minSeconds ?? 3;

  try {
    const url =
      `${apiBase()}/videos/search` +
      `?query=${encodeURIComponent(query)}` +
      `&orientation=portrait&size=medium&per_page=15`;

    const res = await safeFetch(url, {
      headers: { Authorization: key },
      timeoutMs: 12_000,
      maxBytes: 2 * 1024 * 1024,
    });
    if (!res.ok) return null;

    const body = (await res.json()) as { videos?: PexelsVideo[] };
    const candidates = (body.videos ?? []).filter(
      (v) => (v.duration ?? 0) >= minSeconds && (v.video_files?.length ?? 0) > 0,
    );
    if (candidates.length === 0) return null;

    // Rotate through results so several scenes querying the same thing do not
    // all come back with the identical clip.
    const video = candidates[(opts.seed ?? 0) % candidates.length]!;
    const file = pickPortraitFile(video.video_files ?? []);
    if (!file) return null;

    const dest = path.join(outDir, `broll_${video.id}.mp4`);
    const dl = await safeFetch(file.link, {
      timeoutMs: 45_000,
      maxBytes: 60 * 1024 * 1024,
    });
    if (!dl.ok) return null;
    await fs.writeFile(dest, Buffer.from(await dl.arrayBuffer()));

    return {
      filePath: dest,
      durationSec: video.duration,
      credit: {
        photographer: video.user?.name ?? "Pexels",
        url: video.url ?? video.user?.url ?? "https://www.pexels.com",
      },
    };
  } catch {
    return null;
  }
}

/**
 * Picks the most useful rendition.
 *
 * Prefers genuinely portrait files close to 1080 wide: anything smaller has to
 * be upscaled beside sharp product photography and looks it, and 4K costs a
 * long download for footage that is about to be cropped to 1080x1920 anyway.
 */
export function pickPortraitFile(files: PexelsVideoFile[]): PexelsVideoFile | null {
  const usable = files.filter(
    (f) =>
      f.link &&
      (f.file_type ?? "video/mp4").includes("mp4") &&
      (f.width ?? 0) > 0 &&
      (f.height ?? 0) > 0 &&
      (f.height ?? 0) > (f.width ?? 0),
  );
  if (usable.length === 0) return null;

  return usable.sort((a, b) => score(a) - score(b))[0]!;
}

/** Distance from the ideal width; below 720 is penalised hard. */
function score(f: PexelsVideoFile): number {
  const w = f.width ?? 0;
  const penalty = w < 720 ? 5000 : 0;
  return Math.abs(w - 1080) + penalty;
}
