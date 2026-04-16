/**
 * Next.js instrumentation hook — runs once per server boot.
 *
 * We use it to start the in-process publisher scheduler. Every 60s it
 * picks up any SocialPost whose `scheduledFor` has passed and calls
 * publishOne() on it. This removes the need for an external cron or
 * Vercel Cron when self-hosting.
 *
 * Dev-mode hot reloads re-run this module; the global guard keeps us
 * from stacking intervals on every save.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const g = globalThis as unknown as {
    __adgenPublisherInterval?: NodeJS.Timeout;
  };
  if (g.__adgenPublisherInterval) return;

  const { db } = await import("./src/lib/db");
  const { publishOne } = await import("./src/social/publisher");

  async function tick() {
    if (!process.env.DATABASE_URL) return;
    try {
      const due = await db.socialPost.findMany({
        where: { status: "SCHEDULED", scheduledFor: { lte: new Date() } },
        take: 25,
        orderBy: { scheduledFor: "asc" },
        select: { id: true },
      });
      if (due.length === 0) return;
      for (const p of due) {
        await publishOne(p.id);
      }
    } catch (e) {
      // Keep the scheduler alive across transient errors.
      console.error("[scheduler]", e instanceof Error ? e.message : e);
    }
  }

  g.__adgenPublisherInterval = setInterval(tick, 60_000);
  // Run once on boot so posts scheduled in the past publish immediately.
  setTimeout(tick, 2_000);

  console.log("[adgen] in-process publisher scheduler started (60s interval)");
}
