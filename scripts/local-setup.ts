/**
 * One-shot local setup. Runs before `next dev` / `next start`:
 *   1. Apply the Prisma schema to the SQLite file.
 *   2. Generate the Prisma client.
 *
 * It writes no rows. Dashboards start empty and fill with real work, so a
 * number on screen is never one this script invented.
 *
 * Safe to re-run.
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

  // No demo data is written. The app starts empty so every number on screen
  // is one you actually produced; the user row is created on first request.
  console.log("[adgen] ready — database is empty until you generate an ad.");
}

main().catch((e) => {
  console.error("[adgen] local-setup failed:", e);
  process.exit(1);
});
