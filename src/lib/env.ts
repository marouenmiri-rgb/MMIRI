import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1).default("file:./prisma/dev.db"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  THREEPL_AFFILIATE_REF: z.string().optional(),
  THREEPL_SENDER_NAME: z.string().optional(),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  THREEPL_AFFILIATE_REF: process.env.THREEPL_AFFILIATE_REF,
  THREEPL_SENDER_NAME: process.env.THREEPL_SENDER_NAME,
});

export const hasClaude = Boolean(env.ANTHROPIC_API_KEY);

/**
 * Local-first default: SQLite at prisma/dev.db. Always true because
 * the fallback is a file on disk — but stays a boolean so code paths
 * that expect a DB check (fixtures vs live) still work if someone
 * explicitly sets DATABASE_URL="" to force fixture-mode.
 *
 * Set DEMO_MODE=1 to force fixtures everywhere — useful when the Prisma
 * client hasn't been generated yet (e.g. fresh checkout / preview deploy)
 * so dashboard pages render demo data instead of crashing.
 */
export const hasDb =
  Boolean(env.DATABASE_URL) && process.env.DEMO_MODE !== "1";
