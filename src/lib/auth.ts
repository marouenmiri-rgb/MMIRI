import { db } from "./db";
import { hasDb } from "./env";

const DEMO_EMAIL = "demo@adgen.ai";

/**
 * MVP stub: returns (or creates) a single demo user. Phase 1 replaces with
 * NextAuth session lookup. Routes that call this get `null` when DB isn't
 * configured so the UI can fall back to fixtures.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!hasDb) return null;
  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: "Demo" },
  });
  return user.id;
}
