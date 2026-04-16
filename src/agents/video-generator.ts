import path from "node:path";
import { promises as fs } from "node:fs";
import type { AdScript, ProductFacts, SceneBreakdown } from "./types";
import { renderSlideshow } from "./ffmpeg-renderer";
import { synthesizeVoiceover } from "./voiceover";

/**
 * Full video generation: voiceover (ElevenLabs) + slideshow (FFmpeg).
 *
 * Gracefully degrades in three steps:
 *   1. No ELEVENLABS_API_KEY → silent video with burned-in subtitles.
 *   2. No ffmpeg on PATH → script/scenes only, dashboard shows preview.
 *   3. Both available → full MP4 + MP3 saved under /public/renders/<adId>/.
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

  const voiceoverPath = await synthesizeVoiceover({
    script: args.script.fullScript,
    outDir: publicDir,
  }).catch(() => null);

  const res = await renderSlideshow({
    product: args.product,
    breakdown: args.breakdown,
    voiceoverPath: voiceoverPath ?? undefined,
    outDir: publicDir,
  });

  const base = `/renders/${args.adId}`;
  return {
    voiceoverUrl: voiceoverPath ? `${base}/voiceover.mp3` : null,
    videoUrl: res.videoPath ? `${base}/ad.mp4` : null,
    thumbnailUrl: res.thumbnailPath
      ? `${base}/ad.jpg`
      : args.product.images[0] ?? null,
  };
}
