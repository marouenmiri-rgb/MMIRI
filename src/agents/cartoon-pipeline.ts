import { promises as fs } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { renderCartoon } from "@/cartoon/renderer";
import { studyVideo } from "@/cartoon/reference";
import { studyLink, type LinkStudy } from "@/cartoon/link";
import type { CartoonSketch, CartoonStyle, InspiredBy, ReferenceMode } from "@/cartoon/types";
import { writeCartoon, type CartoonReference } from "./cartoonist";
import { loadBrandVoice } from "./orchestrator";
import { scrapeProduct } from "./scraper";
import type { AdScript, ProductFacts } from "./types";

/** What a CARTOON-format Ad stores in `scenesJson`. */
export type CartoonScenes = {
  style: CartoonStyle;
  cartoon: CartoonSketch;
  inspiredBy?: InspiredBy;
};

/** A shared script (text), uploaded video (temp file path) or video link. */
export type ReferenceInput =
  | { kind: "script"; mode: ReferenceMode; text: string }
  | { kind: "video"; mode: ReferenceMode; videoPath: string; name?: string }
  | { kind: "link"; mode: ReferenceMode; url: string };

/**
 * Topic (+ optional product URL) → funny animated cartoon MP4.
 *
 * Reuses the Ad row and its status lifecycle so cartoons show up on the
 * dashboard, ship through the same Ship panel / scheduler / tracking links,
 * and count against the same plan quota as product ads:
 *
 *   SCRAPING (studying a product and/or shared video) → WRITING →
 *   DIRECTING → RENDERING → READY
 *
 * An uploaded reference video is deleted as soon as it has been studied.
 */
export async function runCartoonPipeline(args: {
  adId: string;
  topic: string;
  style: CartoonStyle;
  productUrl?: string;
  userId?: string;
  reference?: ReferenceInput;
}): Promise<void> {
  const { adId, topic, style, productUrl, userId } = args;
  const brandVoice = userId ? await loadBrandVoice(userId) : null;

  let reference: CartoonReference | null = null;
  let inspiredBy: InspiredBy | undefined;
  let product: ProductFacts | null = null;
  if (productUrl || args.reference?.kind === "video" || args.reference?.kind === "link") {
    await setStatus(adId, "SCRAPING");
  }
  if (args.reference?.kind === "video") {
    const { videoPath, mode, name } = args.reference;
    try {
      const study = await studyVideo(videoPath);
      reference = { mode, kind: "video", text: study.transcript, frames: study.frames, durationSec: study.durationSec };
      inspiredBy = {
        kind: "video",
        mode,
        name,
        excerpt: study.transcript?.slice(0, 280) ?? `${study.frames.length} frames studied (no transcript)`,
      };
    } finally {
      await fs.rm(videoPath, { force: true }).catch(() => {});
    }
  } else if (args.reference?.kind === "link") {
    const { url, mode } = args.reference;
    const link = await studyLink(url);
    reference = {
      mode,
      kind: link.depth === "full" ? "video" : "link-preview",
      text: link.study.transcript,
      details: linkDetails(link),
      frames: link.study.frames,
      durationSec: link.study.durationSec,
    };
    inspiredBy = {
      kind: "link",
      mode,
      url,
      depth: link.depth,
      name: [link.platform, link.author].filter(Boolean).join(" · "),
      excerpt: (link.title ?? link.description ?? link.study.transcript ?? url).slice(0, 280),
    };
  } else if (args.reference?.kind === "script") {
    const { text, mode } = args.reference;
    reference = { mode, kind: "script", text };
    inspiredBy = { kind: "script", mode, excerpt: text.slice(0, 280) };
  }
  if (productUrl) product = await scrapeProduct(productUrl);

  await setStatus(adId, "WRITING");
  const sketch = await writeCartoon({ topic, style, product, brandVoice, reference });

  // "Directing" = the sketch is locked and the storyboard is visible in
  // the UI while the render spins up.
  const scenes: CartoonScenes = { style, cartoon: sketch, ...(inspiredBy ? { inspiredBy } : {}) };
  await db.ad.update({
    where: { id: adId },
    data: {
      status: "DIRECTING",
      productTitle: sketch.title,
      scriptJson: sketchToScript(sketch) as object,
      scenesJson: scenes as object,
    },
  });

  await setStatus(adId, "RENDERING");
  const outDir = path.join(process.cwd(), "public", "renders", adId);
  const media = await renderCartoon({ sketch, outDir });

  const base = `/renders/${adId}`;
  await db.ad.update({
    where: { id: adId },
    data: {
      status: "READY",
      videoUrl: media.videoPath ? `${base}/cartoon.mp4` : null,
      thumbnailUrl: media.thumbnailPath ? `${base}/cartoon.png` : null,
      error: media.videoPath ? null : "ffmpeg not available — storyboard only",
    },
  });
}

/**
 * Map the sketch onto the AdScript shape so captions, variants and
 * autopilot's caption fallback work on cartoons unchanged.
 */
export function sketchToScript(sketch: CartoonSketch): AdScript {
  const names = new Map(sketch.cast.map((c) => [c.id, c.name]));
  const spoken = sketch.panels.filter((p) => p.line);
  return {
    hook: spoken[0]?.line ?? sketch.title,
    problem: sketch.logline,
    solution: spoken[spoken.length - 1]?.line ?? sketch.logline,
    cta: sketch.cta,
    fullScript: spoken.map((p) => `${names.get(p.speaker) ?? "?"}: ${p.line}`).join("\n"),
  };
}

function linkDetails(link: LinkStudy): string {
  return [
    `Platform: ${link.platform}`,
    link.author ? `Creator: ${link.author}` : null,
    link.title ? `Title / caption: ${link.title}` : null,
    link.description && link.description !== link.title ? `Description: ${link.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function setStatus(adId: string, status: string) {
  await db.ad.update({ where: { id: adId }, data: { status } });
}
