import type { OAuthExchange, PublishArgs, PublishResult, SocialAdapter } from "./types";

/**
 * X (Twitter) — OAuth 2.0 PKCE + media/upload + tweets.
 *
 * Docs: https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/authorization-code
 * Required env vars:
 *   X_CLIENT_ID
 *   X_CLIENT_SECRET
 *
 * Publish flow:
 *   1. POST /2/media/upload (chunked upload) → media_id
 *   2. POST /2/tweets with media.media_ids
 */
export const x: SocialAdapter = {
  platform: "X",
  label: "X",
  color: "#f5f5f7",
  textOn: "#08080c",
  handlePrefix: "@",

  hasCredentials() {
    return Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET);
  },

  oauthStartUrl(redirectUri, state) {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.X_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: "tweet.read tweet.write users.read media.write offline.access",
      state,
      code_challenge: state, // PKCE-lite; Phase 3 switches to S256
      code_challenge_method: "plain",
    });
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  },

  async exchangeCode(code, redirectUri): Promise<OAuthExchange> {
    const basic = Buffer.from(
      `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`,
    ).toString("base64");
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: "verifier", // paired with the plain challenge above
      }),
    });
    if (!res.ok) throw new Error(`X token exchange failed: ${res.status}`);
    const body = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: body.expires_in
        ? new Date(Date.now() + body.expires_in * 1000)
        : undefined,
      scopes: body.scope,
    };
  },

  async publish(args: PublishArgs): Promise<PublishResult> {
    // Fetch the video into memory (small MVP videos < 50MB).
    const videoRes = await fetch(args.videoUrl);
    if (!videoRes.ok) throw new Error(`X source fetch failed: ${videoRes.status}`);
    const video = Buffer.from(await videoRes.arrayBuffer());

    // Single-shot media upload (Phase 3: chunked INIT/APPEND/FINALIZE).
    const form = new FormData();
    form.append(
      "media",
      new Blob([video], { type: "video/mp4" }),
      "ad.mp4",
    );
    form.append("media_category", "tweet_video");

    const upRes = await fetch("https://api.x.com/2/media/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${args.accessToken}` },
      body: form,
    });
    if (!upRes.ok) throw new Error(`X media upload failed: ${upRes.status}`);
    const up = (await upRes.json()) as { data?: { id: string } };
    const mediaId = up.data?.id;
    if (!mediaId) throw new Error("X upload returned no media id");

    const tweetRes = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: args.caption.slice(0, 280),
        media: { media_ids: [mediaId] },
      }),
    });
    if (!tweetRes.ok) throw new Error(`X tweet failed: ${tweetRes.status}`);
    const tweet = (await tweetRes.json()) as { data: { id: string } };
    return {
      externalId: tweet.data.id,
      externalUrl: `https://x.com/i/status/${tweet.data.id}`,
    };
  },
};
