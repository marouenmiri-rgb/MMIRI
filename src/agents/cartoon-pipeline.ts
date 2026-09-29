import path from "node:path";
import { db } from "@/lib/db";
import { renderCartoon } from "@/cartoon/renderer";
import type { CartoonSketch, CartoonStyle } from "@/cartoon/types";
import { writeCartoon } from "./cartoonist";
import { loadBrandVoice } from "./orchestrator";
import { scrapeProduct } from "./scraper";
import type { AdScript, ProductFacts } from "./types";

/** What a CARTOON-format Ad stores in `scenesJson`. */
export type CartoonScenes = { style: CartoonStyle; cartoon: CartoonSketch };

/**
 * Topic (+ optional product URL) → funny animated cartoon MP4.
 *
 * Reuses the Ad row and its status lifecycle so cartoons show up on the
 * dashboard, ship through the same Ship panel / scheduler / tracking links,
 * and count against the same plan quota as product ads:
 *
 *   SCRAPING (only with a product) → WRITING → DIRECTING → RENDERING → READY
 */
export async function runCartoonPipeline(args: {
  adId: string;
  topic: string;
  style: CartoonStyle;
  productUrl?: string;
  userId?: string;
}): Promise<void> {
  const { adId, topic, style, productUrl, userId } = args;
  const brandVoice = userId ? await loadBrandVoice(userId) : null;

  let product: ProductFacts | null = null;
  if (productUrl) {
    await setStatus(adId, "SCRAPING");
    product = await scrapeProduct(productUrl);
  }

  await setStatus(adId, "WRITING");
  const sketch = await writeCartoon({ topic, style, product, brandVoice });

  // "Directing" = the sketch is locked and the storyboard is visible in
  // the UI while the render spins up.
  const scenes: CartoonScenes = { style, cartoon: sketch };
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

async function setStatus(adId: string, status: string) {
  await db.ad.update({ where: { id: adId }, data: { status } });
}
