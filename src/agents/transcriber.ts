import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";

/**
 * ElevenLabs speech-to-text (Scribe).
 *
 * Gated on ELEVENLABS_API_KEY, same key as the voiceover. Returns null when
 * unset or when the request fails, so callers fall back to frames only.
 */
export async function transcribeAudio(file: string): Promise<string | null> {
  if (!env.ELEVENLABS_API_KEY) return null;
  try {
    const buf = await fs.readFile(file);
    const form = new FormData();
    form.append("model_id", "scribe_v1");
    form.append("file", new Blob([new Uint8Array(buf)], { type: "audio/mpeg" }), path.basename(file));
    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
      body: form,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { text?: string };
    const text = body.text?.trim();
    return text ? text : null;
  } catch {
    return null;
  }
}
