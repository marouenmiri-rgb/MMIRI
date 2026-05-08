import type { FitVerdict, PartnerMatch, PartnerSummary } from "./types";

/**
 * Pure deterministic match: pick the partner whose vertical / volume / geo
 * box best contains this brand. We keep it rule-based (not Claude) because
 * the affiliate-roster is small and the trade-offs are explicit.
 */
export function matchPartner(args: {
  verdict: FitVerdict;
  brandVertical: string | null;
  partners: PartnerSummary[];
  affiliateRef?: string | null;
}): PartnerMatch | null {
  const { verdict, brandVertical, partners, affiliateRef } = args;
  if (partners.length === 0) return null;

  const scored = partners
    .map((p) => ({ partner: p, score: scoreMatch(p, verdict, brandVertical) }))
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score <= 0) return null;

  const rationale = buildRationale(top.partner, verdict, brandVertical);
  return {
    partnerId: top.partner.id,
    rationale,
    affiliateLink: applyAffiliateRef(top.partner.affiliateUrl, affiliateRef),
  };
}

function scoreMatch(
  p: PartnerSummary,
  verdict: FitVerdict,
  brandVertical: string | null,
): number {
  let score = 1;
  const v = (brandVertical ?? verdict.vertical ?? "").toLowerCase();

  if (p.vertical && v && p.vertical.toLowerCase().includes(v)) score += 5;
  if (p.vertical === "general") score += 1;

  const orders = verdict.estMonthlyOrders ?? null;
  if (orders !== null) {
    const min = p.minOrdersPerMonth ?? 0;
    const max = p.maxOrdersPerMonth ?? Number.POSITIVE_INFINITY;
    if (orders >= min && orders <= max) score += 4;
    else if (orders < min) score -= 2;
  }

  // Higher commission breaks ties.
  score += p.commissionBps / 1000;

  return score;
}

function buildRationale(
  p: PartnerSummary,
  verdict: FitVerdict,
  brandVertical: string | null,
): string {
  const bits: string[] = [];
  if (p.vertical) bits.push(`${p.vertical} specialist`);
  if (p.geo) bits.push(`${p.geo} coverage`);
  if (p.minOrdersPerMonth || p.maxOrdersPerMonth) {
    bits.push(
      `fits ${p.minOrdersPerMonth ?? 0}-${p.maxOrdersPerMonth ?? "∞"} orders/mo`,
    );
  }
  const v = brandVertical ?? verdict.vertical;
  if (v) bits.push(`brand vertical: ${v}`);
  if (verdict.estMonthlyOrders) {
    bits.push(`brand est. ${verdict.estMonthlyOrders}/mo`);
  }
  return bits.join(" · ");
}

function applyAffiliateRef(
  template: string,
  ref: string | null | undefined,
): string {
  if (!ref) return template;
  if (template.includes("{ref}")) return template.replace("{ref}", ref);
  // Append as a query param if no placeholder is provided.
  try {
    const u = new URL(template);
    u.searchParams.set("ref", ref);
    return u.toString();
  } catch {
    return template;
  }
}
