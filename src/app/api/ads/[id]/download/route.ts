import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Download an ad's rendered MP4 as an attachment. Streams from disk rather
 * than relying on /public, because `next start` only serves files that
 * existed in /public at build time.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const ad = await db.ad.findFirst({ where: { id: params.id, userId } });
  if (!ad?.videoUrl || !ad.videoUrl.startsWith("/renders/")) {
    return NextResponse.json({ error: "No video for this ad" }, { status: 404 });
  }

  const root = path.join(process.cwd(), "public");
  const file = path.join(root, ad.videoUrl);
  if (!file.startsWith(path.join(root, "renders") + path.sep)) {
    return NextResponse.json({ error: "Bad path" }, { status: 400 });
  }

  let buf: Buffer;
  try {
    buf = await fs.readFile(file);
  } catch {
    return NextResponse.json({ error: "Video file missing" }, { status: 404 });
  }

  const name = slug(ad.productTitle ?? "adgen-video") || "adgen-video";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(buf.length),
      "Content-Disposition": `attachment; filename="${name}.mp4"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
