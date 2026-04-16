import path from "node:path";
import { promises as fs } from "node:fs";
import type { AdScript, ProductFacts, SceneBreakdown } from "./types";
import { renderSlideshow } from "./ffmpeg-renderer";

/**
 * Tries FFmpeg first. If ffmpeg isn't installed (common in serverless dev
 * environments), returns null URLs and the dashboard renders the script +
 * scene plan instead. Phase 2 swaps this for a dedicated render worker
 * with ElevenLabs TTS.
 */
export async function renderVideo(args: {
  adId: string;
  product: ProductFacts;
  script: AdScript;
  breakdown: SceneBreakdown;
}): Promise<{
  voiceoverUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
}> {
  const publicDir = path.join(process.cwd(), "public", "renders", args.adId);
  await fs.mkdir(publicDir, { recursive: true });

  const res = await renderSlideshow({
    product: args.product,
    breakdown: args.breakdown,
    outDir: publicDir,
  });

  const base = `/renders/${args.adId}`;
  return {
    voiceoverUrl: null,
    videoUrl: res.videoPath ? `${base}/ad.mp4` : null,
    thumbnailUrl: res.thumbnailPath
      ? `${base}/ad.jpg`
      : args.product.images[0] ?? null,
  };
}
