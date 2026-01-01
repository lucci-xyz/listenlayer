Update the ListenLayer MVP UI/UX to feel premium, simple, and intuitive, based on the plan below. The product already works end-to-end; do NOT break generation, playback, embeds, or analytics. Focus on UI, UX flow, and small supporting data improvements.

CURRENT STATE (assume exists):
- Next.js App Router + TS + Tailwind + shadcn/ui
- Prisma + Postgres
- Auth works
- Sources exist (RSS/URL)
- Episode generation via Inngest works
- Public player (/listen/e/:publicId), embed (/embed/e/:publicId), widget.js exist
- Style defaults exist and are applied via query params and widget data-attrs
- There is a workspace sub-nav including Overview, Sources, Style, Embeds, Episodes

TOP GOALS:
1) Radically simplify user mental model: “Connect content → Generate → Copy embed”.
2) Reduce raw typing and raw URLs.
3) Make Sources, Style, Episodes pages feel premium.
4) Remove the need for a dedicated Embeds page: embed snippets should be a modal, available contextually.

HARD CONSTRAINTS:
- Keep existing backend endpoints and job pipeline working.
- Prefer minimal schema changes. UI can rename “Site” to “Workspace” without touching DB model.
- If schema changes are needed, keep them additive + small.
- Use shadcn/ui components (Card, Button, Dialog, Tabs, Badge, Switch, DropdownMenu, Tooltip, Skeleton, Separator).
- No heavy new dependencies unless clearly justified.

IMPLEMENTATION TASKS:

A) NAMING + NAV CLEANUP
- Rename UI labels “Sites” -> “Workspaces” everywhere in the dashboard.
- Remove “No domain set” from all pages. Domain should be moved into Settings -> Advanced (collapsed), not shown on Overview/Sources/Style/Episodes.
- Keep the DB model name as-is (Site) to avoid migrations; just change labels and headings.

B) WORKSPACE OVERVIEW REDESIGN
- Redesign the Overview page layout to:
  - Header: Workspace name + small meta line (e.g., “1 source • Auto: Off • Style: Standard”).
  - Right-aligned actions: Primary “Generate latest” and Secondary “Copy embed”.
  - Main content: 2-column grid of Cards:
    1) Latest Episode card:
       - title (clamped), status badge, created relative time
       - play button or mini player (MVP can be play button -> open episode)
       - “Open episode” link
    2) Embed Preview card:
       - framed live preview (iframe)
       - “Copy embed” button
  - Second row: small Cards for Sources summary, Style summary, Analytics snapshot.
- For brand-new workspaces, show a simple 3-step checklist instead of empty cards:
  1) Add a source
  2) Choose style
  3) Copy embed
- Ensure Overview has no raw URLs shown by default. If needed, show source domain + a “View details” link.

C) SOURCES PAGE PREMIUM REDESIGN
- Replace the current plain list with Source Cards.
- Each Source Card should include:
  - favicon + display name (domain or detected name)
  - type badge: RSS / Website / Single URL
  - “Latest item: <title>” for RSS (if available)
  - “Checked X ago” (relative) with tooltip for exact timestamp
  - Actions: Primary “Generate”, and a “…” menu with Edit, Copy URL, Remove, Test fetch.
  - Collapsible details area (Accordion) showing:
    - raw URL (truncated) + copy button
    - last error message (if any)
    - backfill controls for RSS: buttons for last 1/3/5/10
    - per-source Auto toggle (optional, if exists; otherwise stub UI but disabled with “Coming soon”)
- Add Source modal:
  - one primary input and three options (tabs or segmented):
    1) Website (recommended): user pastes domain; attempt RSS autodiscovery; if multiple feeds found, show a selection list.
    2) RSS feed
    3) Single URL
  - After paste, show a “Detected:” preview (name/type) before Connect.
- (Optional small schema upgrade, recommended for premium UI):
  Add nullable columns to Source:
    - displayName, faviconUrl
    - lastFetchStatus (success/fail), lastError
    - latestItemTitle, latestItemUrl
  If you add these, populate them when a source is created and whenever it is fetched.
  If you do NOT add columns, compute these server-side and return via API to render.

D) STYLE PAGE “STYLE STUDIO” UPGRADE
- Convert Style page into 2-column layout:
  - left: controls grouped as:
    - Presets: Minimal / Modern / Bold (one click applies a bundle)
    - Theme segmented: light/dark/auto
    - Accent swatches row + “Custom” picker. Hide hex input in “Advanced”.
    - Layout: radius chips + size chips
    - Features switches: Chapters / Transcript / Open player link with short descriptions
  - right: sticky preview card with a framed embed preview (simulate article container behind)
  - top-right action: “Copy embed” (opens EmbedModal)
- Replace “Save styles” with auto-save:
  - Save on change with debounce (500–800ms)
  - Show small “Saving…” -> “Saved” indicator
  - Provide a “Reset to defaults” action.
- Keep the existing query param + widget attr behavior working.

E) EMBEDS: REMOVE PAGE, ADD MODAL
- Remove “Embeds” from the workspace sub-navigation.
- Keep the route /app/sites/:id/embeds as a redirect to /style OR /overview to avoid dead links.
- Implement a reusable EmbedModal component:
  - Tabs: Iframe (default), Widget, Link
  - Each tab shows a short explanation + code snippet + Copy button.
  - Include “Test embed” link (to existing embed preview route if present).
  - Embed snippets should reflect the workspace default style (theme/accent/radius/size/toggles).
  - Allow embedding either:
     - the latest published episode OR
     - a selected episode (when opened from an episode row), whichever context is available.
- Add “Copy embed” triggers in:
  - Overview header
  - Style page header
  - Episodes list row actions
  - Episode detail page (if exists)

F) EPISODES PAGE: PREMIUM LIBRARY
- Replace the current table with Episode Cards list:
  - Status badge (Published/Processing/Failed)
  - Title (clamped)
  - Source badge (domain)
  - Created relative time
  - Actions: Open/Play, Copy embed, “…” menu (Regenerate optional, Delete later)
- Add filters: All / Published / Processing / Failed
- Add search by title
- Add sort dropdown: Newest/Oldest
- Pin processing episodes at top in an “In progress” section.
- If you have access to generation step status, show a simple progress line; otherwise show spinner + “Generating…”

G) POLISH
- Ensure consistent spacing, typography, truncation, and empty states.
- Use toasts on successful generation with an action “Copy embed”.
- Ensure all Dialogs and menus are accessible and keyboard navigable.
- Keep mobile responsive: cards stack, sticky preview becomes top/bottom.

ACCEPTANCE CRITERIA
- Existing generation still works from Overview/Sources.
- Style changes update preview and embed snippets.
- Copy embed modal works from Overview, Style, Episodes list.
- No raw “No domain set” appears in the main UI.
- Sources list looks premium and hides raw URLs unless expanded.
- Episodes page is card-based with filters/search and feels like a content library.
- /app/sites/:id/embeds no longer appears in nav and does not present a redundant page (redirect OK).

Now implement this UI/UX overhaul in the existing repository. Do not leave TODOs.
