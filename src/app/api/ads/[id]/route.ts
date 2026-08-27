import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";
import { unpackJson } from "@/lib/json";

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
  // scriptJson/scenesJson are TEXT in SQLite; the generator expects objects.
  return NextResponse.json({
    ...ad,
    scriptJson: unpackJson<Record<string, unknown> | null>(ad.scriptJson, null),
    scenesJson: unpackJson<Record<string, unknown> | null>(ad.scenesJson, null),
  });
}
