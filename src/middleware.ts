import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Edge protections applied to every request before it reaches a route.
 *
 * Three jobs: send the security headers a browser needs to defend the page,
 * drop the constant background scan traffic any public host attracts, and put
 * a ceiling on API calls per address so one client cannot saturate the box.
 *
 * Per-endpoint limits still live in the routes themselves — sign-in is
 * throttled far harder than this, and per-account as well as per-address.
 * This is the outer wall, not the only one.
 */

/** Paths that only ever appear in automated scans for leaked secrets. */
const SCANNER_PATHS = [
  "/.env",
  "/.git",
  "/.aws",
  "/.ssh",
  "/wp-admin",
  "/wp-login.php",
  "/xmlrpc.php",
  "/phpmyadmin",
  "/vendor/phpunit",
  "/config.json",
  "/.well-known/security.txt.bak",
  "/actuator",
  "/server-status",
];

function securityHeaders(isProd: boolean): Record<string, string> {
  const csp = [
    "default-src 'self'",
    // Next inlines hydration data and the pre-paint theme script; dev also
    // needs eval. This still blocks script loaded from another origin, which
    // is what an injection actually needs.
    `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // Product photography comes from whatever CDN the store uses.
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const headers: Record<string, string> = {
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // The app asks for none of these; say so rather than leaving it open.
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-DNS-Prefetch-Control": "off",
  };

  if (isProd) {
    headers["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains; preload";
  }
  return headers;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProd = process.env.NODE_ENV === "production";

  // 1. Scanners. Answer 404 so the response says nothing about what exists.
  const lower = pathname.toLowerCase();
  if (SCANNER_PATHS.some((p) => lower === p || lower.startsWith(p + "/"))) {
    return new NextResponse(null, { status: 404 });
  }

  // 2. A ceiling on API traffic per address. Generous on purpose: this is here
  // to stop a flood, not to police normal use.
  if (pathname.startsWith("/api/")) {
    const ip = clientIp(req);
    const gate = rateLimit(`edge:${ip}`, 240, 60);
    if (!gate.ok) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Slow down." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(gate.retryAfter),
          },
        },
      );
    }
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(securityHeaders(isProd))) {
    res.headers.set(k, v);
  }
  return res;
}

export const config = {
  // Everything except Next's own build output and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
