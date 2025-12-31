You are Codex 5.2 Thinking. Build a functional MVP SaaS called “ListenLayer”:

Goal:
A user can log in, add a blog RSS or URL source, click “Generate Episode”, and the app produces:
- an MP3 (stored in Cloudflare R2)
- a transcript (the spoken script)
- basic chapters
- a hosted player page URL
- an iframe embed URL + copy-paste snippet
- a widget.js script tag embed (injects the iframe)
- basic playback analytics (plays + completion milestones)

Hard constraints:
- Production-minded but MVP-fast: no over-engineering, no microservices.
- Background generation MUST be durable and not run inside a request handler (use Inngest).
- Audio must be accessed safely without making the R2 bucket public: use presigned GET URLs generated server-side.
- TTS must chunk input to respect OpenAI audio API input limits (max 4096 characters per request) and then concatenate buffers.
- Use TypeScript everywhere.
- Include a clean README with exact steps to run locally + deploy.

Tech stack (use these):
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Prisma ORM
- Postgres (local via docker-compose OR remote). Provide docker-compose for local Postgres.
- Auth: For MVP-speed, implement Auth.js (NextAuth) with Email magic link OR Credentials (email+password) stored via Prisma.
  - ALSO include DEV_AUTH_BYPASS=true mode: when enabled, auto-auth as a seeded demo user without external setup.
- Inngest for background jobs and a local dev server integration.
- OpenAI TTS via Audio API: model = gpt-4o-mini-tts, default voice = marin (configurable), format = mp3.
- Cloudflare R2 using AWS SDK v3 S3Client + PutObjectCommand, plus GetObject presigned URL generation.
- Content extraction: fetch HTML + JSDOM + @mozilla/readability to extract main article text, fallback to simple HTML-to-text if Readability fails.
- RSS parsing: rss-parser npm.
- Analytics: simple DB table for playback events, plus a tiny dashboard chart/table (no external analytics required).

MVP UX (pages):
1) / (marketing-ish landing + “Go to Dashboard”)
2) /login (Auth.js)
3) /app (dashboard)
   - “Create Site” (name + optional domain label)
   - “Add Source”: choose RSS or URL
   - List sources
   - Button: “Generate latest episode”
   - List episodes with status: queued/running/published/failed
4) /app/episodes/[id]
   - show status, transcript, chapters, audio player
   - show “Embed” section with:
     - Hosted player URL
     - iframe snippet
     - widget.js snippet
5) Public player:
   - /listen/e/[publicId] (nice player page)
   - /embed/e/[publicId] (minimal embed view, sized ~160px tall)
   - /widget.js (script that injects iframe)

Backend/Data model (Prisma):
- User { id, email, passwordHash?, createdAt }
- Site { id, userId, name, createdAt }
- Source { id, siteId, type: 'RSS'|'URL', url, createdAt, lastFetchedAt? }
- Episode { id, siteId, sourceId, title, sourceUrl, status, scriptText, transcriptText, chaptersJson, audioObjectKey, durationSec?, publicId, createdAt, publishedAt?, errorMessage? }
- PlaybackEvent { id, episodeId, kind: 'play'|'progress', value?: number (progress percent), createdAt, ua?, referrer? }

Core workflow (Inngest):
Event name: "episode/generate.requested" with data: { userId, siteId, sourceId }
Inngest function steps (use step.run for durability):
1) Fetch source
   - If RSS: parse feed, pick latest item, get item.link as canonical URL, plus title
   - If URL: use it directly
2) Fetch HTML of canonical URL (handle redirects, 5MB cap)
3) Extract readable text with JSDOM + Readability
4) Create a script for a “podcast-style narration”:
   - Keep it 3–6 minutes max (target ~500–900 words)
   - Structure:
     - Hook (1–2 sentences)
     - 3 key takeaways with headings
     - Practical implications / “who this is for”
     - Caveats / tradeoffs (must be grounded in text)
     - Closing / CTA (optional)
   - Output MUST be plain text.
   - Also output “chapters” array: [{title, startApproxSec}] (approx is fine).
   - Ensure it does NOT hallucinate external facts: only use what’s in the extracted text.
5) TTS generation:
   - Chunk script into <= 3500 chars per request (safe margin).
   - For each chunk call OpenAI Audio API speech endpoint with:
     - model: "gpt-4o-mini-tts"
     - voice: configurable, default "marin"
     - input: chunk
     - format: "mp3"
   - Concatenate MP3 buffers in order (MVP: simple concat is OK).
   - Optional: If ffmpeg is available, run loudnorm; otherwise skip gracefully. (Do not block MVP on this.)
