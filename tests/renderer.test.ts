import { describe, expect, it } from "vitest";
import { buildAudio, toAss } from "@/agents/ffmpeg-renderer";

type Scene = { text: string; imageRef: string; durationSec: number };

const scenes: Scene[] = [
  { text: "Hook line.", imageRef: "image-0", durationSec: 3 },
  { text: "Problem line.", imageRef: "image-1", durationSec: 4 },
  { text: "Solution line.", imageRef: "image-2", durationSec: 4 },
  { text: "Call to action.", imageRef: "image-3", durationSec: 3 },
];
const durations = [3, 4, 4, 3];

/** "0:00:14.00" -> 14 */
function seconds(ts: string): number {
  const [h, m, s] = ts.split(":");
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function events(ass: string) {
  return [...ass.matchAll(/^Dialogue: 0,([^,]+),([^,]+),/gm)].map((m) => ({
    start: seconds(m[1]!),
    end: seconds(m[2]!),
  }));
}

describe("toAss", () => {
  it("states the canvas so a point size means what it says", () => {
    // Without these, libass lays out against its own small default and scales
    // up — which once turned size 64 into roughly 240px across the frame.
    const ass = toAss(scenes, durations);
    expect(ass).toContain("PlayResX: 1080");
    expect(ass).toContain("PlayResY: 1920");
  });

  it("runs captions back to back with no gaps", () => {
    const e = events(toAss(scenes, durations));
    expect(e).toHaveLength(4);
    expect(e[0]!.start).toBe(0);
    for (let i = 1; i < e.length; i++) {
      expect(e[i]!.start).toBe(e[i - 1]!.end);
    }
  });

  it("keeps a caption on screen to the last frame", () => {
    // The regression this guards: the video used to outlast its captions by a
    // whole scene, ending on several seconds of silent product shot with the
    // call to action already gone.
    const total = durations.reduce((a, b) => a + b, 0);
    const e = events(toAss(scenes, durations));
    expect(e[e.length - 1]!.end).toBe(total);
  });

  it("uses the rounded durations the concat list uses, not the raw ones", () => {
    // Both sides must round identically or the caption track drifts from the
    // images it belongs to.
    const odd: Scene[] = [
      { text: "a", imageRef: "image-0", durationSec: 2.4 },
      { text: "b", imageRef: "image-1", durationSec: 3.6 },
    ];
    const rounded = [2, 4];
    const e = events(toAss(odd, rounded));
    expect(e[0]!.end).toBe(2);
    expect(e[1]!.end).toBe(6);
  });

  it("escapes braces, which are syntax in an ASS event line", () => {
    const ass = toAss(
      [{ text: "Save {50%} today", imageRef: "image-0", durationSec: 3 }],
      [3],
    );
    // Words are wrapped individually for karaoke timing, so check the escaped
    // text survives rather than expecting one contiguous run.
    expect(ass).toContain("(50%)");
    // The only braces left must be ASS tags, never the user's.
    const body = ass.slice(ass.indexOf("Dialogue:"));
    expect(body).not.toContain("{50%}");
    for (const tag of body.match(/\{[^}]*\}/g) ?? []) {
      expect(tag.startsWith("{\\")).toBe(true);
    }
  });

  it("times each word so the line finishes with the shot", () => {
    const ass = toAss(
      [{ text: "One two three four", imageRef: "image-0", durationSec: 4 }],
      [4],
    );
    const line = ass.slice(ass.indexOf("Dialogue:"));
    const spans = [...line.matchAll(/\\k(\d+)/g)].map((m) => Number(m[1]));
    expect(spans).toHaveLength(4);
    // Centiseconds across the scene, give or take the trailing hold.
    const total = spans.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(350);
    expect(total).toBeLessThanOrEqual(400);
  });

  it("gives longer words a longer beat than short ones", () => {
    const ass = toAss(
      [{ text: "a extraordinary", imageRef: "image-0", durationSec: 4 }],
      [4],
    );
    const line = ass.slice(ass.indexOf("Dialogue:"));
    const [first, second] = [...line.matchAll(/\\k(\d+)/g)].map((m) =>
      Number(m[1]),
    );
    expect(second).toBeGreaterThan(first!);
  });
});

describe("buildAudio", () => {
  const args = (vo?: string, music?: string) =>
    buildAudio(vo, music, 30).args.join(" ");

  it("never passes -shortest, which truncates the edit to the narration", () => {
    // The regression: a 30s edit with 6s of voiceover came out 6s long, the
    // visuals cut off with the audio.
    for (const a of [
      args("vo.mp3", "bed.mp3"),
      args("vo.mp3", undefined),
      args(undefined, "bed.mp3"),
      args(undefined, undefined),
    ]) {
      expect(a).not.toContain("-shortest");
    }
  });

  it("pads a short voiceover rather than letting it end the mix", () => {
    expect(args("vo.mp3", "bed.mp3")).toContain("apad");
    expect(args("vo.mp3", undefined)).toContain("apad");
  });

  it("keeps its own levels by disabling amix normalisation", () => {
    expect(args("vo.mp3", "bed.mp3")).toContain("normalize=0");
  });

  it("splits the voice, since a filter label cannot be consumed twice", () => {
    const a = args("vo.mp3", "bed.mp3");
    expect(a).toContain("asplit=2[vo][key]");
    expect(a).toContain("sidechaincompress");
  });

  it("loops the bed so a short track still covers a long edit", () => {
    expect(buildAudio("vo.mp3", "bed.mp3", 60).inputs).toContain("-stream_loop");
  });

  it("stays silent when there is nothing to play", () => {
    expect(buildAudio(undefined, undefined, 30).args).toEqual(["-an"]);
  });
});
