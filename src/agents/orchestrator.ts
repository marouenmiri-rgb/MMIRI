import { db } from "@/lib/db";
import { scrapeProduct } from "./scraper";
import { writeAdScript } from "./copywriter";
import { directScenes } from "./creative-director";
import { renderVideo } from "./video-generator";
import type { BrandVoice } from "./brand-voice";
import type { GeneratedAd } from "./types";

/**
 * Drives the full product-URL → generated-ad pipeline. Each step updates the
 * Ad row so the dashboard can show live progress. Errors are persisted so they
 * surface in the UI instead of silently failing.
 */
export async function runAdPipeline(args: {
  adId: string;
  productUrl: string;
  hookHint?: string;
  userId?: string;
}): Promise<GeneratedAd> {
  const { adId, productUrl, hookHint, userId } = args;

  // Brand voice (if the user has one) gets pulled once and threaded through
  // every text-producing agent in this pipeline run.
  let brandVoice: BrandVoice | null = null;
  if (userId) {
    const row = await db.brandVoice.findUnique({ where: { userId } });
    if (row && row.tone && row.audience) {
      brandVoice = {
        name: row.name ?? undefined,
        tone: row.tone,
        audience: row.audience,
        dos: (row.dosJson as string[] | null) ?? [],
        donts: (row.dontsJson as string[] | null) ?? [],
        examples:
          (row.examplesJson as { context: string; copy: string }[] | null) ??
          [],
      };
    }
  }

  await db.ad.update({ where: { id: adId }, data: { status: "SCRAPING" } });
  const product = await scrapeProduct(productUrl);
  await db.ad.update({
    where: { id: adId },
    data: { productTitle: product.title },
  });

  await db.ad.update({ where: { id: adId }, data: { status: "WRITING" } });
  const script = await writeAdScript(product, { hookHint, brandVoice });
  await db.ad.update({
    where: { id: adId },
    data: { scriptJson: script as object },
  });

  await db.ad.update({ where: { id: adId }, data: { status: "DIRECTING" } });
  const breakdown = await directScenes(product, script);
  await db.ad.update({
    where: { id: adId },
    data: { scenesJson: breakdown as object },
  });

  await db.ad.update({ where: { id: adId }, data: { status: "RENDERING" } });
  const media = await renderVideo({
    adId,
    product,
    script,
    breakdown,
  });

  await db.ad.update({
    where: { id: adId },
    data: {
      status: "READY",
      voiceoverUrl: media.voiceoverUrl,
      videoUrl: media.videoUrl,
      thumbnailUrl: media.thumbnailUrl ?? product.images[0] ?? null,
    },
  });

  return {
    product,
    script,
    breakdown,
    voiceoverUrl: media.voiceoverUrl ?? undefined,
    videoUrl: media.videoUrl ?? undefined,
    thumbnailUrl: media.thumbnailUrl ?? product.images[0],
  };
}
