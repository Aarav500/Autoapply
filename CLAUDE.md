# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is
AI-powered platform that autonomously searches for jobs, generates tailored CVs/cover letters, auto-applies, manages email responses, and coaches for interviews.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Production build (standalone output for Docker)
npm run lint         # ESLint via next lint

# Local S3 (MinIO — required for dev)
docker-compose up -d # Starts MinIO on :9000 (API) and :9001 (console)
# MinIO credentials: minioadmin / minioadmin
# MinIO console: http://localhost:9001

# Type checking
npx tsc --noEmit

# Deployment (via GitHub Actions → AWS SSM → EC2)
# Push to main triggers .github/workflows/deploy.yml
# Manual: gh workflow run deploy.yml
```

### Local Environment Setup
Copy `.env.example` to `.env.local`. For dev with MinIO, set:
```
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=autoapply
AWS_REGION=us-east-1
```
Required for AI features: `ANTHROPIC_API_KEY`. All other integrations (Google, Twilio) gracefully degrade when missing.

## Architecture

### No Database — S3 JSON Storage
There is no database. All data lives in S3 as JSON files. The sole storage client is `src/lib/storage.ts`, which exposes:
- `getJSON<T>(key)` / `putJSON(key, data)` / `updateJSON(key, updater)` / `deleteJSON(key)`
- `listKeys(prefix)`, `uploadFile(key, buffer, contentType)`, `getPresignedUrl(key, expiresIn)`

S3 key structure (all under one bucket):
```
users/{userId}/profile.json
users/{userId}/settings.json
users/{userId}/jobs/index.json + {jobId}.json
users/{userId}/documents/index.json + cv/*.pdf/.docx + cover-letters/*.pdf
users/{userId}/emails/index.json + {emailId}.json + threads/{threadId}.json
users/{userId}/interviews/index.json + {id}.json + {id}/prep.json + {id}/mock-{sessionId}.json
users/{userId}/applications/index.json + {id}.json + screenshots/*.png
users/{userId}/notifications/index.json
auth/emails/{hash}.json            ← maps email hash → userId
auth/refresh-tokens/{hash}.json    ← JWT refresh token store
comms/phone-map/{phone-hash}.json  ← maps phone → userId for Twilio webhooks
```

### Request Flow (API Routes)
All API routes follow: **Zod validate → `authenticate(request)` → service call → `successResponse()` / `handleError()`**

`authenticate()` in `src/lib/api-utils.ts` extracts the JWT from `Authorization: Bearer <token>` and returns `{ userId }`. Throw `AuthError` to get a 401.

### Frontend Architecture
- Route groups: `src/app/(app)/` (authenticated shell with Sidebar + Header) and `src/app/(auth)/` (login/register)
- Auth tokens stored in `localStorage` (`accessToken`, `refreshToken`). `src/lib/api-client.ts`'s `apiFetch()` auto-attaches tokens and auto-refreshes on 401.
- Data fetching: React Query via `apiFetch`. Pattern: loading skeleton → error state → content.
- UI components: shadcn/ui in `src/components/ui/` (Radix primitives + Tailwind). Layout in `src/components/layout/`.

### AI Client (`src/lib/ai-client.ts`)
Three tiers: `fast` (Haiku), `balanced` (Sonnet, default), `powerful` (Opus).
- `aiClient.complete(system, user, options)` → plain text
- `aiClient.completeJSON(system, user, zodSchema, options)` → typed + validated object (retries with Zod error feedback)

Prompt templates in `src/prompts/`: cv-generator, cover-letter, job-matcher, email-analyzer, github-optimizer, linkedin-optimizer, interview-coach, auto-responder. Each exports a function returning `{ system, user }`.

### Background Scheduler
`src/instrumentation.ts` bootstraps `initializeScheduler()` on Node.js server start (not during build). The in-memory scheduler (`src/services/scheduler/job-runner.ts`) runs 5 tasks:
- `auto-search` — every 1h
- `email-sync` — every 15min
- `interview-reminders` — every 15min
- `auto-apply` — every 2h
- `daily-digest` — every 1h (fires once/day at 8am)

### Document Generation
PDFs via Puppeteer (server-side HTML→PDF). DOCX via the `docx` package. Both are server-only — listed in `serverComponentsExternalPackages` in `next.config.mjs`.

### Auto-Apply Engine
`src/services/jobs/auto-applicant.ts` orchestrates: detect method → generate CV/cover letter → launch Playwright browser with anti-detection → AI analyzes form HTML → fill fields → submit → screenshot → record result. Rate-limited by `maxApplicationsPerDay` in user settings.

## Code Rules
1. No `any` types — ever
2. No TODOs or stubs — every function has real logic
3. Every async function: try/catch with typed error handling
4. Missing API keys → graceful error response, never crash
5. File naming: kebab-case files, PascalCase components
6. Imports: `@/` alias for `src/`

## Tech Stack
Next.js 14 (App Router), TypeScript strict, Tailwind CSS, Framer Motion, Zustand, React Query, AWS S3, Anthropic Claude API, Twilio, Gmail API, Google Calendar, Playwright, Puppeteer, Pino logging, Zod validation.

## All Modules Complete
Foundation → Auth → AI Client → Profile → Job Search → Document Gen → ATS → Email → SMS/Calendar → Interview Coach → Auto-Apply → Background Scheduler → Design System → All Pages (Dashboard, Profile, Jobs, Documents, Comms, Interview, Settings, Optimize)

## Known Issues
- Gmail/Calendar require `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in env/secrets
- SMS/WhatsApp require Twilio credentials
- LinkedIn optimizer uses saved profile data (no live scraping)
- LinkedIn Easy Apply not yet automated (requires active browser session)
