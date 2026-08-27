import { NextResponse } from "next/server";
import { z } from "zod";
import { findShopifyStores } from "@/agents/shopify-finder";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";
import { packJson } from "@/lib/json";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  keyword: z.string().min(2).max(120),
  limit: z.number().int().min(1).max(25).default(10),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const stores = await findShopifyStores(parsed.data.keyword, {
    limit: parsed.data.limit,
  });

  if (!hasDb) return NextResponse.json({ stores, saved: 0 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ stores, saved: 0 });

  let saved = 0;
  for (const s of stores) {
    try {
      await db.lead.upsert({
        where: {
          userId_websiteUrl: { userId, websiteUrl: s.websiteUrl },
        },
        update: {
          storeName: s.storeName,
          email: s.email ?? null,
          socialsJson: packJson(s.socials),
        },
        create: {
          userId,
          storeName: s.storeName,
          websiteUrl: s.websiteUrl,
          email: s.email ?? null,
          socialsJson: packJson(s.socials),
          source: s.source ?? "duckduckgo",
        },
      });
      saved += 1;
    } catch {
      // skip duplicates / DB hiccups; surface count only.
    }
  }
  return NextResponse.json({ stores, saved });
}
