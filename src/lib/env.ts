import { z } from "zod";

/**
 * `.env.example` ships the optional keys as empty strings, and an unset shell
 * variable also arrives as `""`. Both mean "not configured", so collapse them
 * to undefined before validating — otherwise every fresh clone dies at import
 * time on a key the app is designed to run without.
 */
const blankAsUndefined = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), inner);

const schema = z.object({
  // No `.min(1)`: an explicit empty DATABASE_URL is the documented way to
  // force fixture-mode (see `hasDb` below), so it must survive validation.
  DATABASE_URL: z.string().default("file:./dev.db"),
  ANTHROPIC_API_KEY: blankAsUndefined(z.string().min(1).optional()),
  ELEVENLABS_API_KEY: blankAsUndefined(z.string().optional()),
  RESEND_API_KEY: blankAsUndefined(z.string().optional()),
  NEXT_PUBLIC_APP_URL: blankAsUndefined(
    z.string().default("http://localhost:3000"),
  ),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const hasClaude = Boolean(env.ANTHROPIC_API_KEY);

/**
 * Local-first default: SQLite at prisma/dev.db. Always true because
 * the fallback is a file on disk — but stays a boolean so code paths
 * that expect a DB check (fixtures vs live) still work if someone
 * explicitly sets DATABASE_URL="" to force fixture-mode.
 */
export const hasDb = Boolean(env.DATABASE_URL);
