import { db } from "@/lib/db";
import { runAdPipeline } from "@/agents/orchestrator";
import { writeCaptions } from "@/agents/captioner";
import { brandVoiceBlock } from "@/agents/brand-voice";
import { HOOK_TEMPLATES, type HookCategory } from "@/data/hook-templates";
import { createTrackingLink, injectLink } from "@/lib/tracking";
import { publishOne } from "@/social/publisher";
import type { AdScript } from "@/agents/types";
import type { BrandVoice } from "@/agents/brand-voice";
import type { SocialPlatform } from "@/social/types";

const PLATFORMS_ALL: SocialPlatform[] = ["TIKTOK", "INSTAGRAM", "YOUTUBE", "X"];

/**
 * One tick of one AutoPilot rule. Picks a product URL (rotating through the
 * list), picks a hook (weighted by momentum, optionally filtered by category),
 * runs the full ad pipeline, ships it to all connected channels in the rule,
 * and schedules the next tick.
 *
 * Designed to be called by the in-process scheduler. Errors are persisted on
 * the rule row, not thrown, so one bad run doesn't kill autopilot.
 */
export async function runAutoPilotRule(ruleId: string): Promise<{
  ok: boolean;
  adId?: string;
  error?: string;
}> {
  const rule = await db.autoPilotRule.findUnique({ where: { id: ruleId } });
  if (!rule || !rule.enabled) return { ok: false, error: "rule disabled" };

  // Budget cap
  if (rule.budgetAdsTotal != null && rule.adsRun >= rule.budgetAdsTotal) {
    await db.autoPilotRule.update({
      where: { id: rule.id },
      data: { enabled: false, lastError: "budget exhausted" },
    });
    return { ok: false, error: "budget exhausted" };
  }

  try {
    const productUrls = (rule.productUrls as string[]) ?? [];
    if (productUrls.length === 0) throw new Error("no product URLs in rule");
    const productUrl = productUrls[rule.adsRun % productUrls.length];

    const hook = pickHook(rule.hookCategories as HookCategory[] | null);

    const ad = await db.ad.create({
      data: {
        userId: rule.userId,
        productUrl,
        status: "QUEUED",
      },
    });

    await runAdPipeline({
      adId: ad.id,
      productUrl,
      hookHint: hook?.formula,
      userId: rule.userId,
    });

    // Ship to every requested platform that has a live connection.
    const platforms = ((rule.platforms as SocialPlatform[]) ?? PLATFORMS_ALL).filter(
      (p) => PLATFORMS_ALL.includes(p),
    );
    if (platforms.length > 0) {
      await shipAdToPlatforms({
        userId: rule.userId,
        adId: ad.id,
        platforms,
      });
    }

    const nextRunAt = new Date(Date.now() + rule.cadenceHours * 60 * 60 * 1000);
    await db.autoPilotRule.update({
      where: { id: rule.id },
      data: {
        adsRun: { increment: 1 },
        lastRunAt: new Date(),
        nextRunAt,
        lastError: null,
      },
    });

    return { ok: true, adId: ad.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.autoPilotRule.update({
      where: { id: rule.id },
      data: {
        lastError: msg.slice(0, 400),
        // Back off by 1h on error so we don't tight-loop on bad URLs / API quotas.
        nextRunAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return { ok: false, error: msg };
  }
}

function pickHook(categories: HookCategory[] | null) {
  const pool = HOOK_TEMPLATES.filter(
    (h) => !categories || categories.length === 0 || categories.includes(h.category),
  );
  if (pool.length === 0) return null;
  // Weight by momentum so the trending stuff gets shipped more often.
  const total = pool.reduce((s, h) => s + h.momentum, 0);
  let n = Math.random() * total;
  for (const h of pool) {
    n -= h.momentum;
    if (n <= 0) return h;
  }
  return pool[0];
}

async function shipAdToPlatforms(args: {
  userId: string;
  adId: string;
  platforms: SocialPlatform[];
}) {
  const ad = await db.ad.findUnique({ where: { id: args.adId } });
  if (!ad || !ad.scriptJson) return;

  const voiceRow = await db.brandVoice.findUnique({
    where: { userId: args.userId },
  });
  const brandVoice: BrandVoice | null = voiceRow?.tone && voiceRow.audience
    ? {
        name: voiceRow.name ?? undefined,
        tone: voiceRow.tone,
        audience: voiceRow.audience,
        dos: (voiceRow.dosJson as string[] | null) ?? [],
        donts: (voiceRow.dontsJson as string[] | null) ?? [],
        examples:
          (voiceRow.examplesJson as { context: string; copy: string }[] | null) ??
          [],
      }
    : null;
  // brandVoiceBlock is exported to keep the dep alive; the captioner uses it
  // internally via writeCaptions().
  void brandVoiceBlock;

  const captions = await writeCaptions({
    product: { title: ad.productTitle ?? "your product", url: ad.productUrl },
    script: ad.scriptJson as AdScript,
    brandVoice,
  }).catch(() => null);

  const captionFor = (p: SocialPlatform): string => {
    if (!captions) return ad.scriptJson ? (ad.scriptJson as AdScript).hook : "Check this out.";
    const key = p.toLowerCase() as keyof typeof captions;
    return captions[key] ?? (ad.scriptJson as AdScript).hook;
  };

  const conns = await db.socialConnection.findMany({
    where: { userId: args.userId, platform: { in: platforms(args.platforms) } },
  });
  const byPlatform = new Map(conns.map((c) => [c.platform, c]));

  for (const p of args.platforms) {
    const conn = byPlatform.get(p);
    if (!conn) continue;

    const post = await db.socialPost.create({
      data: {
        userId: args.userId,
        connectionId: conn.id,
        adId: ad.id,
        platform: p,
        caption: captionFor(p),
        scheduledFor: new Date(),
      },
    });

    const { link } = await createTrackingLink({
      userId: args.userId,
      adId: ad.id,
      socialPostId: post.id,
      destinationUrl: ad.productUrl,
      platform: p,
      campaign: `autopilot_${ad.id.slice(0, 8)}`,
    });

    await db.socialPost.update({
      where: { id: post.id },
      data: { caption: injectLink(post.caption, link) },
    });
    await publishOne(post.id);
  }
}

// Workaround: Prisma's enum-as-string `in` query needs an explicit string[].
function platforms(p: SocialPlatform[]): string[] {
  return p.slice();
}
