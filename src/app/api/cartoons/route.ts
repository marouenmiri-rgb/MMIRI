import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";

export const runtime = "nodejs";

/** The user's most recent cartoons, newest first. */
export async function GET() {
  if (!hasDb) return NextResponse.json({ cartoons: [] });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ cartoons: [] });
  const cartoons = await db.ad.findMany({
    where: { userId, format: "CARTOON" },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      productTitle: true,
      topic: true,
      status: true,
      thumbnailUrl: true,
      videoUrl: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ cartoons });
}
