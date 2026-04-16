import type { AdScript, SceneBreakdown } from "./types";

/**
 * MVP stub. Phase 2 wires this to:
 *   1. ElevenLabs TTS → voiceover.mp3
 *   2. FFmpeg worker → slideshow + Ken Burns + subtitles + voiceover → MP4
 * For now, returns null URLs so the dashboard renders the script/scenes preview
 * and the pipeline is end-to-end exercisable without media infra.
 */
export async function renderVideo(_input: {
  script: AdScript;
  breakdown: SceneBreakdown;
  productTitle: string;
}): Promise<{ voiceoverUrl: string | null; videoUrl: string | null; thumbnailUrl: string | null }> {
  return { voiceoverUrl: null, videoUrl: null, thumbnailUrl: null };
}
