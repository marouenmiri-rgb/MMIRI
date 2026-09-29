import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { getSessionUser } from "@/lib/auth";
import { issueToken, sendVerificationEmail } from "@/lib/auth-tokens";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });

  const user = await getSessionUser();
  if (!user || user.isGuest) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const gate = rateLimit(`resend:${user.id}:${clientIp(req)}`, 3, 15 * 60);
  if (!gate.ok) {
    return tooManyRequests(gate, "Already sent. Check your inbox, then try again shortly.");
  }

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { emailVerifiedAt: true },
  });
  if (row?.emailVerifiedAt) return NextResponse.json({ ok: true, already: true });

  const token = await issueToken(user.id, "EMAIL_VERIFY");
  await sendVerificationEmail(user.email, token);
  return NextResponse.json({ ok: true });
}
