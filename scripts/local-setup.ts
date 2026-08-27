/**
 * One-shot local setup. Runs before `next dev` / `next start`:
 *   1. Apply Prisma migrations against the SQLite file.
 *   2. If the DB is empty, seed a demo user + sample ads + leads +
 *      demo social connections so the dashboards have content from
 *      the first page load.
 *
 * Safe to re-run — all writes are idempotent (upsert / skipDuplicates).
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

async function main() {
  process.env.DATABASE_URL ??= "file:./dev.db";

  // Make sure the directory for the SQLite file exists.
  const url = process.env.DATABASE_URL;
  const fileMatch = url.match(/^file:(.+)$/);
  if (fileMatch) {
    const dir = path.dirname(path.resolve(process.cwd(), fileMatch[1]));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  // Prisma push is faster than migrate for a single-developer SQLite setup
  // and doesn't require keeping a migrations folder in version control.
  console.log("[adgen] applying schema to database…");
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env },
  });

  console.log("[adgen] ensuring client is generated…");
  execSync("npx prisma generate", {
    stdio: "inherit",
    env: { ...process.env },
  });

  // Seed only if the users table is empty.
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    const count = await db.user.count();
    if (count === 0) {
      console.log("[adgen] seeding demo data…");
      await seed(db);
      console.log("[adgen] seed complete.");
    } else {
      console.log(`[adgen] found ${count} user(s); skipping seed.`);
    }
  } finally {
    await db.$disconnect();
  }
}

type DB = InstanceType<typeof import("@prisma/client").PrismaClient>;

async function seed(db: DB) {
  const user = await db.user.upsert({
    where: { email: "demo@adgen.ai" },
    update: {},
    create: { email: "demo@adgen.ai", name: "Demo", plan: "FREE" },
  });

  const ad1 = await db.ad.create({
    data: {
      userId: user.id,
      productUrl: "https://ember.com/products/ember-travel-mug-2",
      productTitle: "Ember Travel Mug 2",
      status: "READY",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400",
      scriptJson: JSON.stringify({
        hook: "Cold coffee ruins your morning. Here's the fix.",
        problem:
          "You take one sip, get pulled into a meeting, and by the time you look back your $6 latte is cold.",
        solution:
          "Ember Mug 2 holds your drink at the exact temperature you choose for 3 hours.",
        cta: "Tap the link. First sip's still hot at noon.",
        fullScript:
          "Cold coffee ruins your morning. You take one sip, get pulled into a meeting, and your $6 latte is ice. Ember Mug 2 holds it at the exact temp you pick — for three hours. Tap the link. First sip's still hot at noon.",
      }),
    },
  });

  await db.ad.create({
    data: {
      userId: user.id,
      productUrl: "https://www.allbirds.com/products/mens-wool-runners",
      productTitle: "Allbirds Wool Runner",
      status: "RENDERING",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
    },
  });

  await db.lead.createMany({
    data: [
      {
        userId: user.id,
        storeName: "Highland & Pine",
        websiteUrl: "https://highlandpine.co",
        email: "hello@highlandpine.co",
        source: "seed",
      },
      {
        userId: user.id,
        storeName: "Dune Goods",
        websiteUrl: "https://dunegoods.myshopify.com",
        source: "seed",
      },
    ],
  });

  // Demo social connections (no real tokens — publish path will run in
  // demo mode, returning plausible ?demo=1 URLs).
  await db.socialConnection.createMany({
    data: [
      {
        userId: user.id,
        platform: "TIKTOK",
        handle: "adgen.lab",
        accessToken: "demo_tiktok_token",
        demo: true,
      },
      {
        userId: user.id,
        platform: "INSTAGRAM",
        handle: "adgen.lab",
        accessToken: "demo_instagram_token",
        demo: true,
      },
      {
        userId: user.id,
        platform: "X",
        handle: "adgenlab",
        accessToken: "demo_x_token",
        demo: true,
      },
    ],
  });

  // A pre-published post with a tracking link + a conversion, so the
  // Revenue Pulse shows real numbers on first load.
  const link = await db.trackingLink.create({
    data: {
      code: "seedxx1",
      userId: user.id,
      adId: ad1.id,
      destinationUrl: `${ad1.productUrl}?utm_source=adgen_tiktok&utm_medium=social&utm_campaign=adgen-lab&utm_content=seedxx1`,
      utmSource: "adgen_tiktok",
      utmMedium: "social",
      utmCampaign: "adgen-lab",
      utmContent: "seedxx1",
      clicks: 142,
      conversions: 3,
      revenueCents: 14700,
    },
  });

  await db.conversion.createMany({
    data: [
      {
        userId: user.id,
        trackingLinkId: link.id,
        externalOrderId: "seed-1001",
        revenueCents: 4900,
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
      },
      {
        userId: user.id,
        trackingLinkId: link.id,
        externalOrderId: "seed-1002",
        revenueCents: 4900,
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 9),
      },
      {
        userId: user.id,
        trackingLinkId: link.id,
        externalOrderId: "seed-1003",
        revenueCents: 4900,
        occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
      },
    ],
  });
}

main().catch((e) => {
  console.error("[adgen] local-setup failed:", e);
  process.exit(1);
});
