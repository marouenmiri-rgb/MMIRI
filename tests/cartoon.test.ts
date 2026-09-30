import { describe, expect, it } from "vitest";
import { Resvg } from "@resvg/resvg-js";
import { sanitizeSketch } from "@/cartoon/sanitize";
import { buildTimeline, renderFrameSvg, wrap, TITLE_SEC, END_SEC } from "@/cartoon/scene";
import { SAMPLE_SKETCH } from "@/cartoon/sample";
import { CHARACTER_KINDS, EXPRESSIONS, SETTINGS } from "@/cartoon/types";
import { sketchToScript } from "@/agents/cartoon-pipeline";

describe("sanitizeSketch", () => {
  it("clamps unknown enums, bad colors, and dangling speakers", () => {
    const s = sanitizeSketch({
      title: "  Test  ",
      cast: [
        { id: "a", name: "Al", kind: "dragon", color: "red", accessory: "cape", voice: "squeaky" },
        { id: "a", name: "Dupe" },
        { id: "b", name: "Bo", kind: "frog", color: "#0F0", accessory: "crown", voice: "low" },
      ],
      panels: [
        {
          setting: "moon",
          characters: [
            { id: "a", position: "left", expression: "furious", action: "teleport" },
            { id: "a", position: "right", expression: "happy", action: "idle" },
            { id: "ghost", position: "center", expression: "happy", action: "idle" },
          ],
          speaker: "b",
          line: "I wasn't even in this panel",
          sfx: "BONK!",
          caption: "",
          durationSec: 99,
        },
        { setting: "park", characters: [], speaker: "nobody", line: "hi", durationSec: 0 },
      ],
    });

    expect(s.title).toBe("Test");
    expect(s.cast.map((c) => c.id)).toEqual(["a", "b"]);
    expect(CHARACTER_KINDS).toContain(s.cast[0].kind);
    expect(s.cast[0].color).toMatch(/^#[0-9a-f]{6}$/);
    expect(s.cast[0].accessory).toBe("none");
    expect(s.cast[1].color).toBe("#00ff00");

    const [p0, p1] = s.panels;
    expect(p0.setting).toBe("living-room");
    expect(p0.durationSec).toBe(6);
    expect(p0.characters.map((c) => c.id)).toEqual(["a", "b"]);
    expect(p0.characters[0].expression).toBe("neutral");
    expect(p0.characters[0].action).toBe("idle");
    // speaker b was added to the panel on a free slot
    expect(p0.characters[1].position).not.toBe("left");

    expect(p1.speaker).toBe("");
    expect(p1.line).toBe("");
    expect(p1.durationSec).toBe(1.5);
  });

  it("never returns an empty sketch", () => {
    const s = sanitizeSketch(null);
    expect(s.cast.length).toBe(1);
    expect(s.panels.length).toBe(1);
  });
});

describe("timeline", () => {
  it("adds title + end cards and stretches panels to fit dialogue", () => {
    const tl = buildTimeline(SAMPLE_SKETCH, [null, 6, null]);
    expect(tl.segments[0].kind).toBe("title");
    expect(tl.segments[tl.segments.length - 1].kind).toBe("end");
    const p1 = tl.segments[2];
    expect(p1.kind === "panel" && p1.duration).toBeGreaterThanOrEqual(6.7);
    const panels = tl.segments.reduce((n, s) => n + s.duration, 0);
    expect(tl.duration).toBeCloseTo(panels);
    expect(tl.duration).toBeGreaterThan(TITLE_SEC + END_SEC);
  });
});

describe("renderFrameSvg", () => {
  it("renders every setting, kind and expression without NaNs", () => {
    const sketch = sanitizeSketch({
      title: "Every Thing",
      cast: CHARACTER_KINDS.slice(0, 3).map((kind, i) => ({
        id: `c${i}`, name: kind, kind, color: "#88ccff", accessory: "party-hat", voice: "mid",
      })),
      panels: SETTINGS.map((setting, i) => ({
        setting,
        characters: [0, 1, 2].map((j) => ({
          id: `c${j}`,
          position: ["left", "center", "right"][j],
          expression: EXPRESSIONS[(i + j) % EXPRESSIONS.length],
          action: "bounce",
        })),
        speaker: "c0",
        line: "A line that is long enough to wrap onto a second line of the bubble",
        sfx: "POW",
        caption: "Meanwhile",
        durationSec: 2,
      })),
      cta: "Link in bio",
    });
    const tl = buildTimeline(sketch);
    for (let t = 0; t < tl.duration; t += 0.37) {
      const svg = renderFrameSvg(sketch, tl, t);
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it("covers the remaining character kinds", () => {
    const sketch = sanitizeSketch({
      cast: CHARACTER_KINDS.slice(3, 6).map((kind, i) => ({ id: `k${i}`, name: kind, kind, voice: "low" })),
      panels: [{ setting: "beach", characters: [{ id: "k0", position: "left" }, { id: "k1", position: "center" }, { id: "k2", position: "right" }], speaker: "k1", line: "hey", durationSec: 2 }],
    });
    const svg = renderFrameSvg(sketch, buildTimeline(sketch), TITLE_SEC + 0.5);
    expect(svg).not.toMatch(/NaN|undefined/);
    const sketch2 = sanitizeSketch({
      cast: CHARACTER_KINDS.slice(6).map((kind, i) => ({ id: `k${i}`, name: kind, kind })),
      panels: [{ setting: "store", characters: [{ id: "k0", position: "left" }, { id: "k1", position: "right" }], speaker: "k0", line: "yo", durationSec: 2 }],
    });
    expect(renderFrameSvg(sketch2, buildTimeline(sketch2), TITLE_SEC + 0.5)).not.toMatch(/NaN|undefined/);
  });

  it("escapes dialogue and rasterizes to a PNG", () => {
    const sketch = sanitizeSketch({
      ...SAMPLE_SKETCH,
      panels: [{ ...SAMPLE_SKETCH.panels[0], line: `Tom & "Jerry" <3` }],
    });
    const tl = buildTimeline(sketch);
    const svg = renderFrameSvg(sketch, tl, TITLE_SEC + 2.5);
    expect(svg).toContain("Tom &amp; &quot;Jerry&quot; &lt;3");
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 108 } }).render().asPng();
    expect(png.subarray(1, 4).toString()).toBe("PNG");
  });
});

describe("wrap", () => {
  it("wraps on word boundaries within the limit", () => {
    const lines = wrap("the quick brown fox jumps over the lazy dog", 12);
    expect(lines.every((l) => l.length <= 12)).toBe(true);
    expect(lines.join(" ")).toBe("the quick brown fox jumps over the lazy dog");
  });
});

describe("sketchToScript", () => {
  it("maps dialogue onto the AdScript shape used by captions", () => {
    const s = sketchToScript(SAMPLE_SKETCH);
    expect(s.hook).toBe(SAMPLE_SKETCH.panels[0].line);
    expect(s.cta).toBe(SAMPLE_SKETCH.cta);
    expect(s.fullScript.split("\n")[1]).toMatch(/^Mimi: /);
  });
});

describe("reference videos", () => {
  it("samples 4–10 frames spread across the clip", async () => {
    const { frameCount, frameTimes } = await import("@/cartoon/reference");
    expect(frameCount(null)).toBe(6);
    expect(frameCount(5)).toBe(4);
    expect(frameCount(30)).toBe(8);
    expect(frameCount(600)).toBe(10);
    const t = frameTimes(20, 4);
    expect(t).toEqual([2.5, 7.5, 12.5, 17.5]);
  });

  it("extracts frames from a real video (no transcript without a key)", async () => {
    const { runFfmpeg } = await import("@/lib/ffmpeg");
    const { studyVideo } = await import("@/cartoon/reference");
    const os = await import("node:os");
    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const file = path.join(os.tmpdir(), `adgen-test-${Date.now()}.mp4`);
    await runFfmpeg([
      "-y", "-f", "lavfi", "-i", "testsrc=size=320x568:rate=15:duration=6",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", file,
    ]);
    try {
      const study = await studyVideo(file);
      expect(study.durationSec).toBeCloseTo(6, 0);
      expect(study.frames).toHaveLength(4);
      expect(study.frames[0].mediaType).toBe("image/jpeg");
      expect(Buffer.from(study.frames[0].data, "base64").subarray(0, 2).toString("hex")).toBe("ffd8");
      expect(study.transcript).toBeNull();
    } finally {
      await fs.rm(file, { force: true });
    }
  }, 30_000);
});
