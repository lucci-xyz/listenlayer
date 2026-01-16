# ListenLayer

ListenLayer is a lightweight MVP SaaS that turns blog posts and RSS feeds into narrated audio episodes with transcripts, chapters, a hosted player page, and embeddable widgets. Background generation runs in durable Inngest jobs, audio is stored privately in Cloudflare R2, and playback analytics are stored in Postgres.

## Tech stack
- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Prisma ORM + Postgres (Supabase)
- Supabase Auth (email confirmation built-in)
- Inngest background jobs
- OpenAI TTS (`gpt-4o-mini-tts`)
- Cloudflare R2 via AWS SDK v3

## Prerequisites
- Node.js 20+
- pnpm
- Docker (for local Postgres)

## Local setup

1) Install dependencies

```bash
pnpm install
```

If Prisma or esbuild postinstall scripts were skipped, approve them once:

```bash
pnpm approve-builds
```

2) Start Postgres

```bash
docker-compose up -d
```

3) Configure env

```bash
cp .env.example .env
```

Fill in the required values (Supabase + OpenAI + R2).

4) Run migrations + seed demo user

```bash
pnpm db:migrate
pnpm db:seed
```

5) Start Inngest dev server

```bash
pnpm dlx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Or:

```bash
pnpm inngest:dev
```

6) Start the app

```bash
pnpm dev
```

Open http://localhost:3000.

## Local development auth

For local development, bypass auth entirely:

```bash
DEV_AUTH_BYPASS=true
```

This auto-logs you in as the demo user without needing Supabase Auth configured locally.

## Generate an episode
1. Log in and click **Add site**.
2. Paste a link, choose whether to keep it synced or just generate once, pick a format, and generate your first episode.
3. Watch the Inngest dev server logs to see the job progress.
4. Visit **Embeds** for the hosted player URL and copyable snippets.

## Onboarding detection checklist
- Pasting a valid RSS URL offers "Keep it synced" and allows continuing.
- Pasting a blog homepage with a `<link rel=\"alternate\">` feed enables "Keep it synced".
- Pasting a Substack profile URL like `https://substack.com/@username` resolves to the publication and finds `/feed`.
- Pasting a non-feed homepage without a feed disables Continue with guidance to paste a post URL.
- Pasting a specific article URL enables the "Just this one" path.

## Embed testing
Create a simple HTML file and paste:

```html
<iframe src="http://localhost:3000/embed/e/YOUR_PUBLIC_ID" style="width:100%;height:160px;border:0" loading="lazy"></iframe>
<script async src="http://localhost:3000/widget.js" data-episode="YOUR_PUBLIC_ID" data-theme="auto" data-accent="#111827" data-radius="soft" data-size="standard" data-chapters="1" data-transcript="1" data-open="1"></script>
```

## Environment variables
See `.env.example` for the full list.

Required for auth (Supabase):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Required for generation:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_ENDPOINT`

Optional:
- `INNGEST_EVENT_KEY`
- `DEV_AUTH_BYPASS` (set to `true` for local dev without Supabase Auth)
- `OPENAI_TTS_VOICE` (default: `marin`)
- `AUDIO_URL_TTL_SECONDS` (default: 21600)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (for billing)
- `NEXT_PUBLIC_STRIPE_*` price IDs (for billing)

## Deployment notes
- Set all environment variables in your hosting provider (Vercel).
- Run `pnpm prisma migrate deploy` against your production database.
- Ensure your Inngest production endpoint points to `/api/inngest`.
- R2 bucket remains private; audio is served via presigned URLs.
- Configure Supabase Auth redirect URLs to include your production domain + `/api/auth/callback`.

## Supabase setup
1. Create a Supabase project at https://supabase.com
2. Go to Project Settings > API to get your URL and keys
3. In Authentication > URL Configuration, add your redirect URL: `https://your-domain.com/api/auth/callback`
4. Supabase handles email confirmation automatically - no additional email service needed
