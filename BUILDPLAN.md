# AdGen AI — Run locally

Zero cloud. One command.

```bash
git clone <this-repo> && cd MMIRI
git checkout claude/adgen-ai-platform-design-J370m
npm install
npm run dev
```

That's it. Open http://localhost:3000.

## What that command actually does

1. Runs `scripts/local-setup.ts` which:
   - Creates `prisma/dev.db` (SQLite) if it doesn't exist
   - Applies the schema via `prisma db push`
   - Generates the Prisma client
   - Seeds a demo user + sample ads, leads, social connections, and a
     tracking link with attributed revenue so every page is lived-in
     on first load
2. Starts `next dev` on port 3000
3. Boots the in-process publisher scheduler (via
   `instrumentation.ts`) that polls every 60 seconds for scheduled
   posts and publishes any whose `scheduledFor` has passed — no
   external cron needed

## What works out of the box

Everything that doesn't require a third-party API key runs on fixtures
or demo-mode:

- Landing · Dashboard · Generator · Autopilot · Revenue · Pricing · Settings
- Scraper (HTTP-based; any public product page)
- Shopify finder (DuckDuckGo search; no key)
- Social connections (demo mode; "Connect" flips a flag)
- Social publish (demo mode; returns `?demo=1` URLs)
- Revenue Pulse (seeded conversions)
- Variant Lab (needs Claude to generate; see below)
- Pricing + upgrade flow (demo mode flips your subscription directly)

## Unlocking the real stack

Everything below is optional — each feature graceful-degrades without
its key.

```bash
cp .env.example .env
# then edit .env with whichever keys you want to enable
```

| Feature           | Env var(s)                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------- |
| AI agents         | `ANTHROPIC_API_KEY`                                                                          |
| Voiceover         | `ELEVENLABS_API_KEY`                                                                         |
| Video (MP4)       | `ffmpeg` on PATH (system install — `brew install ffmpeg` / `apt-get install ffmpeg`)         |
| Outreach delivery | `RESEND_API_KEY`                                                                             |
| Real billing      | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER` …                       |
| Real TikTok       | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`                                                  |
| Real Instagram    | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`                                                     |
| Real YouTube      | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                                   |
| Real X            | `X_CLIENT_ID`, `X_CLIENT_SECRET`                                                             |
| Shopify webhook   | `SHOPIFY_WEBHOOK_SECRET` (configure a webhook in Shopify admin → `POST /api/webhooks/shopify/orders`) |

## Useful commands

```bash
npm run dev          # setup + dev server
npm run setup        # migrate + seed (safe to re-run)
npm run db:studio    # GUI over the SQLite file
npm run db:reset     # wipe DB + reseed
npm test             # vitest
npm run typecheck    # tsc --noEmit
npm run build        # production build
```

## Upgrading to Postgres later

When you're ready to go multi-user, just change the Prisma datasource
back to `provider = "postgresql"` and set `DATABASE_URL` to your
Postgres URL. The schema was designed to port cleanly.

## Roadmap

- Phase 1 ✓  Local-first MVP (this repo)
- Phase 2 →  Real-time agent event stream (SSE replaces job polling)
- Phase 3 →  Multi-workspace (agency mode)
- Phase 4 →  Meta Ads direct uploader
- Phase 5 →  Trending-hook radar (auto-generate ads from what's winning in your niche)
