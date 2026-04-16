# AdGen AI — System Architecture

> A production-ready SaaS platform that finds Shopify stores, generates AI video ads
> from any product URL, and runs personalized outreach — all from one dashboard.

---

## 1. High-level Architecture

```
 ┌──────────────────────────────────────────────────────────────┐
 │                         CLIENT (Next.js)                     │
 │   Dashboard · Ad Generator · Leads · Campaigns · Settings    │
 └──────────────────────────┬───────────────────────────────────┘
                            │ HTTPS (REST + Server Actions)
 ┌──────────────────────────▼───────────────────────────────────┐
 │                     API LAYER (Next.js Route Handlers)       │
 │    /api/ads · /api/leads · /api/outreach · /api/auth · …     │
 └──────────┬───────────────┬───────────────┬──────────────────┘
            │               │               │
 ┌──────────▼───┐  ┌────────▼────────┐  ┌──▼──────────────┐
 │  Postgres    │  │  Job Queue      │  │  Object Storage │
 │  (Prisma)    │  │  (BullMQ/Redis) │  │  (S3 / R2)      │
 └──────────────┘  └────────┬────────┘  └─────────────────┘
                            │
            ┌───────────────┼─────────────────────────┐
            │               │                         │
 ┌──────────▼───┐ ┌─────────▼────────┐  ┌─────────────▼─────────┐
 │ Agent Runner │ │ Video Pipeline   │  │ Outreach Worker       │
 │ (Claude API) │ │ (FFmpeg + TTS)   │  │ (Resend / SendGrid)   │
 └──────────────┘ └──────────────────┘  └───────────────────────┘
```

### Why this shape

- **Next.js App Router** handles UI + thin API for user actions (fast, SSR-friendly).
- **Job queue** isolates long-running work (scraping, video render, email sends) so
  API responses stay sub-second. Users see a job status; dashboard subscribes to updates.
- **Claude** is the reasoning engine for every text-producing agent; a single orchestrator
  chains them with typed inputs/outputs (no free-text hand-off between agents).
- **Object storage** holds assets (scraped images, voiceover MP3s, final MP4s).
- **Postgres** is the single source of truth for users, ads, leads, campaigns, jobs.

---

## 2. AI Agent System

All agents run inside a single orchestrator. Each agent is a pure function:
`(typed input) → Claude call → validated JSON output`. This keeps the pipeline
deterministic and testable.

| Agent              | Input                         | Output (JSON schema)                             | Model          |
| ------------------ | ----------------------------- | ------------------------------------------------ | -------------- |
| Scraper            | product URL                   | `{ title, description, images[], reviews[] }`    | Playwright     |
| Copywriter         | product facts                 | `{ hook, problem, solution, cta, fullScript }`   | Claude Sonnet  |
| Creative Director  | script + image set            | `{ scenes: [{ text, imageRef, duration, fx }] }` | Claude Sonnet  |
| Voiceover          | fullScript                    | `voiceover.mp3` (URL)                            | TTS API        |
| Video Generator    | scenes + voiceover            | `final.mp4` (URL)                                | FFmpeg         |
| Shopify Finder     | niche / keyword               | `{ stores: [{ name, url, email, socials }] }`    | Playwright     |
| Outreach           | store + ad URL                | `{ subject, body }`                              | Claude Sonnet  |

### Orchestration (MVP flow)

```
POST /api/ads/generate { productUrl }
     │
     ▼
  enqueue AdJob
     │
     ├─► Scraper        ──► product.json
     ├─► Copywriter     ──► script.json
     ├─► Creative Dir.  ──► scenes.json
     ├─► Voiceover      ──► voice.mp3
     ├─► Video Gen.     ──► final.mp4
     └─► persist Ad row, notify client
```

Each step writes its artifact to the job row so the pipeline is **resumable** on
failure and **debuggable** per step.

---

## 3. Data Model (Postgres / Prisma)

```
User          id, email, name, plan, createdAt
Ad            id, userId, productUrl, status, scriptJson, scenesJson,
              voiceoverUrl, videoUrl, createdAt
Lead          id, userId, storeName, websiteUrl, email, socialsJson,
              source, createdAt
Campaign      id, userId, name, adId, status, createdAt
Outreach      id, campaignId, leadId, subject, body, status,
              sentAt, openedAt, repliedAt
Job           id, userId, kind, status, payloadJson, resultJson,
              error, createdAt, updatedAt
```

See `prisma/schema.prisma` for the canonical definition.

---

## 4. API Surface (v1)

| Method | Path                         | Purpose                            |
| ------ | ---------------------------- | ---------------------------------- |
| POST   | /api/ads/generate            | Start a new ad generation job      |
| GET    | /api/ads                     | List user's ads                    |
| GET    | /api/ads/:id                 | Get ad + job status                |
| POST   | /api/leads/shopify/discover  | Find Shopify stores by keyword     |
| GET    | /api/leads                   | List leads                         |
| POST   | /api/campaigns               | Create campaign                    |
| POST   | /api/outreach/send           | Send personalized outreach email   |
| POST   | /api/webhooks/email          | Provider webhooks (open, reply)    |

API-first: every dashboard action hits the same routes an external client would.

---

## 5. Frontend

- **Next.js 14 App Router** + **Tailwind** + **shadcn-style primitives**.
- Design language: Stripe-clean typography, generous whitespace, subtle shadows,
  Apple-style rounded corners (`rounded-2xl`), muted palette with a single accent.
- Pages: `/`, `/dashboard`, `/generator`, `/leads`, `/campaigns`, `/settings`.

---

## 6. Security & Scale

- Auth: NextAuth (email + OAuth), session cookies, CSRF on state-changing routes.
- Secrets via `.env`, never client-exposed. Zod-validated at boot (`src/lib/env.ts`).
- Per-user rate limiting on `/api/ads/generate`.
- Row-level authorization: every query filters by `userId`.
- Horizontal scale: stateless API + queue workers; Postgres + Redis are the only
  stateful dependencies.

---

## 7. What's in the MVP vs. Next

**MVP (this repo):**
- Product URL → scraper → Claude copywriter → Claude creative director
- Ad stored, shown in dashboard with script + scenes preview
- Stubs for voiceover / video render (wire real providers next)
- Shopify finder + outreach endpoints scaffolded

**Next iterations:**
- Real TTS (ElevenLabs) + FFmpeg render worker
- Shopify discovery crawler at scale
- Campaign sequencer with follow-ups
- Billing (Stripe), team seats, usage quotas
