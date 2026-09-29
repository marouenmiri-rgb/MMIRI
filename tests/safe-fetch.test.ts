import { describe, expect, it } from "vitest";
import {
  BlockedAddressError,
  assertPublicUrl,
  isBlockedAddress,
} from "@/lib/safe-fetch";

describe("isBlockedAddress", () => {
  it("blocks the addresses an SSRF actually targets", () => {
    const blocked = [
      ["127.0.0.1", 4], // loopback — anything else on the box
      ["169.254.169.254", 4], // cloud instance credentials
      ["10.1.2.3", 4], // private
      ["172.16.0.1", 4], // private
      ["172.31.255.255", 4], // private, upper edge
      ["192.168.1.1", 4], // private
      ["100.64.0.1", 4], // carrier NAT
      ["0.0.0.0", 4],
      ["255.255.255.255", 4], // broadcast
      ["224.0.0.1", 4], // multicast
      ["::1", 6], // loopback
      ["fe80::1", 6], // link-local
      ["fc00::1", 6], // unique local
      ["::ffff:127.0.0.1", 6], // loopback smuggled through IPv6
      ["::ffff:169.254.169.254", 6], // metadata smuggled through IPv6
    ] as const;
    for (const [ip, family] of blocked) {
      expect(isBlockedAddress(ip, family), `${ip} should be blocked`).toBe(true);
    }
  });

  it("allows ordinary public addresses", () => {
    const allowed = [
      ["8.8.8.8", 4],
      ["23.227.38.65", 4], // Shopify
      ["172.15.0.1", 4], // just below the private block
      ["172.32.0.1", 4], // just above it
      ["99.255.255.255", 4], // just below carrier NAT
      ["2606:4700::1111", 6],
    ] as const;
    for (const [ip, family] of allowed) {
      expect(isBlockedAddress(ip, family), `${ip} should be allowed`).toBe(false);
    }
  });
});

describe("assertPublicUrl", () => {
  it("rejects non-http schemes", async () => {
    for (const u of [
      "file:///etc/passwd",
      "ftp://example.com/x",
      "gopher://example.com",
    ]) {
      await expect(assertPublicUrl(u)).rejects.toBeInstanceOf(
        BlockedAddressError,
      );
    }
  });

  it("rejects URLs carrying credentials", async () => {
    await expect(
      assertPublicUrl("https://user:pass@example.com/p"),
    ).rejects.toThrow(/credentials/i);
  });

  it("rejects cloud metadata hostnames without resolving them", async () => {
    for (const u of [
      "http://metadata.google.internal/computeMetadata/v1/",
      "http://anything.internal/",
    ]) {
      await expect(assertPublicUrl(u)).rejects.toThrow(/not reachable/i);
    }
  });

  it("rejects a literal loopback or metadata address", async () => {
    for (const u of [
      "http://127.0.0.1:5432/",
      "http://169.254.169.254/latest/meta-data/",
      "http://[::1]:3000/",
    ]) {
      await expect(assertPublicUrl(u)).rejects.toThrow(/not reachable/i);
    }
  });

  it("rejects something that isn't a URL at all", async () => {
    await expect(assertPublicUrl("not a url")).rejects.toThrow(/valid URL/i);
  });
});
