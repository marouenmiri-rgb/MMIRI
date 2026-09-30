import { spawn } from "node:child_process";
import { createWriteStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ffmpegBin, runFfmpeg } from "@/lib/ffmpeg";
import { scrapeProduct } from "@/agents/scraper";
import type { ImageInput } from "@/lib/claude";
import { MAX_REFERENCE_CHARS, MAX_VIDEO_BYTES, studyVideo, type VideoStudy } from "./reference";

/**
 * Read a shared video LINK (TikTok, YouTube, Instagram Reels, X, Vimeo, or a
 * direct .mp4) so the Cartoonist can make something similar.
 *
 * Best effort, in order:
 *   1. yt-dlp (if installed): download the video (+ subtitles when the
 *      platform has them) and study it like an upload — "full" depth.
 *   2. Direct video URL: download it and study it — "full".
 *   3. Preview: the post's title/caption and thumbnail via oEmbed or its
 *      page's Open Graph tags — "preview" depth.
 *
 * Downloaded files live in a temp dir that is always removed.
 */

export type LinkStudy = {
  depth: "full" | "preview";
  via: "yt-dlp" | "direct" | "oembed" | "page";
  platform: string;
  title?: string;
  author?: string;
  description?: string;
  study: VideoStudy;
};

const FETCH_TIMEOUT_MS = 20_000;
const YTDLP_TIMEOUT_MS = 180_000;
const MAX_DURATION_SEC = 900;
const UA = "Mozilla/5.0 (compatible; AdGenBot/0.1; +https://adgen.ai)";

export async function studyLink(url: string): Promise<LinkStudy> {
  const platform = platformOf(url);
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "adgen-link-"));
  try {
    if (await ytDlpAvailable()) {
      try {
        return await viaYtDlp(url, platform, workDir);
      } catch {
        // extractor failed / blocked — fall through to the lighter paths
      }
    }

    const direct = await downloadIfVideo(url, workDir);
    if (direct) {
      return { depth: "full", via: "direct", platform, study: await studyVideo(direct) };
    }

    return await viaPreview(url, platform, workDir);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ------------------------------------------------------------ yt-dlp

export function ytDlpBin(): string {
  return process.env.YTDLP_PATH || "yt-dlp";
}

export async function ytDlpAvailable(): Promise<boolean> {
  try {
    await run(ytDlpBin(), ["--version"], 10_000);
    return true;
  } catch {
    return false;
  }
}

async function viaYtDlp(url: string, platform: string, dir: string): Promise<LinkStudy> {
  const ff = ffmpegBin();
  // With --ignore-errors yt-dlp can exit non-zero after a successful video
  // download (e.g. one subtitle track 404s) — judge by the file, not the code.
  const runError = await run(
    ytDlpBin(),
    [
      "--no-playlist",
      "--no-progress",
      "--quiet",
      "--no-warnings",
      "--ignore-errors", // a missing subtitle track must not fail the download
      "-f", "b[height<=720][ext=mp4]/bv*[height<=720]+ba/b[height<=720]/b",
      "--merge-output-format", "mp4",
      "--max-filesize", `${Math.floor(MAX_VIDEO_BYTES / 1024 / 1024)}M`,
      "--match-filter", `!is_live & duration <? ${MAX_DURATION_SEC}`,
      "--write-info-json",
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs", ".*-orig,en.*",
      "--sub-format", "vtt",
      ...(path.isAbsolute(ff) ? ["--ffmpeg-location", ff] : []),
      "-o", path.join(dir, "ref.%(ext)s"),
      url,
    ],
    YTDLP_TIMEOUT_MS,
  ).then(
    () => null,
    (e: unknown) => e,
  );

  const files = await fs.readdir(dir);
  const video = files.find((f) => /^ref\.(mp4|webm|mkv|mov|m4v)$/i.test(f));
  if (!video) {
    throw runError instanceof Error
      ? runError
      : new Error("yt-dlp produced no video (too long, live, or blocked)");
  }

  const info = await fs
    .readFile(path.join(dir, "ref.info.json"), "utf8")
    .then((s) => JSON.parse(s) as Record<string, unknown>)
    .catch(() => ({}) as Record<string, unknown>);

  const study = await studyVideo(path.join(dir, video));
  if (!study.transcript) {
    const vtt = files.find((f) => f.endsWith(".vtt"));
    if (vtt) {
      const text = vttToText(await fs.readFile(path.join(dir, vtt), "utf8"));
      if (text) study.transcript = text.slice(0, MAX_REFERENCE_CHARS);
    }
  }

  return {
    depth: "full",
    via: "yt-dlp",
    platform:
      platform === "Web" && str(info.extractor_key) && info.extractor_key !== "Generic"
        ? String(info.extractor_key)
        : platform,
    title: str(info.title),
    author: str(info.uploader) ?? str(info.channel),
    description: str(info.description)?.slice(0, 800),
    study,
  };
}

// ------------------------------------------------------------ direct file

/** Downloads `url` if it serves a video; returns null for anything else. */
async function downloadIfVideo(url: string, dir: string): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": UA },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("video/") || !res.body) {
    await res.body?.cancel().catch(() => {});
    return null;
  }
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_VIDEO_BYTES) {
    await res.body.cancel().catch(() => {});
    throw new Error(`That video is too large (max ${MAX_VIDEO_BYTES / 1024 / 1024} MB).`);
  }

  const file = path.join(dir, "direct.mp4");
  const out = createWriteStream(file);
  let bytes = 0;
  try {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_VIDEO_BYTES) {
        await reader.cancel().catch(() => {});
        throw new Error(`That video is too large (max ${MAX_VIDEO_BYTES / 1024 / 1024} MB).`);
      }
      if (!out.write(value)) await new Promise<void>((r) => out.once("drain", () => r()));
    }
  } finally {
    await new Promise<void>((r) => out.end(() => r()));
  }
  return file;
}

