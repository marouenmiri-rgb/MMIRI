import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";

/**
 * ElevenLabs TTS.
 *
 * Gated on ELEVENLABS_API_KEY. Returns null when unset so the renderer
 * produces a silent video (with burned-in subtitles only) instead of failing.
 */
export async function synthesizeVoiceover(args: {
  script: string;
  outDir: string;
  voiceId?: string;
}): Promise<string | null> {
  if (!env.ELEVENLABS_API_KEY) return null;

  const voice = args.voiceId ?? "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — neutral, wide-register
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: args.script,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.35,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${body.slice(0, 200)}`);
  }

  await fs.mkdir(args.outDir, { recursive: true });
  const outPath = path.join(args.outDir, "voiceover.mp3");
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buf);
  return outPath;
}
