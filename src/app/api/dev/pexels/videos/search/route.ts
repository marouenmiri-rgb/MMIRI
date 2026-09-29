import { NextResponse } from "next/server";

/**
 * Stands in for the Pexels videos API during development.
 *
 * api.pexels.com is unreachable from some sandboxes, and a real key should not
 * be needed to exercise search, selection, download and render. Point
 * PEXELS_API_BASE at this route to run the whole b-roll path locally.
 *
 * Only mounted outside production.
 */
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!req.headers.get("authorization")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = new URL(req.url).origin;
  const query = new URL(req.url).searchParams.get("query") ?? "";

  return NextResponse.json({
    page: 1,
    per_page: 15,
    videos: [
      {
        id: 101,
        width: 720,
        height: 1280,
        duration: 6,
        url: "https://www.pexels.com/video/mock-101/",
        user: { name: "Mock Contributor", url: "https://www.pexels.com/@mock" },
        video_files: [
          // Deliberately mixed, to exercise the picker: a landscape file that
          // must be rejected, a tiny portrait one that must lose on size.
          { link: `${origin}/_fixture/stock-steam.mp4`, width: 1280, height: 720, file_type: "video/mp4", quality: "hd" },
          { link: `${origin}/_fixture/stock-steam.mp4`, width: 360, height: 640, file_type: "video/mp4", quality: "sd" },
          { link: `${origin}/_fixture/stock-steam.mp4`, width: 720, height: 1280, file_type: "video/mp4", quality: "hd" },
        ],
      },
      {
        id: 102,
        width: 1080,
        height: 1920,
        duration: 2, // too short — must be filtered out
        url: "https://www.pexels.com/video/mock-102/",
        user: { name: "Too Short", url: "https://www.pexels.com/@short" },
        video_files: [
          { link: `${origin}/_fixture/stock-steam.mp4`, width: 1080, height: 1920, file_type: "video/mp4", quality: "hd" },
        ],
      },
    ],
    _echo: { query },
  });
}
