import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(
  readFileSync(path.join(process.cwd(), "public", "manifest.webmanifest"), "utf8"),
);

describe("web app manifest", () => {
  it("declares a share target, which is what puts AdGen in the share sheet", () => {
    // This is the whole point of installing: send a product page from the
    // browser instead of copying a link between apps. Lose it and the
    // installed app is just a bookmark.
    expect(manifest.share_target?.action).toBe("/make");
    expect(manifest.share_target?.params).toMatchObject({
      url: "url",
      text: "text",
    });
  });

  it("opens on the thing people install it to do", () => {
    expect(manifest.start_url).toBe("/make");
    expect(manifest.display).toBe("standalone");
  });

  it("ships both an any and a maskable icon", () => {
    // Android crops icons to its own shape; without a maskable variant the
    // mark gets its corners cut off.
    const purposes = manifest.icons.map((i: { purpose?: string }) => i.purpose);
    expect(purposes).toContain("any");
    expect(purposes).toContain("maskable");
  });

  it("references icons that exist", () => {
    for (const icon of manifest.icons as { src: string }[]) {
      const file = path.join(process.cwd(), "public", icon.src.replace(/^\//, ""));
      expect(() => readFileSync(file)).not.toThrow();
    }
  });
});

describe("service worker", () => {
  const sw = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");

  it("never serves an API response from cache", () => {
    // Quotas, revenue and session state are all things a stale answer gets
    // wrong, and wrong quietly.
    expect(sw).toContain('url.pathname.startsWith("/api/")');
  });

  it("falls back to the offline page only for navigations", () => {
    expect(sw).toContain('request.mode === "navigate"');
    expect(sw).toContain('caches.match("/offline")');
  });
});
