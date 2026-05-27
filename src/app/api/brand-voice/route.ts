import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasClaude, hasDb } from "@/lib/env";
import { extractBrandVoice } from "@/agents/brand-voice";

export const runtime = "nodejs";
export const maxDuration = 90;

const SaveBody = z.object({
  action: z.literal("save").optional().default("save"),
  name: z.string().optional(),
  tone: z.string().min(2),
  audience: z.string().min(2),
  dos: z.array(z.string()).min(1).max(8),
  donts: z.array(z.string()).max(6),
  examples: z
    .array(z.object({ context: z.string(), copy: z.string() }))
    .min(1)
    .max(4),
  sourceUrl: z.string().url().optional(),
});

const ExtractBody = z.object({
  action: z.literal("extract"),
  url: z.string().url().optional(),
  rawCopy: z.string().min(20).optional(),
  name: z.string().optional(),
});

export async function GET() {
  if (!hasDb) return NextResponse.json({ voice: null });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ voice: null });
  const row = await db.brandVoice.findUnique({ where: { userId } });
  return NextResponse.json({ voice: row });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  if (body.action === "extract") {
    const parsed = ExtractBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    if (!hasClaude) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY required for extraction" },
        { status: 503 },
      );
    }
    let rawCopy = parsed.data.rawCopy ?? "";
    if (parsed.data.url && !rawCopy) {
      rawCopy = await scrapeForCopy(parsed.data.url);
    }
    if (!rawCopy || rawCopy.length < 80) {
      return NextResponse.json(
        { error: "Couldn't find enough copy at that URL — paste a sample manually." },
        { status: 422 },
      );
    }
    const voice = await extractBrandVoice({
      sourceUrl: parsed.data.url,
      rawCopy,
      hintedName: parsed.data.name,
    });
    return NextResponse.json({ voice });
  }

  const parsed = SaveBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const saved = await db.brandVoice.upsert({
    where: { userId },
    update: {
      name: parsed.data.name ?? null,
      tone: parsed.data.tone,
      audience: parsed.data.audience,
      dosJson: parsed.data.dos as object,
      dontsJson: parsed.data.donts as object,
      examplesJson: parsed.data.examples as object,
      sourceUrl: parsed.data.sourceUrl ?? null,
    },
    create: {
      userId,
      name: parsed.data.name ?? null,
      tone: parsed.data.tone,
      audience: parsed.data.audience,
      dosJson: parsed.data.dos as object,
      dontsJson: parsed.data.donts as object,
      examplesJson: parsed.data.examples as object,
      sourceUrl: parsed.data.sourceUrl ?? null,
    },
  });
  return NextResponse.json({ voice: saved });
}

export async function DELETE() {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });
  await db.brandVoice.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}

async function scrapeForCopy(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AdGenBot/0.1; +https://adgen.ai)",
        Accept: "text/html",
      },
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip tags + scripts/styles + collapse whitespace.
    const clean = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return clean.slice(0, 12_000);
  } catch {
    return "";
  }
}
