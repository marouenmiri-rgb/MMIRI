import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Outbound request guard.
 *
 * The scraper fetches whatever URL a visitor types. Without a check, pasting
 * http://169.254.169.254/latest/meta-data/ as a "product URL" makes the server
 * fetch its own cloud credentials and hand the body back inside an ad — and
 * http://127.0.0.1:5432 reaches anything else running on the box. Every
 * outbound fetch to a user-influenced address goes through here.
 *
 * Known limit: DNS is resolved for the check and resolved again by fetch, so a
 * name that answers differently between the two calls (DNS rebinding) can slip
 * past. Closing that needs connecting to the validated address directly with a
 * Host header, which fetch cannot express. Run the renderer egress-restricted
 * in production if that matters to you.
 */

export class BlockedAddressError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "BlockedAddressError";
  }
}

/** Hostnames that serve instance credentials on the major clouds. */
const METADATA_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "metadata",
]);

function ipv4ToLong(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    out = out * 256 + n;
  }
  return out;
}

/** True for anything that is not a public, routable internet address. */
export function isBlockedAddress(ip: string, family: number): boolean {
  if (family === 4) {
    const n = ipv4ToLong(ip);
    if (n === null) return true;
    const inRange = (cidrStart: string, bits: number) => {
      const start = ipv4ToLong(cidrStart)!;
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) >>> 0 === (start & mask) >>> 0;
    };
    return (
      inRange("0.0.0.0", 8) || // this network
      inRange("10.0.0.0", 8) || // private
      inRange("100.64.0.0", 10) || // carrier NAT
      inRange("127.0.0.0", 8) || // loopback
      inRange("169.254.0.0", 16) || // link-local, incl. cloud metadata
      inRange("172.16.0.0", 12) || // private
      inRange("192.0.0.0", 24) || // IETF protocol assignments
      inRange("192.168.0.0", 16) || // private
      inRange("198.18.0.0", 15) || // benchmarking
      inRange("224.0.0.0", 4) || // multicast
      inRange("240.0.0.0", 4) // reserved, includes broadcast
    );
  }

  const v6 = ip.toLowerCase().split("%")[0]!;
  if (v6 === "::" || v6 === "::1") return true;
  if (v6.startsWith("fe80")) return true; // link-local
  if (/^f[cd]/.test(v6)) return true; // unique local
  if (v6.startsWith("ff")) return true; // multicast
  // IPv4 tunnelled through IPv6 — check the embedded address.
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedAddress(mapped[1]!, 4);
  return false;
}

/** Parses and validates one URL. Throws BlockedAddressError if unusable. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedAddressError("That is not a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedAddressError("Only http and https URLs are allowed.");
  }
  // Credentials in a URL are a redirect-laundering trick and never needed here.
  if (url.username || url.password) {
    throw new BlockedAddressError("URLs with credentials are not allowed.");
  }

  // URL keeps IPv6 literals in brackets; strip them before anything else.
  const host = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

  if (METADATA_HOSTS.has(host) || host.endsWith(".internal")) {
    throw new BlockedAddressError("That host is not reachable.");
  }

  // An address written out directly needs no DNS — check it as given, so a
  // literal can never reach the resolver and come back looking different.
  const literal = isIP(host);
  if (literal) {
    if (isBlockedAddress(host, literal)) {
      throw new BlockedAddressError("That host is not reachable.");
    }
    return url;
  }

  let records: { address: string; family: number }[];
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new BlockedAddressError("That host could not be resolved.");
  }
  if (records.length === 0) {
    throw new BlockedAddressError("That host could not be resolved.");
  }
  // Every answer must be public: one private record is enough to abuse.
  for (const r of records) {
    if (isBlockedAddress(r.address, r.family)) {
      throw new BlockedAddressError("That host is not reachable.");
    }
  }
  return url;
}

export type SafeFetchOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Abort once the body passes this many bytes. */
  maxBytes?: number;
  maxRedirects?: number;
};

/**
 * fetch() with the address check applied to the first request and to every
 * redirect, since a public host may redirect to a private one.
 */
export async function safeFetch(
  raw: string,
  opts: SafeFetchOptions = {},
): Promise<Response> {
  const {
    headers,
    timeoutMs = 15_000,
    maxBytes = 8 * 1024 * 1024,
    maxRedirects = 4,
  } = opts;

  let current = raw;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertPublicUrl(current);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        headers,
        redirect: "manual",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      current = new URL(location, url).toString();
      continue;
    }

    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > maxBytes) {
      throw new BlockedAddressError("That response is too large.");
    }
    return capBody(res, maxBytes);
  }
  throw new BlockedAddressError("Too many redirects.");
}

/**
 * Re-wraps the response so a server that lies about content-length still can't
 * stream an unbounded body into memory.
 */
function capBody(res: Response, maxBytes: number): Response {
  if (!res.body) return res;
  let seen = 0;
  const limited = res.body.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > maxBytes) {
          controller.error(new BlockedAddressError("That response is too large."));
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
  return new Response(limited, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}
