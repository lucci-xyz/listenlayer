### App dashboard (`/src/app/app/page.tsx`)
- Top stats: Keep just 3 small tiles: Shows, Episodes, Plays. Drop the credits gradient tile and “Manage plan” link from this row.
- Recent episodes: Show a simple list (title, show, status, age). Drop columns for plays (if not available) and remove status pills’ colors—use a subtle label in muted text.
- Your shows: Keep list to title + count + “Open”. Remove icons and the small “Add” ghost button; use one primary “New show” at top.
- Remove generating alert’s ping animation; replace with a single line of text if active.

### Onboarding (`/src/app/app/onboarding/onboarding-client.tsx`)
- Steps: Reduce to 3 visible states: Paste link → Confirm detection (Feed or Article) → Generate.
- UI: One card only. Remove accordion, advanced badges, and multiple alerts. Advanced RSS entry stays hidden behind “Advanced” text link.
- Copy: Replace long helper text with short guidance:
  - If feed found: “Auto-sync this feed” (default) or “Just this link”.
  - If article: “We’ll generate audio for this post.”
  - If homepage/no feed: “Paste a specific post link to continue.”
- Inputs: Single URL field + primary button “Continue”. Detection runs on blur/continue.
- Progress: Replace multi-line statuses with a single inline “Preparing…” line.

### Site overview (`/src/app/app/sites/[siteId]/page.tsx`)
- Only one player: show latest published episode player; remove the embed preview iframe here. Link out: “Open player page” and “Copy embed”.
- Cards: Keep just two small summary blocks: Sources count, Analytics (plays/completions). Remove style card and extra descriptions.
- Header: Name + source count only. Drop “Auto/Style” text.

### Episodes list (`/src/app/app/episodes/page.tsx` and per-site episodes)
- Keep list rows to: Title, Show (if applicable), Status (text), Age. Remove icons, extra buttons, and embeds. One primary action “Open” per row.
- Filters: Keep only a simple status filter and search; drop sort button if not critical.

### Episode detail (`/src/app/app/episodes/[id]/page.tsx`)
- Above-the-fold: Title, status, source, single minimal player, then transcript/chapter sections. Remove extra badges and dense copy.
- Embed section: Show only two fields: Player URL and Iframe snippet. Drop widget snippet if not needed.

### Embed preview (`/src/app/app/embed/page.tsx`)
- Keep a single live iframe preview and one copy button. Remove site tabs if cluttered—use a select dropdown instead.

### Analytics (`/src/app/app/analytics/page.tsx`)
- If usage is low, replace table with a simple empty state. Otherwise, a slim table with Episode, Plays, and Completion (100%). Drop intermediate milestone columns.

### Player usage
- Ensure each page shows at most one AudioPlayer. Replace secondary embeds with links (“Open player”).