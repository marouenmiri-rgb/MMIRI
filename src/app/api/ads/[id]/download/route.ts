import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Serves the rendered MP4 as a download rather than an inline video.
 *
 * The file is already reachable as a static asset under /renders/<id>/ad.mp4,
 * but a static hit opens in the browser and saves as "ad.mp4". This sets
 * Content-Disposition and names the file after the product, so what lands in
 * the customer's Downloads folder is something they can find again.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const ad = await db.ad.findFirst({
    where: { id: params.id, userId },
    select: { id: true, productTitle: true, videoUrl: true },
  });
  if (!ad) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!ad.videoUrl) {
    return NextResponse.json(
      {
        error: "not_rendered",
        message:
          "This ad has no video file. Rendering needs ffmpeg installed on the machine running AdGen.",
      },
      { status: 409 },
    );
  }

  // videoUrl is a site-relative path we wrote ourselves (/renders/<id>/ad.mp4).
  // Resolve it under public/ and confirm it stayed there before reading.
  const publicDir = path.join(process.cwd(), "public");
  const filePath = path.resolve(publicDir, "." + ad.videoUrl);
  if (!filePath.startsWith(publicDir + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let file: Buffer;
  try {
    file = await fs.readFile(filePath);
  } catch {
    return NextResponse.json(
      {
        error: "missing_file",
        message: "The video record exists but the file is gone from disk.",
      },
      { status: 410 },
    );
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(file.byteLength),
      "Content-Disposition": `attachment; filename="${downloadName(ad.productTitle, ad.id)}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}

/** "Ember Travel Mug 2" -> "ember-travel-mug-2-adgen.mp4" */
function downloadName(title: string | null, adId: string) {
  const slug = (title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || `adgen-${adId.slice(-6)}`}-adgen.mp4`;
}
