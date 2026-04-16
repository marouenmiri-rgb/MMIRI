export type SocialPlatform = "TIKTOK" | "INSTAGRAM" | "YOUTUBE" | "X";

export type OAuthExchange = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  handle?: string;
  avatarUrl?: string;
  scopes?: string;
};

export type PublishArgs = {
  videoUrl: string;
  thumbnailUrl?: string | null;
  caption: string;
  accessToken: string;
  refreshToken?: string | null;
};

export type PublishResult = {
  externalId: string;
  externalUrl: string;
};

export interface SocialAdapter {
  platform: SocialPlatform;
  label: string;
  color: string;        // brand swatch (used for UI accents)
  textOn: string;       // contrast color for text on the swatch
  handlePrefix: string; // "@" or "" depending on platform convention

  /** True when real OAuth creds are configured for this platform. */
  hasCredentials(): boolean;

  /**
   * Build the real OAuth authorize URL. Callers must have verified
   * hasCredentials() first, or use the demo flow instead.
   */
  oauthStartUrl(redirectUri: string, state: string): string;

  /** Exchange an OAuth authorization code for tokens + profile. */
  exchangeCode(code: string, redirectUri: string): Promise<OAuthExchange>;

  /** Publish a video. Returns external post id + URL. */
  publish(args: PublishArgs): Promise<PublishResult>;
}
