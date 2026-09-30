import http from "node:http";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runFfmpeg } from "@/lib/ffmpeg";
import { isPublicHttpUrl, platformOf, studyLink, vttToText, ytDlpAvailable } from "@/cartoon/link";

describe("isPublicHttpUrl", () => {
  it.each([
    ["https://www.tiktok.com/@a/video/123", true],
    ["https://youtu.be/abc", true],
    ["http://example.com/clip.mp4", true],
    ["ftp://example.com/x.mp4", false],
    ["file:///etc/passwd", false],
    ["http://localhost:3000/x", false],
    ["http://127.0.0.1/x", false],
    ["http://10.0.0.5/x", false],
    ["http://172.20.1.1/x", false],
    ["http://192.168.1.1/x", false],
    ["http://169.254.169.254/latest/meta-data", false],
    ["http://[::1]/x", false],
    ["http://2130706433/x", false],
    ["http://router.local/x", false],
    ["not a url", false],
  ])("%s → %s", (url, ok) => {
    expect(isPublicHttpUrl(url)).toBe(ok);
  });
});

describe("platformOf", () => {
  it("recognizes the big platforms", () => {
    expect(platformOf("https://vm.tiktok.com/xyz")).toBe("TikTok");
    expect(platformOf("https://www.youtube.com/shorts/abc")).toBe("YouTube");
    expect(platformOf("https://youtu.be/abc")).toBe("YouTube");
    expect(platformOf("https://www.instagram.com/reel/abc/")).toBe("Instagram");
    expect(platformOf("https://x.com/u/status/1")).toBe("X");
    expect(platformOf("https://cdn.example.com/a.mp4")).toBe("Web");
  });
});

describe("vttToText", () => {
  it("strips timing/tags and rolling duplicates", () => {
    const vtt = `WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:01.500
<c>Did you</c> eat my sandwich?

00:00:01.500 --> 00:00:03.000
Did you eat my sandwich?
I would never.
`;
    expect(vttToText(vtt)).toBe("Did you eat my sandwich? I would never.");
  });
});

// A tiny local "internet": a direct MP4, a page with Open Graph tags whose
// og:image is a thumbnail, and an HTML page with nothing useful on it.
let server: http.Server;
let base = "";
let clip: Buffer;
let thumb: Buffer;

beforeAll(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "adgen-linktest-"));
  const clipPath = path.join(dir, "clip.mp4");
  const thumbPath = path.join(dir, "thumb.png");
  await runFfmpeg([
    "-y", "-f", "lavfi", "-i", "testsrc=size=320x568:rate=15:duration=6",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", clipPath,
  ]);
  await runFfmpeg(["-y", "-f", "lavfi", "-i", "testsrc=size=320x568", "-frames:v", "1", thumbPath]);
  clip = await fs.readFile(clipPath);
  thumb = await fs.readFile(thumbPath);
  await fs.rm(dir, { recursive: true, force: true });

  server = http.createServer((req, res) => {
    if (req.url === "/clip.mp4") {
      res.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": clip.length });
      res.end(clip);
    } else if (req.url === "/thumb.png") {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(thumb);
    } else if (req.url === "/post") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<html><head>
        <meta property="og:title" content="Dog denies eating the sandwich">
        <meta property="og:description" content="He will never confess #funny">
        <meta property="og:image" content="/thumb.png">
      </head><body></body></html>`);
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><body>nothing here</body></html>");
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}, 60_000);

afterAll(() => {
  server?.close();
  delete process.env.YTDLP_PATH;
});

describe("studyLink", () => {
  it("downloads and studies a direct video link", async () => {
    process.env.YTDLP_PATH = "/nonexistent/yt-dlp";
    const r = await studyLink(`${base}/clip.mp4`);
    expect(r.depth).toBe("full");
    expect(r.via).toBe("direct");
    expect(r.study.frames).toHaveLength(4);
    expect(r.study.durationSec).toBeCloseTo(6, 0);
  }, 60_000);

  it("falls back to the page preview (title + thumbnail)", async () => {
    process.env.YTDLP_PATH = "/nonexistent/yt-dlp";
    const r = await studyLink(`${base}/post`);
    expect(r.depth).toBe("preview");
    expect(r.via).toBe("page");
    expect(r.title).toBe("Dog denies eating the sandwich");
    expect(r.description).toContain("never confess");
    expect(r.study.frames).toHaveLength(1);
    expect(Buffer.from(r.study.frames[0].data, "base64").subarray(0, 2).toString("hex")).toBe("ffd8");
  }, 60_000);

  it("gives a helpful error when nothing can be read", async () => {
    process.env.YTDLP_PATH = "/nonexistent/yt-dlp";
    await expect(studyLink(`${base}/empty`)).rejects.toThrow(/upload the file instead/);
  }, 60_000);

  it("uses yt-dlp when it is installed", async () => {
    delete process.env.YTDLP_PATH;
    if (!(await ytDlpAvailable())) return; // optional dependency
    const r = await studyLink(`${base}/clip.mp4`);
    expect(r.via).toBe("yt-dlp");
    expect(r.depth).toBe("full");
    expect(r.study.frames.length).toBeGreaterThanOrEqual(4);
  }, 120_000);
});
