/**
 * In-process rate limiting for the auth endpoints.
 *
 * A fixed-window counter held in module memory. That is the right shape for a
 * single Node process and nothing more: counters are not shared between
 * instances and are lost on restart, so behind more than one server this
 * slows an attacker down rather than stopping them. Moving the same interface
 * onto Redis is the upgrade when you scale past one instance.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so a long-running process doesn't grow unbounded. */
function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  /** Attempts left in this window. */
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1, retryAfter: windowSeconds };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfter,
  };
}

/** Clears a bucket — called after a success so a good login resets the count. */
export function rateLimitReset(key: string) {
  buckets.delete(key);
}

/**
 * Best-effort client address. These headers are set by the proxy in front of
 * the app and can be spoofed when nothing strips them, which is why the
 * account-scoped limit exists alongside the address-scoped one.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** 429 with Retry-After, shaped like the rest of the API's errors. */
export function tooManyRequests(result: RateLimitResult, message: string) {
  return new Response(
    JSON.stringify({ error: message, retryAfter: result.retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter),
      },
    },
  );
}
