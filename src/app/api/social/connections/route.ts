import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";
import { allPlatformMeta } from "@/social/registry";

export const runtime = "nodejs";

export async function GET() {
  if (!hasDb) {
    return NextResponse.json({ connections: [], platforms: allPlatformMeta() });
  }
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ connections: [], platforms: allPlatformMeta() });
  }
  const connections = await db.socialConnection.findMany({
    where: { userId },
    select: {
      id: true,
      platform: true,
      handle: true,
      avatarUrl: true,
      demo: true,
      createdAt: true,
      expiresAt: true,
    },
  });
  return NextResponse.json({ connections, platforms: allPlatformMeta() });
}
