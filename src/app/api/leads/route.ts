import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  if (!hasDb) return NextResponse.json({ leads: [] });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ leads: [] });
  const leads = await db.lead.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ leads });
}
