/**
 * Next.js instrumentation hook — runs once per server boot.
 *
 * Starts two in-process loops:
 *   1. Publisher: every 60s, ships any SocialPost whose scheduledFor has passed.
 *   2. AutoPilot: every 60s, runs any AutoPilotRule whose nextRunAt has passed.
 *
 * Both replace the need for an external cron when self-hosting. Hot-reload
 * guards prevent intervals from stacking across dev rebuilds.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const g = globalThis as unknown as {
    __adgenPublisherInterval?: NodeJS.Timeout;
    __adgenAutopilotInterval?: NodeJS.Timeout;
  };

  const { db } = await import("./src/lib/db");
  const { publishOne } = await import("./src/social/publisher");
  const { runAutoPilotRule } = await import("./src/autopilot/runner");

  async function tickPublisher() {
    if (!process.env.DATABASE_URL) return;
    try {
      const due = await db.socialPost.findMany({
        where: { status: "SCHEDULED", scheduledFor: { lte: new Date() } },
        take: 25,
        orderBy: { scheduledFor: "asc" },
        select: { id: true },
      });
      for (const p of due) await publishOne(p.id);
    } catch (e) {
      console.error("[publisher]", e instanceof Error ? e.message : e);
    }
  }

  async function tickAutoPilot() {
    if (!process.env.DATABASE_URL) return;
    try {
      const due = await db.autoPilotRule.findMany({
        where: {
          enabled: true,
          nextRunAt: { lte: new Date() },
        },
        take: 5,
        orderBy: { nextRunAt: "asc" },
        select: { id: true },
      });
      for (const r of due) await runAutoPilotRule(r.id);
    } catch (e) {
      console.error("[autopilot]", e instanceof Error ? e.message : e);
    }
  }

  if (!g.__adgenPublisherInterval) {
    g.__adgenPublisherInterval = setInterval(tickPublisher, 60_000);
    setTimeout(tickPublisher, 2_000);
    console.log("[adgen] publisher scheduler started (60s)");
  }
  if (!g.__adgenAutopilotInterval) {
    g.__adgenAutopilotInterval = setInterval(tickAutoPilot, 60_000);
    setTimeout(tickAutoPilot, 5_000);
    console.log("[adgen] autopilot scheduler started (60s)");
  }
}
