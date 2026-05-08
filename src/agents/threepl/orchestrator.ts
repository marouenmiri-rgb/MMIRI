import { findShopifyStores } from "@/agents/shopify-finder";
import { writeAffiliateEmail } from "./affiliate-outreach";
import { inspectBrand } from "./brand-inspector";
import { scoreBrandFit } from "./fit-scorer";
import { expandNiche } from "./niche-expander";
import { matchPartner } from "./partner-matcher";
import type {
  AffiliateEmail,
  CandidateBrand,
  FitVerdict,
  PartnerMatch,
  PartnerSummary,
} from "./types";
import { ddgSearch, safeOrigin } from "./web-search";

export type ThreePLPipelineLead = {
  brand: CandidateBrand;
  verdict: FitVerdict;
  match: PartnerMatch | null;
  matchedPartner: PartnerSummary | null;
  email: AffiliateEmail | null;
};

export type ThreePLPipelineResult = {
  niche: string;
  queries: string[];
  candidatesScanned: number;
  leads: ThreePLPipelineLead[];
};

/**
 * Discover-score-match-pitch pipeline.
 *
 * 1. Claude expands the niche into search queries.
 * 2. Each query is run in parallel against DDG; we also reuse the existing
 *    Shopify finder to seed extra candidates.
 * 3. Each unique origin is fetched and parsed into a CandidateBrand.
 * 4. Brands above `minFitScore` get matched to a partner and a draft email.
 *
 * Returns leads sorted by fit score (highest first). Steps are isolated so
 * a single failed brand inspection or LLM call never sinks the whole run.
 */
export async function runThreePLPipeline(args: {
  niche: string;
  partners: PartnerSummary[];
  affiliateRef?: string | null;
  senderName?: string;
  limit?: number;
  minFitScore?: number;
}): Promise<ThreePLPipelineResult> {
  const limit = args.limit ?? 10;
  const minFit = args.minFitScore ?? 50;
  const senderName = args.senderName ?? "your friend";

  const expanded = await expandNiche(args.niche);
  const queries = expanded.queries.slice(0, 5);

  const urlSets = await Promise.all([
    ...queries.map((q) => ddgSearch(q, limit * 3).catch(() => [])),
    findShopifyStores(args.niche, { limit: Math.min(limit, 8) })
      .then((stores) => stores.map((s) => s.websiteUrl))
      .catch(() => [] as string[]),
  ]);

  const seenOrigins = new Set<string>();
  const dedupedUrls: string[] = [];
  for (const list of urlSets) {
    for (const url of list) {
      const origin = safeOrigin(url);
      if (!origin || seenOrigins.has(origin)) continue;
      seenOrigins.add(origin);
      dedupedUrls.push(origin);
    }
  }

  const candidateCap = limit * 4;
  const sliced = dedupedUrls.slice(0, candidateCap);
  const inspected = await mapWithConcurrency(sliced, 4, (url) =>
    inspectBrand(url).catch(() => null),
  );
  const candidates = inspected.filter((b): b is CandidateBrand => Boolean(b));

  const scored = await mapWithConcurrency(candidates, 3, async (brand) => {
    const verdict = await scoreBrandFit(brand).catch(() => null);
    return verdict ? { brand, verdict } : null;
  });

  const qualified = scored
    .filter(
      (x): x is { brand: CandidateBrand; verdict: FitVerdict } =>
        Boolean(x) && x!.verdict.score >= minFit,
    )
    .sort((a, b) => b.verdict.score - a.verdict.score)
    .slice(0, limit);

  const leads: ThreePLPipelineLead[] = await mapWithConcurrency(
    qualified,
    3,
    async ({ brand, verdict }) => {
      const match = matchPartner({
        verdict,
        brandVertical: brand.signals.vertical,
        partners: args.partners,
        affiliateRef: args.affiliateRef ?? null,
      });
      const matchedPartner =
        (match && args.partners.find((p) => p.id === match.partnerId)) ?? null;

      let email: AffiliateEmail | null = null;
      if (match && matchedPartner) {
        email = await writeAffiliateEmail({
          brand,
          verdict,
          partner: matchedPartner,
          affiliateLink: match.affiliateLink,
          senderName,
        }).catch(() => null);
      }

      return { brand, verdict, match, matchedPartner, email };
    },
  );

  return {
    niche: args.niche,
    queries,
    candidatesScanned: candidates.length,
    leads,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = new Array(Math.min(concurrency, items.length))
    .fill(0)
    .map(async () => {
      while (cursor < items.length) {
        const i = cursor++;
        out[i] = await fn(items[i]);
      }
    });
  await Promise.all(workers);
  return out;
}
