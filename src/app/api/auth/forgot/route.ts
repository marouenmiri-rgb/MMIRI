import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { normalizeEmail } from "@/lib/auth";
import { issueToken, sendPasswordResetEmail } from "@/lib/auth-tokens";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });

  const gate = rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60);
  if (!gate.ok) {
    return tooManyRequests(gate, "Too many reset requests. Try again shortly.");
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));

  // Always the same answer. Whether an address has an account is not
  // something this endpoint should be willing to confirm.
  const ok = NextResponse.json({
    ok: true,
    message: "If that address has an account, a reset link is on its way.",
  });
  if (!parsed.success) return ok;

  const user = await db.user.findUnique({
    where: { email: normalizeEmail(parsed.data.email) },
    select: { id: true, email: true, isGuest: true, passwordHash: true },
  });
  // Guests have no password to reset, so there is nothing to send.
  if (!user || user.isGuest || !user.passwordHash) return ok;

  const token = await issueToken(user.id, "PASSWORD_RESET");
  await sendPasswordResetEmail(user.email, token);
  return ok;
}
