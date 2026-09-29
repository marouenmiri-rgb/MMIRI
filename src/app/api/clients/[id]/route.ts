import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";
import { newReportToken } from "@/lib/clients";

export const runtime = "nodejs";

const Patch = z.object({
  name: z.string().min(2).max(80).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  retainerUsd: z.number().min(0).max(1_000_000).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Expected a hex colour like #635BFF")
    .optional(),
  archived: z.boolean().optional(),
  /** Invalidates the old report link and issues a new one. */
  rotateToken: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const owned = await db.client.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const client = await db.client.update({
    where: { id: params.id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.websiteUrl !== undefined ? { websiteUrl: d.websiteUrl || null } : {}),
      ...(d.contactEmail !== undefined
        ? { contactEmail: d.contactEmail || null }
        : {}),
      ...(d.retainerUsd !== undefined
        ? { retainerCents: Math.round(d.retainerUsd * 100) }
        : {}),
      ...(d.accentColor !== undefined ? { accentColor: d.accentColor } : {}),
      ...(d.archived !== undefined ? { archived: d.archived } : {}),
      ...(d.rotateToken ? { reportToken: newReportToken() } : {}),
    },
  });
  return NextResponse.json({ client });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const owned = await db.client.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ads survive the client (Ad.clientId is SetNull) so revenue history and
  // published posts are never destroyed by removing a client record.
  await db.client.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
