import { describe, expect, it } from "vitest";
import { toAss } from "@/agents/ffmpeg-renderer";

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
    expect(ass).toContain("Save (50%) today");
  });
});
