import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { publishTo } from "./registry";

/**
 * Core publisher. Picks up a single SocialPost row, calls the platform
 * adapter (or demo-mode if the connection is demo / no creds), and
 * reflects the result back into the row.
 *
 * Used by:
 *  - POST /api/social/posts (deliver=now)
 *  - POST /api/cron/publish-pending (runs every minute)
 */
export async function publishOne(postId: string): Promise<
  | { ok: true; externalUrl: string }
  | { ok: false; error: string }
> {
  const post = await db.socialPost.findUnique({
    where: { id: postId },
    include: { connection: true, ad: true },
  });
  if (!post) return { ok: false, error: "post not found" };
  if (post.status === "PUBLISHED") {
    return { ok: true, externalUrl: post.externalUrl ?? "" };
  }
  if (!post.ad.videoUrl) {
    await markFailed(postId, "ad has no videoUrl");
    return { ok: false, error: "ad has no videoUrl" };
  }

  await db.socialPost.update({
    where: { id: postId },
    data: { status: "PUBLISHING" },
  });

  const videoUrl = toAbsolute(post.ad.videoUrl);
  const thumb = post.ad.thumbnailUrl ? toAbsolute(post.ad.thumbnailUrl) : null;

  try {
    const res = await publishTo(post.platform, {
      videoUrl,
      thumbnailUrl: thumb,
      caption: post.caption,
      accessToken: post.connection.accessToken,
      refreshToken: post.connection.refreshToken,
      demo: post.connection.demo,
    });

    await db.socialPost.update({
      where: { id: postId },
      data: {
        status: "PUBLISHED",
        externalId: res.externalId,
        externalUrl: res.externalUrl,
        publishedAt: new Date(),
      },
    });
    return { ok: true, externalUrl: res.externalUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markFailed(postId, msg);
    return { ok: false, error: msg };
  }
}

async function markFailed(postId: string, error: string) {
  await db.socialPost.update({
    where: { id: postId },
    data: { status: "FAILED", error },
  });
}

function toAbsolute(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}
