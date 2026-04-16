import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const ad = await db.ad.findFirst({
    where: { id: params.id, userId },
  });
  if (!ad) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ad);
}
