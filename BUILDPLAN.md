# AdGen AI — Build Plan

A pragmatic, week-by-week plan to take AdGen AI from this scaffold to paying customers.
Each phase ends with something a user can actually try.

---

## Phase 0 — Scaffold (this commit)

- [x] Next.js 14 + TypeScript + Tailwind set up
- [x] Prisma schema for users, ads, leads, campaigns, outreach, jobs
- [x] Claude client + env validation
- [x] Agent modules (scraper, copywriter, creative director, video, outreach)
- [x] Orchestrator that chains agents into one job
- [x] API routes: `/api/ads/generate`, `/api/ads/:id`, `/api/leads`, `/api/outreach/send`
- [x] Dashboard shell + 5 pages with Stripe/Apple-style UI

## Phase 1 — Working MVP (week 1)

- [ ] Hook `.env` to a real Postgres (Neon / Supabase) and run `prisma migrate dev`
- [ ] Add `ANTHROPIC_API_KEY` and run `/generator` end-to-end on a real product URL
- [ ] Replace scraper stub with Playwright running on a serverless-friendly runtime
      (Browserless, Bright Data, or a small Fly.io worker)
- [ ] Persist scraped images to S3 / R2
- [ ] Basic auth (NextAuth email magic link)
- [ ] Ship to Vercel, share a demo link

## Phase 2 — Real video output (week 2)

- [ ] Voiceover via ElevenLabs; store MP3 in object storage
- [ ] FFmpeg render worker (Fly.io machine or Railway):
      image slideshow + Ken Burns + subtitles + voiceover → MP4
- [ ] Job queue with BullMQ + Redis; dashboard polls job status
- [ ] Add "regenerate script" and "swap scene" controls

## Phase 3 — Leads + Outreach (week 3)

- [ ] Shopify finder: keyword → Google / Bing SERP → filter `cdn.shopify.com` +
      `powered by Shopify` footer → extract email/socials from contact pages
- [ ] Lead dedup + enrichment (domain, country, traffic estimate)
- [ ] Campaign builder: pick ad + lead segment → generate personalized emails
- [ ] Resend integration + open/reply webhooks
- [ ] Follow-up sequencer (day 3, day 7) with reply detection

## Phase 4 — Monetization (week 4)

- [ ] Stripe billing (Starter / Pro / Agency tiers)
- [ ] Usage metering per ad generated / email sent
- [ ] Team seats, invite flow
- [ ] Admin dashboard (support, impersonation)

## Phase 5 — Moat (ongoing)

- [ ] Learn from winning ads (which hooks convert) → better copywriter prompts
- [ ] Style presets (TikTok UGC, premium brand, meme-core, etc.)
- [ ] Multi-language output
- [ ] Public API + Zapier integration

---

## Local run (this scaffold)

```bash
cp .env.example .env          # fill ANTHROPIC_API_KEY + DATABASE_URL
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Open http://localhost:3000 → `/generator` → paste any product URL.

Without a DB or API key the UI still renders with fixtures so you can explore the design.
