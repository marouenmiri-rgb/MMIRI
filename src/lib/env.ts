import { z } from "zod";

// `.env.example` ships keys as "" — treat blank values as unset so optional
// keys degrade gracefully instead of failing validation at boot.
const optional = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional(),
);

const schema = z.object({
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  ANTHROPIC_API_KEY: optional,
  ELEVENLABS_API_KEY: optional,
  RESEND_API_KEY: optional,
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
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
 * Local-first default: SQLite at prisma/dev.db (Prisma resolves `file:`
 * paths relative to schema.prisma). Always true because
 * the fallback is a file on disk — but stays a boolean so code paths
 * that expect a DB check (fixtures vs live) still work if someone
 * explicitly sets DATABASE_URL="" to force fixture-mode.
 */
export const hasDb = Boolean(env.DATABASE_URL);
