import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasDb } from "@/lib/env";
import {
  createSession,
  getSessionUser,
  hashPassword,
  isBootstrapAdmin,
  normalizeEmail,
} from "@/lib/auth";
import { issueToken, sendVerificationEmail } from "@/lib/auth-tokens";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(200, "That password is too long."),
  name: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  if (!hasDb) return NextResponse.json({ error: "No DB" }, { status: 503 });

  const gate = rateLimit(`signup:${clientIp(req)}`, 5, 60 * 60);
  if (!gate.ok) {
    return tooManyRequests(gate, "Too many accounts from here. Try again later.");
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details" },
      { status: 400 },
    );
  }
  const email = normalizeEmail(parsed.data.email);
  const { password, name } = parsed.data;

  const taken = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const role = isBootstrapAdmin(email) ? "ADMIN" : "USER";
  const current = await getSessionUser();

  // A guest who already made videos keeps them: the same row is upgraded in
  // place rather than a second account being created beside it.
  if (current?.isGuest) {
    const user = await db.user.update({
      where: { id: current.id },
      data: {
        email,
        name: name ?? null,
        passwordHash: hashPassword(password),
        isGuest: false,
        role,
      },
      select: { id: true, email: true, role: true },
    });
    await sendVerification(user.id, user.email);
    return NextResponse.json({ user }, { status: 201 });
  }

  const user = await db.user.create({
    data: {
      email,
      name: name ?? null,
      passwordHash: hashPassword(password),
      role,
    },
    select: { id: true, email: true, role: true },
  });
  await createSession(user.id, req.headers.get("user-agent"));
  await sendVerification(user.id, user.email);
  return NextResponse.json({ user }, { status: 201 });
}

/**
 * Confirmation is sent, never awaited for correctness: a mail outage must not
 * fail a sign-up that has already succeeded.
 */
async function sendVerification(userId: string, email: string) {
  try {
    const token = await issueToken(userId, "EMAIL_VERIFY");
    await sendVerificationEmail(email, token);
  } catch (e) {
    console.warn("[adgen] verification email failed:", e);
  }
}
