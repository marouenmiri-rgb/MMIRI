import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";
import { loadClientSummaries, newReportToken } from "@/lib/clients";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().min(2).max(80),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  // Dollars on the wire, cents in the database.
  retainerUsd: z.number().min(0).max(1_000_000).default(0),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Expected a hex colour like #635BFF")
    .default("#635BFF"),
});

export async function GET() {
  if (!hasDb) return NextResponse.json({ clients: [] });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ clients: [] });
  return NextResponse.json({ clients: await loadClientSummaries(userId) });
}

export async function POST(req: Request) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }
  const { name, websiteUrl, contactEmail, retainerUsd, accentColor } = parsed.data;

  const existing = await db.client.findFirst({ where: { userId, name } });
  if (existing) {
    return NextResponse.json(
      { error: `You already have a client called "${name}".` },
      { status: 409 },
    );
  }

  const client = await db.client.create({
    data: {
      userId,
      name,
      websiteUrl: websiteUrl || null,
      contactEmail: contactEmail || null,
      retainerCents: Math.round(retainerUsd * 100),
      accentColor,
      reportToken: newReportToken(),
    },
  });
  return NextResponse.json({ client }, { status: 201 });
}
