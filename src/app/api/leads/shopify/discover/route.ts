import { NextResponse } from "next/server";
import { z } from "zod";
import { findShopifyStores } from "@/agents/shopify-finder";

export const runtime = "nodejs";

const Body = z.object({ keyword: z.string().min(2) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const stores = await findShopifyStores(parsed.data.keyword);
  return NextResponse.json({ stores });
}
