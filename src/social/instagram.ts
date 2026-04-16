import type { OAuthExchange, PublishArgs, PublishResult, SocialAdapter } from "./types";

/**
 * Instagram — Content Publishing API (via Facebook Graph).
 *
 * Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 * Required env vars:
 *   FACEBOOK_APP_ID
 *   FACEBOOK_APP_SECRET
 *
 * Publish flow (Reels):
 *   1. POST /{ig-user-id}/media  (video_url, media_type=REELS, caption) → creation_id
 *   2. Poll /{creation-id}?fields=status_code until FINISHED
 *   3. POST /{ig-user-id}/media_publish (creation_id)
 */
export const instagram: SocialAdapter = {
  platform: "INSTAGRAM",
  label: "Instagram",
  color: "#e94a85",
  textOn: "#ffffff",
  handlePrefix: "@",

  hasCredentials() {
    return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
  },

  oauthStartUrl(redirectUri, state) {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      redirect_uri: redirectUri,
      state,
      scope:
        "instagram_basic,instagram_content_publish,pages_show_list,business_management",
      response_type: "code",
    });
    return `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
  },

  async exchangeCode(code, redirectUri): Promise<OAuthExchange> {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?${params}`,
    );
    if (!res.ok) throw new Error(`Instagram token exchange failed: ${res.status}`);
    const body = (await res.json()) as {
      access_token: string;
      expires_in?: number;
    };
    return {
      accessToken: body.access_token,
      expiresAt: body.expires_in
        ? new Date(Date.now() + body.expires_in * 1000)
        : undefined,
    };
  },

  async publish(args: PublishArgs): Promise<PublishResult> {
    // Resolve the IG business user ID from the access token.
    const meRes = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${args.accessToken}`,
    );
    if (!meRes.ok) throw new Error(`Instagram me/accounts failed: ${meRes.status}`);
    const me = (await meRes.json()) as {
      data?: { id: string; instagram_business_account?: { id: string } }[];
    };
    const igId = me.data?.find((p) => p.instagram_business_account)
      ?.instagram_business_account?.id;
    if (!igId) throw new Error("No Instagram business account linked");

    // 1. Create media container
    const createParams = new URLSearchParams({
      media_type: "REELS",
      video_url: args.videoUrl,
      caption: args.caption,
      access_token: args.accessToken,
    });
    const create = await fetch(
      `https://graph.facebook.com/v18.0/${igId}/media?${createParams}`,
      { method: "POST" },
    );
    if (!create.ok) throw new Error(`Instagram create failed: ${create.status}`);
    const created = (await create.json()) as { id: string };

    // 2. Publish
    const pubParams = new URLSearchParams({
      creation_id: created.id,
      access_token: args.accessToken,
    });
    const pub = await fetch(
      `https://graph.facebook.com/v18.0/${igId}/media_publish?${pubParams}`,
      { method: "POST" },
    );
    if (!pub.ok) throw new Error(`Instagram publish failed: ${pub.status}`);
    const published = (await pub.json()) as { id: string };

    return {
      externalId: published.id,
      externalUrl: `https://www.instagram.com/reel/${published.id}`,
    };
  },
};
