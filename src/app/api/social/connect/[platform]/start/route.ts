import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { adapterFor } from "@/social/registry";
import type { SocialPlatform } from "@/social/types";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const VALID: SocialPlatform[] = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "X"];

export async function GET(
  req: Request,
  { params }: { params: { platform: string } },
) {
  const platform = params.platform.toUpperCase() as SocialPlatform;
  if (!VALID.includes(platform)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  const url = new URL(req.url);
  const wantDemo =
    url.searchParams.get("demo") === "1" ||
    !adapterFor(platform).hasCredentials();

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/social/connect/${platform.toLowerCase()}/callback`;

  // In demo mode, skip the provider round-trip: immediately hit our own
  // callback with a fake code. The UI gets the same post-auth redirect.
  if (wantDemo) {
    const demoCallback = new URL(redirectUri);
    demoCallback.searchParams.set("code", "DEMO");
    demoCallback.searchParams.set("state", "demo");
    demoCallback.searchParams.set("demo", "1");
    return NextResponse.redirect(demoCallback);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = adapterFor(platform).oauthStartUrl(redirectUri, state);
  const res = NextResponse.redirect(authUrl);
  res.cookies.set(`oauth_state_${platform}`, state, {
    httpOnly: true,
    secure: env.NEXT_PUBLIC_APP_URL.startsWith("https://"),
    path: "/",
    maxAge: 600,
    sameSite: "lax",
  });
  return res;
}
