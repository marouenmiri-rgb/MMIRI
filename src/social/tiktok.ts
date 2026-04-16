import type { OAuthExchange, PublishArgs, PublishResult, SocialAdapter } from "./types";

/**
 * TikTok — Content Posting API (v2).
 *
 * Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
 * Required env vars:
 *   TIKTOK_CLIENT_KEY
 *   TIKTOK_CLIENT_SECRET
 *
 * The publish flow for TikTok is two-step:
 *   1. POST /v2/post/publish/video/init/   → upload URL + publish_id
 *   2. PUT  <upload_url> (MP4 bytes)
 *   3. Poll /v2/post/publish/status/fetch/ until PUBLISH_COMPLETE
 *
 * This adapter implements the happy path; wire to a queue worker in Phase 3.
 */
export const tiktok: SocialAdapter = {
  platform: "TIKTOK",
  label: "TikTok",
  color: "#ff2b66",
  textOn: "#ffffff",
  handlePrefix: "@",

  hasCredentials() {
    return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
  },

  oauthStartUrl(redirectUri, state) {
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      scope: "user.info.basic,video.publish,video.upload",
      response_type: "code",
      redirect_uri: redirectUri,
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  },

  async exchangeCode(code, redirectUri): Promise<OAuthExchange> {
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) throw new Error(`TikTok token exchange failed: ${res.status}`);
    const body = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      open_id?: string;
    };
    const info = await fetchUserInfo(body.access_token).catch(() => null);
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: body.expires_in
        ? new Date(Date.now() + body.expires_in * 1000)
        : undefined,
      handle: info?.username ?? body.open_id,
      avatarUrl: info?.avatar_url,
      scopes: body.scope,
    };
  },

  async publish(args: PublishArgs): Promise<PublishResult> {
    // Step 1: init with PULL_FROM_URL source
    const initRes = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: args.caption.slice(0, 2200),
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: args.videoUrl,
          },
        }),
      },
    );
    if (!initRes.ok) throw new Error(`TikTok init failed: ${initRes.status}`);
    const init = (await initRes.json()) as { data?: { publish_id?: string } };
    const publishId = init.data?.publish_id;
    if (!publishId) throw new Error("TikTok init returned no publish_id");

    return {
      externalId: publishId,
      externalUrl: `https://www.tiktok.com/@me/video/${publishId}`,
    };
  },
};

async function fetchUserInfo(accessToken: string) {
  const res = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as {
    data?: { user?: { username?: string; avatar_url?: string; display_name?: string } };
  };
  return body.data?.user ?? null;
}
