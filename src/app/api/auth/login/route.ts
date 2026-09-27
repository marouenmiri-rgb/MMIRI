import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { createSession, normalizeEmail, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  // One message for every failure below, so the response never reveals
  // whether an address has an account.
  const reject = () =>
    NextResponse.json(
      { error: "That email and password don't match." },
      { status: 401 },
    );

  if (!parsed.success) return reject();

  const user = await db.user.findUnique({
    where: { email: normalizeEmail(parsed.data.email) },
    select: { id: true, passwordHash: true, isGuest: true },
  });
  if (!user?.passwordHash || user.isGuest) return reject();
  if (!verifyPassword(parsed.data.password, user.passwordHash)) return reject();

  await db.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });
  await createSession(user.id, req.headers.get("user-agent"));
  return NextResponse.json({ ok: true });
}
