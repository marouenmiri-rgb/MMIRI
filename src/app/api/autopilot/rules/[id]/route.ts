import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { hasDb } from "@/lib/env";
import { runAutoPilotRule } from "@/autopilot/runner";

export const runtime = "nodejs";
export const maxDuration = 300;

const Patch = z.object({
  enabled: z.boolean().optional(),
  name: z.string().optional(),
  cadenceHours: z.number().int().min(2).max(168).optional(),
  run: z.literal(true).optional(),
});

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

  const rule = await db.autoPilotRule.findFirst({
    where: { id: params.id, userId },
  });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // "Run now" — kick off a one-shot tick out-of-band of the schedule.
  if (parsed.data.run) {
    runAutoPilotRule(rule.id).catch(() => {});
    return NextResponse.json({ triggered: true });
  }

  const updated = await db.autoPilotRule.update({
    where: { id: rule.id },
    data: {
      ...(parsed.data.enabled !== undefined
        ? {
            enabled: parsed.data.enabled,
            nextRunAt: parsed.data.enabled
              ? rule.nextRunAt ?? new Date(Date.now() + 60_000)
              : null,
          }
        : {}),
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.cadenceHours
        ? { cadenceHours: parsed.data.cadenceHours }
        : {}),
    },
  });
  return NextResponse.json({ rule: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 });
  const { count } = await db.autoPilotRule.deleteMany({
    where: { id: params.id, userId },
  });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
