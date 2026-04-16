import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { env, hasDb } from "@/lib/env";
import { adapterFor, demoExchange } from "@/social/registry";
import type { SocialPlatform } from "@/social/types";

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
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const demo = url.searchParams.get("demo") === "1";
  const state = url.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/distribution?err=missing_code`,
    );
  }

  // CSRF: match state cookie for real flows.
  if (!demo) {
    const cookie = req.headers
      .get("cookie")
      ?.split(/;\s*/)
      .find((p) => p.startsWith(`oauth_state_${platform}=`))
      ?.split("=")[1];
    if (!cookie || cookie !== state) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/distribution?err=state_mismatch`,
      );
    }
  }

  try {
    const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/social/connect/${platform.toLowerCase()}/callback`;
    const ex = demo
      ? demoExchange(platform)
      : await adapterFor(platform).exchangeCode(code, redirectUri);

    await db.socialConnection.upsert({
      where: { userId_platform: { userId, platform } },
      update: {
        handle: ex.handle ?? null,
        avatarUrl: ex.avatarUrl ?? null,
        accessToken: ex.accessToken,
        refreshToken: ex.refreshToken ?? null,
        expiresAt: ex.expiresAt ?? null,
        scopes: ex.scopes ?? null,
        demo,
      },
      create: {
        userId,
        platform,
        handle: ex.handle ?? null,
        avatarUrl: ex.avatarUrl ?? null,
        accessToken: ex.accessToken,
        refreshToken: ex.refreshToken ?? null,
        expiresAt: ex.expiresAt ?? null,
        scopes: ex.scopes ?? null,
        demo,
      },
    });

    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/distribution?connected=${platform}${demo ? "&demo=1" : ""}`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/distribution?err=${encodeURIComponent(msg).slice(0, 200)}`,
    );
  }
}
