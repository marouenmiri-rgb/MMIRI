import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1).default("file:./prisma/dev.db"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
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
 * Local-first default: SQLite at prisma/dev.db. Always true because
 * the fallback is a file on disk — but stays a boolean so code paths
 * that expect a DB check (fixtures vs live) still work if someone
 * explicitly sets DATABASE_URL="" to force fixture-mode.
 */
export const hasDb = Boolean(env.DATABASE_URL);
