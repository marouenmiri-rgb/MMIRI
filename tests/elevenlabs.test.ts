import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mediaDuration, runFfmpeg } from "@/lib/ffmpeg";
import { SAMPLE_SKETCH } from "@/cartoon/sample";

// Exercise the ElevenLabs paths (per-character TTS + Scribe speech-to-text)
// against a stubbed API: request shape is checked, real audio is returned.

let dir = "";
let lineMp3: Buffer;
const calls: { url: string; voice?: string; text?: string; model?: string; hasFile?: boolean; key?: string }[] = [];

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "adgen-11labs-"));
  const mp3 = path.join(dir, "line.mp3");
  await runFfmpeg(["-y", "-f", "lavfi", "-i", "sine=frequency=300:duration=2.4", "-c:a", "libmp3lame", "-b:a", "64k", mp3]);
  lineMp3 = await fs.readFile(mp3);

  process.env.ELEVENLABS_API_KEY = "el-test";
  vi.resetModules();
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const key = (init?.headers as Record<string, string>)?.["xi-api-key"];
    if (url.includes("/v1/text-to-speech/")) {
      const body = JSON.parse(String(init?.body));
      calls.push({ url, key, voice: url.split("/text-to-speech/")[1].split("?")[0], text: body.text, model: body.model_id });
      return new Response(new Uint8Array(lineMp3), { status: 200, headers: { "content-type": "audio/mpeg" } });
    }
    if (url.endsWith("/v1/speech-to-text")) {
      const form = init?.body as FormData;
      calls.push({ url, key, model: String(form.get("model_id")), hasFile: form.get("file") instanceof Blob });
      return Response.json({ text: "Did you eat my sandwich? I would never." });
    }
    throw new Error(`unexpected fetch ${url}`);
  }));
}, 60_000);

afterAll(async () => {
  vi.unstubAllGlobals();
  delete process.env.ELEVENLABS_API_KEY;
  await fs.rm(dir, { recursive: true, force: true });
});

describe("with ELEVENLABS_API_KEY", () => {
  it("voices each line with the speaker's voice and stretches panels to fit", async () => {
    const { renderCartoon } = await import("@/cartoon/renderer");
    const out = path.join(dir, "render");
    const r = await renderCartoon({ sketch: SAMPLE_SKETCH, outDir: out });

    expect(r.voiced).toBe(true);
    expect(r.videoPath).toBeTruthy();
    const tts = calls.filter((c) => c.url.includes("text-to-speech"));
    expect(tts).toHaveLength(SAMPLE_SKETCH.panels.filter((p) => p.line).length);
    expect(tts.every((c) => c.key === "el-test" && c.model === "eleven_turbo_v2_5")).toBe(true);
    // Gus (low) → Adam, Mimi (high) → Gigi, Bolt (mid) → Josh
    expect(tts.map((c) => c.voice)).toEqual(["pNInz6obpgDQGcFmaJgB", "jBpfuIE2acCO8z3wKNLl", "TxGEqnHWrfWFTfGW9XjX"]);
    expect(tts[1].text).toBe(SAMPLE_SKETCH.panels[1].line);

    // each voiced panel lasts at least its 2.4s line + 0.7s breathing room
    const { buildTimeline } = await import("@/cartoon/scene");
    const lineSec = (await mediaDuration(path.join(dir, "line.mp3")))!; // ~2.4s + encoder padding
    const stretched = buildTimeline(SAMPLE_SKETCH, [lineSec, lineSec, lineSec]);
    expect(r.durationSec).toBeCloseTo(stretched.duration, 1);
    for (const seg of stretched.segments) {
      if (seg.kind === "panel") expect(seg.duration).toBeGreaterThanOrEqual(3.1);
    }

    const dur = await mediaDuration(r.videoPath!);
    expect(dur).toBeCloseTo(r.durationSec, 0);
  }, 120_000);

  it("transcribes a shared video's audio with Scribe", async () => {
    const { studyVideo } = await import("@/cartoon/reference");
    const clip = path.join(dir, "clip.mp4");
    await runFfmpeg([
      "-y", "-f", "lavfi", "-i", "testsrc=size=320x568:rate=15:duration=5",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=5",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", clip,
    ]);
    const study = await studyVideo(clip);
    expect(study.transcript).toBe("Did you eat my sandwich? I would never.");
    const stt = calls.find((c) => c.url.endsWith("speech-to-text"));
    expect(stt).toMatchObject({ key: "el-test", model: "scribe_v1", hasFile: true });
  }, 60_000);
});
