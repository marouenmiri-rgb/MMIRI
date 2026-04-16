import type { OAuthExchange, PublishArgs, PublishResult, SocialAdapter } from "./types";

/**
 * YouTube (Shorts) — Data API v3 videos.insert.
 *
 * Docs: https://developers.google.com/youtube/v3/docs/videos/insert
 * Required env vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *
 * videos.insert accepts a resumable upload; for our MVP we fetch the MP4
 * and stream it to the upload endpoint in one shot. Phase 3 switches to
 * chunked resumable upload for large files.
 */
export const youtube: SocialAdapter = {
  platform: "YOUTUBE",
  label: "YouTube",
  color: "#ff3b3b",
  textOn: "#ffffff",
  handlePrefix: "",

  hasCredentials() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  },

  oauthStartUrl(redirectUri, state) {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: "https://www.googleapis.com/auth/youtube.upload",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async exchangeCode(code, redirectUri): Promise<OAuthExchange> {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`YouTube token exchange failed: ${res.status}`);
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
    const src = await fetch(args.videoUrl);
    if (!src.ok) throw new Error(`YouTube source fetch failed: ${src.status}`);
    const video = Buffer.from(await src.arrayBuffer());

    const metadata = {
      snippet: {
        title: args.caption.split("\n")[0].slice(0, 100),
        description: args.caption,
        tags: ["Shorts"],
      },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    };

    const boundary = `adgen-${Date.now()}`;
    const parts = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      JSON.stringify(metadata),
      `--${boundary}`,
      "Content-Type: video/mp4",
      "",
    ].join("\r\n");
    const tail = `\r\n--${boundary}--`;
    const body = Buffer.concat([
      Buffer.from(parts + "\r\n"),
      video,
      Buffer.from(tail),
    ]);

    const res = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );
    if (!res.ok) throw new Error(`YouTube upload failed: ${res.status}`);
    const published = (await res.json()) as { id: string };
    return {
      externalId: published.id,
      externalUrl: `https://youtube.com/shorts/${published.id}`,
    };
  },
};