6) Upload MP3 to R2:
   - Key pattern: "episodes/{episodeId}.mp3"
   - ContentType: "audio/mpeg"
7) Update Episode status to PUBLISHED with audioObjectKey, transcript, chapters, etc.
8) On error: set status FAILED and store errorMessage.

R2 integration details:
- Use AWS SDK v3 S3Client with:
  - endpoint: https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com
  - region: "auto"
  - credentials: accessKeyId/secretAccessKey
- Generate presigned GET URLs server-side for playback (expiresIn 3600 or 6 hours).
- Player pages should request /api/episodes/[publicId]/audio-url to get a fresh presigned URL.

API routes (Next.js Route Handlers):
- POST /api/sites (create site)
- POST /api/sources (add source)
- POST /api/episodes/generate (body: { siteId, sourceId }) -> emits Inngest event and returns { episodeId }
- GET /api/episodes/[publicId]/audio-url -> returns { url } (presigned)
- POST /api/analytics/playback -> accepts { publicId, kind, value? } and records event

Security:
- Auth required for /app and all create/generate endpoints.
- Public pages (/listen/e/*, /embed/e/*) are read-only.
- audio-url endpoint should be callable by public player pages BUT only for published episodes (no auth required). It returns short-lived presigned URL.
- Rate limit audio-url and analytics endpoints minimally (simple in-memory or Upstash-free; MVP can be light).

Embed requirements:
- iframe embed must work by copy-paste into any HTML page:
  <iframe src="https://YOUR_DOMAIN/embed/e/{publicId}" style="width:100%;height:160px;border:0" loading="lazy"></iframe>
- widget.js must work:
  <script async src="https://YOUR_DOMAIN/widget.js" data-episode="{publicId}"></script>
  - widget.js injects an iframe pointing to /embed/e/{publicId} and applies responsive sizing.
- Ensure /embed/e/* uses minimal CSS and no external fonts.

UI requirements:
- Use shadcn/ui components: Button, Card, Input, Tabs, Badge, Table.
- Keep design clean and minimal. No heavy theming.

Project setup tasks for you (Codex):
1) Create a new Next.js app (App Router, TS, Tailwind, ESLint).
2) Install deps:
   - prisma, @prisma/client
   - next-auth (Auth.js)
   - inngest, @inngest/next (if required by latest docs)
   - openai
   - rss-parser
   - jsdom, @mozilla/readability
   - @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
   - zod
   - shadcn/ui
3) Create Prisma schema + migrations.
4) Implement Auth.js login flow with a simple credentials provider (email+password) for MVP, plus seeded demo user.
5) Implement Inngest integration:
   - /api/inngest route as required
   - local dev instructions to run Inngest dev server
6) Implement all pages and API routes listed.
7) Add a small seed script to create demo user + demo site + demo source.
8) Write README with:
   - prerequisites (Node 20+, pnpm)
   - env vars needed
   - how to start Postgres via docker-compose
   - prisma migrate
   - run inngest dev server
   - run next dev
   - how to generate an episode and test embed

Environment variables:
Create .env.example with placeholders for all needed vars:
- DATABASE_URL=postgresql://...
- NEXTAUTH_SECRET=...
- NEXTAUTH_URL=http://localhost:3000
- OPENAI_API_KEY=...
- R2_ACCOUNT_ID=...
- R2_ACCESS_KEY_ID=...
- R2_SECRET_ACCESS_KEY=...
- R2_BUCKET=...
- R2_ENDPOINT=https://{ACCOUNT_ID}.r2.cloudflarestorage.com
- INNGEST_EVENT_KEY=... (optional for local; include docs)
- DEV_AUTH_BYPASS=false

Acceptance test checklist (make sure it passes):
- `pnpm dev` loads landing page
- Can log in (or bypass auth with DEV_AUTH_BYPASS=true)
- Can create site + add RSS source
- Clicking “Generate latest episode” queues a job and eventually produces a published episode
- Public player URL plays audio successfully (uses presigned URL)
- iframe embed works inside a simple static HTML test page
- widget.js embed works in the same test page
- Playback events are recorded and visible in dashboard

Deliverables:
- Working repository with all code
- README with setup
- .env.example
- docker-compose.yml for Postgres
- Minimal but clean UI

Now implement it. Do not leave TODOs. Keep the code straightforward and runnable.

