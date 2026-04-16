import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { publishOne } from "@/social/publisher";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Cron endpoint: publishes any SCHEDULED post whose scheduledFor has passed.
 *
 * Wire this to Vercel Cron (vercel.json: { "crons": [{ "path":
 * "/api/cron/publish-pending", "schedule": "* * * * *" }] }) or any external
 * scheduler. Protects itself with CRON_SECRET if set.
 */
export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header =
      req.headers.get("x-cron-secret") ??
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (header !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  if (!hasDb) return NextResponse.json({ ok: true, published: 0 });

  const due = await db.socialPost.findMany({
    where: { status: "SCHEDULED", scheduledFor: { lte: new Date() } },
    take: 25,
    orderBy: { scheduledFor: "asc" },
    select: { id: true },
  });

  const results = await Promise.all(
    due.map(async (p) => ({ id: p.id, ...(await publishOne(p.id)) })),
  );
  return NextResponse.json({
    ok: true,
    considered: due.length,
    results,
  });
}
