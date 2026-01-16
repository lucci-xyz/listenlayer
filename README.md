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

Fill in the required values (OpenAI + R2). For local dev, set `DEV_AUTH_BYPASS=true`.

4) Run migrations + seed demo user

```bash
pnpm db:migrate
pnpm db:seed
```

5) Start Inngest dev server

```bash
pnpm inngest:dev
```

6) Start the app

```bash
pnpm dev
```

Open http://localhost:3000.

## Local development auth

For local development, bypass Supabase auth entirely:

```bash
DEV_AUTH_BYPASS=true
```

This auto-logs you in as the demo user.

---

## Production Deployment (Vercel)

### Architecture: Preview vs Production

| | **Preview** | **Production** |
|---|---|---|
| URL | `preview.listenlayer.luccilabs.xyz` | `listenlayer.luccilabs.xyz` |
| Database | Same Supabase, `preview` schema | Same Supabase, `public` schema |
| Auth | Same Supabase Auth | Same Supabase Auth |
| Stripe | Test mode | Live mode |
| Inngest | Same app (auto-routes) | Same app (auto-routes) |
| R2 | Shared bucket | Shared bucket |

**Data is completely isolated** between preview and production using PostgreSQL schemas.

---

### Step 1: Set Up Supabase

Create **one** Supabase project (free tier).

1. Go to **Project Settings > API** and copy:
   - Project URL
   - `anon` public key  
   - `service_role` secret key
2. Go to **Settings > Database** and copy the connection string
3. Go to **Authentication > URL Configuration** and add redirect URLs:
   - `https://preview.listenlayer.luccilabs.xyz/api/auth/callback`
   - `https://listenlayer.luccilabs.xyz/api/auth/callback`

### Step 2: Create the Preview Schema

In Supabase Dashboard, go to **SQL Editor** and run:

```sql
-- Create the preview schema for isolated preview data
CREATE SCHEMA IF NOT EXISTS preview;

-- Grant permissions
GRANT USAGE ON SCHEMA preview TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA preview TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA preview TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA preview TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA preview TO authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA preview GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA preview GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA preview GRANT USAGE, SELECT ON SEQUENCES TO postgres, service_role, authenticated;
```

Or run the included script: `scripts/setup-preview-schema.sql`

### Step 3: Run Migrations for Both Schemas

```bash
# Production schema (public - default)
DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres" pnpm db:migrate:deploy

# Preview schema
DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres?options=-csearch_path%3Dpreview" pnpm db:migrate:deploy
```

### Step 4: Set Up Inngest (Free)

1. Create an account at [app.inngest.com](https://app.inngest.com)
2. Create one app called `listenlayer`
3. Go to **Manage > Keys** and copy:
   - Event Key
   - Signing Key

### Step 5: Configure Vercel Environment Variables

In Vercel, go to **Project Settings > Environment Variables**.

#### Shared Variables (All Environments)

```
# Supabase (same project for both)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Shared services
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET=listenlayer
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

OPENAI_API_KEY=sk-...
OPENAI_TTS_VOICE=marin
OPENAI_TTS_VOICE_SECONDARY=cedar

INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key

# Stripe keys (ALL environments need both test and live)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_SECRET_KEY_TEST=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_test_...

# Price IDs (both test and live)
NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID=price_live_...
NEXT_PUBLIC_STRIPE_CREATOR_PRICE_ID_TEST=price_test_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_live_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_TEST=price_test_...
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_live_...
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID_TEST=price_test_...
```

#### Preview Environment Only

Set with **Environment: Preview**:

```
NEXT_PUBLIC_APP_ENV=preview
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres?options=-csearch_path%3Dpreview
```

#### Production Environment Only

Set with **Environment: Production**:

```
NEXT_PUBLIC_APP_ENV=production
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
```

### Step 6: Configure Custom Domains

In Vercel **Project Settings > Domains**:
- `listenlayer.luccilabs.xyz` → Production
- `preview.listenlayer.luccilabs.xyz` → Preview

### Step 7: Configure Stripe Webhooks

Create two webhook endpoints in Stripe Dashboard:

1. **Test mode** → `https://preview.listenlayer.luccilabs.xyz/api/billing/webhook`
2. **Live mode** → `https://listenlayer.luccilabs.xyz/api/billing/webhook`

Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_succeeded`

---

## How It Works

### Database Schema Isolation
- **Production** uses the default `public` schema
- **Preview** uses the `preview` schema (via `?options=-csearch_path%3Dpreview` in DATABASE_URL)
- Same Supabase project, completely isolated data

### Supabase Auth (Shared)
Users can sign up on either environment and log into both. This is intentional—you're testing the same auth flow.

### Stripe Mode Selection
The app automatically uses Stripe test or live keys based on `NEXT_PUBLIC_APP_ENV`:
- `preview` → Uses `*_TEST` keys
- `production` → Uses live keys

### Inngest Branch Environments
Inngest Cloud auto-detects Vercel deployments and routes events correctly.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_ENV` | Yes | `preview` or `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `DATABASE_URL` | Yes | Postgres connection string (with schema for preview) |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 secret key |
| `R2_BUCKET` | Yes | R2 bucket name |
| `INNGEST_EVENT_KEY` | Yes | Inngest event key |
| `INNGEST_SIGNING_KEY` | Yes | Inngest signing key |
| `STRIPE_SECRET_KEY` | For billing | Stripe live secret key |
| `STRIPE_SECRET_KEY_TEST` | For billing | Stripe test secret key |
| `STRIPE_WEBHOOK_SECRET[_TEST]` | For billing | Stripe webhook secrets |
| `NEXT_PUBLIC_STRIPE_*` | For billing | Stripe publishable keys and price IDs |
| `DEV_AUTH_BYPASS` | Local only | Set `true` to skip auth locally |
