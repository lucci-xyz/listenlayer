You are Codex 5.2 Thinking. Refactor the ListenLayer UI to be radically simpler and more intuitive, without breaking existing backend functionality.

Context:
- The app already works end-to-end: sources → generate episode (Inngest) → OpenAI TTS → R2 private storage → presigned playback → hosted player + iframe + widget.js → analytics.
- Keep all existing API routes and core logic intact. This task is primarily UI/UX + light data plumbing for embed styling.

Goals:
1) Replace the current “Create Site” + “Add Source” + “Episodes table” clutter with an organized flow:
   - Onboarding wizard: Paste website or RSS → auto-detect → choose format → generate first episode → land on Embed screen.
2) Reduce raw typing:
   - Users should paste ONE thing (a site URL or RSS feed). The app should infer source type and propose defaults.
3) Add embed styling controls:
   - Theme (light/dark/auto), accent color, radius, size preset, show/hide chapters + transcript button.
   - Provide a live embed preview and copyable snippets.

Constraints:
- Use existing stack: Next.js App Router, TS, Tailwind, shadcn/ui.
- Keep design minimal and premium. One primary action per screen.
- Do not add new third-party services. Minor new dependencies are ok if tiny (e.g., color picker) but prefer building simply.
- Avoid large schema changes. If needed, add a single JSON column (e.g., Site.embedConfig) or a new small table (EmbedPreset) but keep it minimal.

Required new UI structure:
Left navigation:
- Sites
- Episodes
- Embed
- Analytics
- Settings

Within a Site (tabs):
- Overview
- Sources
- Style
- Embeds
- Episodes

Key screens:

A) /app (Sites)
- Shows list of sites (cards with favicon/name).
- Primary CTA: “Add site”.
- Clicking “Add site” opens onboarding wizard.

B) Onboarding Wizard (Modal or dedicated route)
Step 1: Paste website or RSS feed (single input)
- Auto-detect if RSS or website.
- If website: attempt RSS autodiscovery (rel=alternate RSS/Atom; common paths).
- Auto-fill site name + icon if possible.
- Allow editing via a small “Edit” link (not required).

Step 2: Choose format (3 cards)
- Narration (single host)
- Two-host conversation
- TL;DR recap

Step 3: Generate
- Calls existing endpoint that triggers generation.
- Shows a progress UI (friendly status messages).
- On completion, redirect to the site’s Embed/Style page.

C) Site Overview
- Top: site name/icon + single CTA “Generate latest”
- Secondary: “Copy embed snippet”
- Show latest episode player + quick link to episode detail
- Show mini embed preview

D) Sources
- List sources with “Generate latest”
- “Add source” opens a modal with options:
  - Auto-import from website (default)
  - RSS feed
  - Single URL
- For backfill, include buttons: Generate last 1 / 3 / 5 / 10 (cap reasonable)
- All forms should have strong inline validation and minimal typing.

E) Style + Embeds
- Controls:
  - Theme: light/dark/auto
  - Accent color: one picker
  - Radius: sharp/soft/round
  - Size: compact/standard/tall
  - Toggles: chapters, transcript button, open-full-player link
- Live preview: render /embed/e/{publicId} in an iframe with query params reflecting style.
- “Copy” buttons:
  - Hosted player URL
  - iframe snippet
  - widget.js snippet
- Store the style config per site (Site.embedConfig JSON) and use it as defaults in embed URLs.
- Update /embed/e/[publicId] page to read query params and apply styles (without external fonts).

Implementation details:
- Reuse existing endpoints:
  - POST /api/sites
  - POST /api/sources
  - POST /api/episodes/generate
  - GET /api/episodes/[publicId]/audio-url
  - POST /api/analytics/playback
- Add any needed endpoints for updating site embedConfig (e.g., PATCH /api/sites/[id]) but keep minimal.

Deliverables:
- Updated UI with organized navigation and flows described above.
- No TODOs; app runs locally.
- Ensure existing episode generation still works.
- Update README screenshots/notes if needed.

Now implement the UI refactor.