// ------------------------------------------------------------ preview

type Preview = { title?: string; author?: string; description?: string; thumbnail?: string };

const OEMBED: { test: RegExp; endpoint: (u: string) => string }[] = [
  {
    test: /(^|\.)(youtube\.com|youtu\.be)$/i,
    endpoint: (u) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`,
  },
  {
    test: /(^|\.)tiktok\.com$/i,
    endpoint: (u) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
  },
  {
    test: /(^|\.)vimeo\.com$/i,
    endpoint: (u) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`,
  },
];

async function viaPreview(url: string, platform: string, dir: string): Promise<LinkStudy> {
  const host = new URL(url).hostname;
  let preview: Preview | null = null;
  let via: LinkStudy["via"] = "oembed";

  const oembed = OEMBED.find((o) => o.test.test(host));
  if (oembed) {
    try {
      const res = await fetch(oembed.endpoint(url), {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) {
        const b = (await res.json()) as Record<string, unknown>;
        preview = { title: str(b.title), author: str(b.author_name), thumbnail: str(b.thumbnail_url) };
      }
    } catch {
      // fall back to the page's own tags
    }
  }
  if (!preview?.title && !preview?.thumbnail) {
    via = "page";
    try {
      const page = await scrapeProduct(url);
      preview = {
        title: page.title === "Untitled product" ? undefined : page.title,
        description: page.description || undefined,
        thumbnail: page.images[0],
      };
    } catch {
      preview = null;
    }
  }

  const frames: ImageInput[] = [];
  if (preview?.thumbnail) {
    const frame = await fetchAsJpeg(new URL(preview.thumbnail, url).toString(), dir);
    if (frame) frames.push(frame);
  }
  if (!preview?.title && !preview?.description && frames.length === 0) {
    throw new Error(
      `Couldn't read that ${platform} link. Save the video to your device and upload the file instead.`,
    );
  }

  return {
    depth: "preview",
    via,
    platform,
    title: preview?.title,
    author: preview?.author,
    description: preview?.description?.slice(0, 800),
    study: { frames, transcript: null, durationSec: null },
  };
}

async function fetchAsJpeg(url: string, dir: string): Promise<ImageInput | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 10 * 1024 * 1024) return null;
    const src = path.join(dir, "thumb.src");
    const out = path.join(dir, "thumb.jpg");
    await fs.writeFile(src, buf);
    // Normalize webp/heic/png thumbnails to a small JPEG Claude accepts.
    await runFfmpeg(["-y", "-i", src, "-frames:v", "1", "-vf", "scale=512:-2", "-q:v", "4", out], {
      silent: true,
    });
    return { mediaType: "image/jpeg", data: (await fs.readFile(out)).toString("base64") };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------ helpers

export function platformOf(url: string): string {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "Web";
  }
  const map: [RegExp, string][] = [
    [/(^|\.)tiktok\.com$/, "TikTok"],
    [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
    [/(^|\.)instagram\.com$/, "Instagram"],
    [/(^|\.)(x\.com|twitter\.com)$/, "X"],
    [/(^|\.)(facebook\.com|fb\.watch)$/, "Facebook"],
    [/(^|\.)vimeo\.com$/, "Vimeo"],
    [/(^|\.)snapchat\.com$/, "Snapchat"],
  ];
  return map.find(([re]) => re.test(host))?.[1] ?? "Web";
}

/**
 * Server-side fetch guard: only public http(s) URLs. Blocks localhost,
 * private/link-local IPv4 ranges and IP-literal IPv6 so a shared "video
 * link" can't be used to probe the server's own network.
 */
export function isPublicHttpUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (!host || host === "localhost" || /\.(localhost|local|internal|lan|home)$/.test(host)) return false;
  if (host.startsWith("[") || host.includes(":")) return false; // IPv6 literal
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return false;
    }
  } else if (/^\d+$/.test(host) || /^0x/i.test(host)) {
    return false; // decimal/hex IP encodings
  }
  return true;
}

/** WebVTT subtitles → plain text, dropping timing, tags and rolling repeats. */
export function vttToText(vtt: string): string {
  const lines: string[] = [];
  for (const raw of vtt.split(/\r?\n/)) {
    const line = raw
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .trim();
    if (
      !line ||
      line === "WEBVTT" ||
      /^(Kind|Language|NOTE|STYLE)\b/.test(line) ||
      /-->/.test(line) ||
      /^\d+$/.test(line)
    ) {
      continue;
    }
    if (lines[lines.length - 1] !== line) lines.push(line);
  }
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr = (stderr + d.toString()).slice(-2000);
    });
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(cmd)} exited ${code}: ${stderr.slice(-300)}`));
    });
  });
}
