import { cookies } from "next/headers";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { db } from "./db";
import { hasDb } from "./env";

export const SESSION_COOKIE = "adgen_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  role: string;
  isGuest: boolean;
};

/* ------------------------------------------------------------------ *
 * Passwords
 * ------------------------------------------------------------------ */

/**
 * scrypt with a per-password salt, via node:crypto — no dependency, and the
 * parameters are stored alongside the digest so they can be raised later
 * without invalidating existing passwords.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const N = 16384;
  const key = scryptSync(password, salt, 64, { N, r: 8, p: 1 });
  return `scrypt$${N}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, nRaw, saltRaw, keyRaw] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const salt = Buffer.from(saltRaw, "base64");
    const expected = Buffer.from(keyRaw, "base64");
    const actual = scryptSync(password, salt, expected.length, {
      N: Number(nRaw),
      r: 8,
      p: 1,
    });
    // Constant-time: a length mismatch alone must not short-circuit.
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Sessions
 * ------------------------------------------------------------------ */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Issues a session row and sets the cookie. Returns the raw token. */
export async function createSession(userId: string, userAgent?: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      userAgent: userAgent?.slice(0, 200) ?? null,
    },
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

/** Deletes the current session row and clears the cookie. */
export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }
  cookies().delete(SESSION_COOKIE);
}

/**
 * The signed-in user, or null. Safe to call from server components; it only
 * reads the cookie and never creates anything, which is what keeps one
 * visitor's data out of another's dashboard.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!hasDb) return null;
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session
    .findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            plan: true,
            role: true,
            isGuest: true,
          },
        },
      },
    })
    .catch(() => null);

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
    return null;
  }
  return session.user;
}

/**
 * Backwards-compatible accessor used throughout the app. Every query in the
 * codebase scopes by this id, so returning the session's user is what makes
 * the whole app multi-tenant.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user && user.role === "ADMIN" ? user : null;
}

/**
 * Used only by the generate endpoint, so a visitor can spend their free
 * videos before creating an account. The guest owns its own rows like any
 * other user; signing up later claims the same row rather than starting over.
 */
export async function getOrCreateGuestUserId(
  userAgent?: string | null,
): Promise<string | null> {
  if (!hasDb) return null;
  const existing = await getCurrentUserId();
  if (existing) return existing;

  const user = await db.user.create({
    data: {
      email: `guest_${randomBytes(9).toString("hex")}@guest.adgen.local`,
      isGuest: true,
      name: null,
    },
  });
  await createSession(user.id, userAgent);
  return user.id;
}

/** Normalises an email for storage and lookup. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * The first account matching ADMIN_EMAIL becomes an admin on sign-up. Without
 * it there is no way to reach /admin on a fresh deployment.
 */
export function isBootstrapAdmin(email: string): boolean {
  const configured = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(configured) && normalizeEmail(email) === configured;
}
