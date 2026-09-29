import { describe, expect, it } from "vitest";
import { AD_FORMATS, DEFAULT_FORMAT, asFormat } from "@/agents/formats";

describe("ad formats", () => {
  it("falls back to the default for anything unrecognised", () => {
    for (const v of [undefined, null, "", "3min", "LONG", 60, {}]) {
      expect(asFormat(v)).toBe(DEFAULT_FORMAT);
    }
  });

  it("passes through the three real formats", () => {
    expect(asFormat("short")).toBe("short");
    expect(asFormat("standard")).toBe("standard");
    expect(asFormat("long")).toBe("long");
  });

  it("scales words with runtime at a speakable rate", () => {
    // Natural narration sits near 2.5-3 words a second. Wildly off in either
    // direction means the script cannot fill, or badly overruns, the video.
    for (const f of Object.values(AD_FORMATS)) {
      const rate = f.words / f.seconds;
      expect(rate).toBeGreaterThan(2.4);
      expect(rate).toBeLessThan(3.2);
    }
  });

  it("allows scene lengths that stay under five seconds", () => {
    // A still photograph held longer than about five seconds reads as a stall,
    // even with motion on it.
    for (const f of Object.values(AD_FORMATS)) {
      expect(f.seconds / f.minScenes).toBeLessThanOrEqual(5);
    }
  });

  it("never asks for fewer scenes than a hook/problem/solution/CTA needs", () => {
    for (const f of Object.values(AD_FORMATS)) {
      expect(f.minScenes).toBeGreaterThanOrEqual(4);
      expect(f.maxScenes).toBeGreaterThanOrEqual(f.minScenes);
    }
  });

  it("caps at 60 seconds, because there is no footage beyond the photos", () => {
    const longest = Math.max(...Object.values(AD_FORMATS).map((f) => f.seconds));
    expect(longest).toBeLessThanOrEqual(60);
  });
});
