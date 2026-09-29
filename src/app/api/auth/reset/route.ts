import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { createSession, hashPassword } from "@/lib/auth";
import { consumeToken } from "@/lib/auth-tokens";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

export async function POST(req: Request) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });

  const gate = rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60);
  if (!gate.ok) return tooManyRequests(gate, "Too many attempts. Try again shortly.");

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const userId = await consumeToken(parsed.data.token, "PASSWORD_RESET");
  if (!userId) {
    return NextResponse.json(
      { error: "That reset link has expired or already been used." },
      { status: 400 },
    );
  }

  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashPassword(parsed.data.password),
      // Reaching the inbox proves the address, so confirm it here too.
      emailVerifiedAt: new Date(),
    },
  });

  // Whoever knew the old password is signed out everywhere. This is the point
  // of a reset when an account may already be compromised.
  await db.session.deleteMany({ where: { userId } });
  await createSession(userId, req.headers.get("user-agent"));

  return NextResponse.json({ ok: true });
}
