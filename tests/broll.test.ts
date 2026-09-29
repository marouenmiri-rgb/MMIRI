import { afterEach, describe, expect, it, vi } from "vitest";
import { hasBroll, pickPortraitFile } from "@/agents/broll";

const file = (w: number, h: number, type = "video/mp4") => ({
  link: `${w}x${h}`,
  width: w,
  height: h,
  file_type: type,
  quality: "hd",
});

afterEach(() => {
  delete process.env.PEXELS_API_KEY;
  vi.restoreAllMocks();
});

describe("hasBroll", () => {
  it("is off until a key is configured", () => {
    expect(hasBroll()).toBe(false);
    process.env.PEXELS_API_KEY = "k";
    expect(hasBroll()).toBe(true);
  });
});

describe("pickPortraitFile", () => {
  it("refuses landscape, whatever the resolution", () => {
    // A landscape clip cropped to 9:16 loses most of the frame, usually
    // including whatever the shot was of.
    expect(pickPortraitFile([file(3840, 2160), file(1920, 1080)])).toBeNull();
  });

  it("prefers the rendition nearest 1080 wide", () => {
    const got = pickPortraitFile([file(2160, 3840), file(1080, 1920), file(720, 1280)]);
    expect(got?.width).toBe(1080);
  });

  it("penalises anything under 720 so it loses to a larger file", () => {
    // Upscaled footage beside sharp product photography is obvious.
    const got = pickPortraitFile([file(360, 640), file(1440, 2560)]);
    expect(got?.width).toBe(1440);
  });

  it("still returns a small file when it is the only option", () => {
    expect(pickPortraitFile([file(360, 640)])?.width).toBe(360);
  });

  it("ignores renditions that are not mp4", () => {
    expect(pickPortraitFile([file(1080, 1920, "video/quicktime")])).toBeNull();
  });

  it("ignores entries with no dimensions", () => {
    expect(
      pickPortraitFile([
        { link: "x", width: null, height: null, file_type: "video/mp4", quality: "hd" },
      ]),
    ).toBeNull();
  });

  it("returns null rather than throwing on an empty list", () => {
    expect(pickPortraitFile([])).toBeNull();
  });
});
