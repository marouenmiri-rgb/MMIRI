import { randomBytes, createHash } from "node:crypto";
import { db } from "./db";
import { env } from "./env";
import { sendEmail } from "./email";

export type TokenKind = "PASSWORD_RESET" | "EMAIL_VERIFY";

const TTL_MINUTES: Record<TokenKind, number> = {
  PASSWORD_RESET: 60,
  EMAIL_VERIFY: 60 * 24 * 7,
};

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a single-use link token. Any unused token of the same kind is
 * dropped first, so the most recent email is the only one that works — a
 * user who clicks "resend" twice can't be confused by which link is live.
 */
export async function issueToken(userId: string, kind: TokenKind) {
  await db.authToken.deleteMany({ where: { userId, kind, usedAt: null } });

  const token = randomBytes(32).toString("base64url");
  await db.authToken.create({
    data: {
      tokenHash: hash(token),
      kind,
      userId,
      expiresAt: new Date(Date.now() + TTL_MINUTES[kind] * 60_000),
    },
  });
  return token;
}

/**
 * Validates and burns a token in one step. Returns the userId, or null for
 * anything unusable: unknown, wrong kind, already used, or expired.
 */
export async function consumeToken(
  token: string,
  kind: TokenKind,
): Promise<string | null> {
  const row = await db.authToken
    .findUnique({ where: { tokenHash: hash(token) } })
    .catch(() => null);

  if (!row || row.kind !== kind || row.usedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  // Mark used before acting on it, and only if it is still unused, so two
  // concurrent submissions of the same link cannot both succeed.
  const burned = await db.authToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (burned.count !== 1) return null;

  return row.userId;
}

function appUrl(path: string) {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}${path}`;
}

/**
 * Sends a link, and falls back to the server log when no mail provider is
 * configured — so password reset is usable in local development instead of
 * silently doing nothing.
 */
async function deliver(to: string, subject: string, text: string, link: string) {
  const res = await sendEmail({
    to,
    from: env.MAIL_FROM,
    subject,
    text,
  });

  if (!res.ok) {
    console.warn(
      `[adgen] email not sent (${res.reason}). Link for ${to}:\n  ${link}`,
    );
  }
  return res;
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const link = appUrl(`/reset?token=${encodeURIComponent(token)}`);
  return deliver(
    to,
    "Reset your AdGen password",
    [
      "Someone asked to reset the password on this AdGen account.",
      "",
      "Open this link to choose a new one. It works once and expires in an hour:",
      link,
      "",
      "If this wasn't you, ignore this email — nothing has changed.",
    ].join("\n"),
    link,
  );
}

export async function sendVerificationEmail(to: string, token: string) {
  const link = appUrl(`/verify?token=${encodeURIComponent(token)}`);
  return deliver(
    to,
    "Confirm your email for AdGen",
    [
      "Welcome to AdGen.",
      "",
      "Confirm this address so we can reach you about your account:",
      link,
      "",
      "The link expires in a week.",
    ].join("\n"),
    link,
  );
}
