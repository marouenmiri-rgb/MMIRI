import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";

export const runtime = "nodejs";

const Patch = z.object({
  winner: z.boolean().optional(),
  retired: z.boolean().optional(),
});

/**
 * PATCH /api/variants/:id    promote winner / retire losers
 *
 * Setting winner=true on a variant atomically un-winners every other
 * variant on the same ad, so exactly one variant is crowned at a time.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const parsed = Patch.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });

  const variant = await db.adVariant.findFirst({
    where: { id: params.id, userId },
    select: { id: true, adId: true },
  });
  if (!variant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ops = [];
  if (parsed.data.winner === true) {
    ops.push(
      db.adVariant.updateMany({
        where: { adId: variant.adId, id: { not: variant.id } },
        data: { winner: false },
      }),
    );
  }
  ops.push(
    db.adVariant.update({
      where: { id: variant.id },
      data: {
        ...(parsed.data.winner !== undefined ? { winner: parsed.data.winner } : {}),
        ...(parsed.data.retired !== undefined ? { retired: parsed.data.retired } : {}),
      },
    }),
  );
  await db.$transaction(ops);
  return NextResponse.json({ ok: true });
}
