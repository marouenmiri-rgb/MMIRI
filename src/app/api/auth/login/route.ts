import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import { createSession, normalizeEmail, verifyPassword } from "@/lib/auth";
import {
  clientIp,
  rateLimit,
  rateLimitReset,
  tooManyRequests,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });

  // Two limits, because either alone is weak. The address limit stops one
  // machine grinding through passwords; the account limit stops a spread-out
  // attack on a single mailbox from many addresses.
  const ip = clientIp(req);
  const byIp = rateLimit(`login:ip:${ip}`, 10, 15 * 60);
  if (!byIp.ok) {
    return tooManyRequests(byIp, "Too many sign-in attempts. Try again shortly.");
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));

  if (parsed.success) {
    const byAccount = rateLimit(
      `login:acct:${normalizeEmail(parsed.data.email)}`,
      10,
      15 * 60,
    );
    if (!byAccount.ok) {
      return tooManyRequests(
        byAccount,
        "Too many sign-in attempts for this account. Try again shortly.",
      );
    }
  }

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

  // A correct password clears the counters, so an honest user who mistyped a
  // few times isn't left throttled.
  rateLimitReset(`login:ip:${ip}`);
  rateLimitReset(`login:acct:${normalizeEmail(parsed.data.email)}`);

  await db.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  });
  await createSession(user.id, req.headers.get("user-agent"));
  return NextResponse.json({ ok: true });
}
