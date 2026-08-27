import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";
import { packJson, unpackJson } from "@/lib/json";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(2).max(80),
  productUrls: z.array(z.string().url()).min(1).max(50),
  platforms: z
    .array(z.enum(["TIKTOK", "INSTAGRAM", "YOUTUBE", "X"]))
    .min(1)
    .max(4),
  hookCategories: z
    .array(
      z.enum([
        "PATTERN_INTERRUPT",
        "SPECIFICITY_SHOCK",
        "CURIOSITY_GAP",
        "SOCIAL_PROOF",
        "CONTROVERSY",
        "QUESTION",
        "STORY",
        "DEMO",
      ]),
    )
    .max(8)
    .optional(),
  cadenceHours: z.number().int().min(2).max(168).default(24),
  budgetAdsTotal: z.number().int().min(1).max(1000).optional(),
  enabled: z.boolean().default(true),
});

export async function GET() {
  if (!hasDb) return NextResponse.json({ rules: [] });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ rules: [] });
  const rules = await db.autoPilotRule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rules: rules.map(toClientRule) });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  // Schedule the first run immediately so the user sees an ad show up
  // within minutes of creating the rule.
  const nextRunAt = new Date(Date.now() + 60_000);
  const rule = await db.autoPilotRule.create({
    data: {
      userId,
      name: parsed.data.name,
      productUrls: packJson(parsed.data.productUrls),
      platforms: packJson(parsed.data.platforms),
      hookCategories: packJson(parsed.data.hookCategories ?? []),
      cadenceHours: parsed.data.cadenceHours,
      budgetAdsTotal: parsed.data.budgetAdsTotal,
      enabled: parsed.data.enabled,
      nextRunAt,
    },
  });
  return NextResponse.json({ rule: toClientRule(rule) });
}

/**
 * The JSON-backed columns are TEXT in SQLite; the dashboard expects real
 * arrays, so unpack them at the API boundary.
 */
function toClientRule<T extends {
  productUrls: string;
  platforms: string;
  hookCategories: string | null;
}>(rule: T) {
  return {
    ...rule,
    productUrls: unpackJson<string[]>(rule.productUrls, []),
    platforms: unpackJson<string[]>(rule.platforms, []),
    hookCategories: unpackJson<string[]>(rule.hookCategories, []),
  };
}
