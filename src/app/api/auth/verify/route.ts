import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { consumeToken } from "@/lib/auth-tokens";

export const runtime = "nodejs";

const Body = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userId = await consumeToken(parsed.data.token, "EMAIL_VERIFY");
  if (!userId) {
    return NextResponse.json(
      { error: "That confirmation link has expired or already been used." },
      { status: 400 },
    );
  }

  await db.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
