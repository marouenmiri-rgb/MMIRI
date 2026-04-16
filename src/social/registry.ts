import { tiktok } from "./tiktok";
import { instagram } from "./instagram";
import { youtube } from "./youtube";
import { x } from "./x";
import type {
  OAuthExchange,
  PublishArgs,
  PublishResult,
  SocialAdapter,
  SocialPlatform,
} from "./types";

const ADAPTERS = {
  TIKTOK: tiktok,
  INSTAGRAM: instagram,
  YOUTUBE: youtube,
  X: x,
} as const;

export const PLATFORMS: SocialPlatform[] = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "X"];

export function adapterFor(platform: SocialPlatform): SocialAdapter {
  return ADAPTERS[platform];
}

export function platformMeta(platform: SocialPlatform) {
  const a = ADAPTERS[platform];
  return {
    platform: a.platform,
    label: a.label,
    color: a.color,
    textOn: a.textOn,
    handlePrefix: a.handlePrefix,
    hasCredentials: a.hasCredentials(),
  };
}

export function allPlatformMeta() {
  return PLATFORMS.map(platformMeta);
}

/**
 * Demo-mode publish: used when a connection was created without real OAuth
 * creds. Returns a plausible external URL so the UI behaves identically,
 * with `demo=1` on the URL so anyone clicking it sees it's a stub.
 */
export function demoPublish(
  platform: SocialPlatform,
  _args: PublishArgs,
): PublishResult {
  const id = `demo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const map: Record<SocialPlatform, string> = {
    TIKTOK: `https://www.tiktok.com/@demo/video/${id}?demo=1`,
    INSTAGRAM: `https://www.instagram.com/reel/${id}?demo=1`,
    YOUTUBE: `https://youtube.com/shorts/${id}?demo=1`,
    X: `https://x.com/i/status/${id}?demo=1`,
  };
  return { externalId: id, externalUrl: map[platform] };
}

export async function publishTo(
  platform: SocialPlatform,
  args: PublishArgs & { demo?: boolean },
): Promise<PublishResult> {
  if (args.demo || !adapterFor(platform).hasCredentials()) {
    return demoPublish(platform, args);
  }
  return adapterFor(platform).publish(args);
}

export function demoExchange(platform: SocialPlatform): OAuthExchange {
  const handles: Record<SocialPlatform, string> = {
    TIKTOK: "adgen.lab",
    INSTAGRAM: "adgen.lab",
    YOUTUBE: "AdGen Lab",
    X: "adgenlab",
  };
  return {
    accessToken: `demo_${platform.toLowerCase()}_token_${Math.random().toString(36).slice(2, 10)}`,
    handle: handles[platform],
    scopes: "demo",
  };
}
