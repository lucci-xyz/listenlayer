# Pilot Design Style Guide

## Product Tone
- Modern, calm, and minimal with warm accents.
- Light surfaces, subtle borders, and soft elevation (Apple/ElevenLabs-like).
- Clear hierarchy: compact labels, medium-weight body, bold numeric emphasis.
- Copy tone: concise, calm, and utilitarian; avoid hype.

## Typography
**Fonts**
- Sans: Inter (`--font-inter`, `font-sans`)
- Mono: JetBrains Mono (`--font-mono`, `font-mono`) for IDs, addresses, and technical strings.

**Type scale (from UI usage)**
- `text-[11px]`: Eyebrow/labels, uppercase with tracking (e.g. section headers)
- `text-[12px]`: Helper text, input labels
- `text-[13px]`: Default body copy, form text
- `text-[15px]`: Page titles in app header
- `text-lg`: Section headings
- `text-xl`: Auth page headings
- `text-2xl`: Key metrics (KPI numbers)

**Weights**
- Regular/medium for body; semibold for numbers and section titles.

## Color System
All colors are defined in `src/app/globals.css` and exposed as CSS variables used by Tailwind.

**Light theme**
- Background: `#fafafa`
- Foreground: `#171717`
- Card/Popover: `#ffffff`
- Primary (accent coral): `#d97757`
- Secondary/Muted: `#f5f5f5`
- Border/Input: `#e5e5e5`
- Ring: `#d97757`

**Dark theme**
- Background: `#0a0a0a`
- Foreground: `#fafafa`
- Card/Popover: `#171717`
- Primary: `#e8937a`
- Secondary/Muted: `#262626`
- Border/Input: `#262626`
- Ring: `#e8937a`

**Status colors**
- Success: `#10b981` (emerald)
- Warning: `#f59e0b` (amber)
- Error/Destructive: `#ef4444` (red)
- Inactive/Needs setup: neutral grays

**Charts palette**
- `--chart-1`: `#d97757`
- `--chart-2`: `#6366f1`
- `--chart-3`: `#10b981`
- `--chart-4`: `#f59e0b`
- `--chart-5`: `#ec4899`

Use Tailwind color tokens (`bg-background`, `text-foreground`, `border-border`, etc.) instead of hard-coded hex values.

## Layout & Spacing
- Use generous whitespace and compact component density.
- Spacing scale (preferred): 2, 3, 4, 5, 6, 8, 10 (Tailwind `space-*`, `gap-*`, `p-*`, `m-*`).
- Common padding: `p-5` for cards, `p-8` for auth containers, `px-4/px-6` for headers.
- Section spacing: `space-y-6` for page groups, `space-y-4` for forms.

## Radius
- Base radius: `0.75rem` (`--radius`).
- Cards: `rounded-xl` or `rounded-2xl` in auth.
- Inputs and buttons: `rounded-md` or `rounded-lg`.

## Elevation & Surfaces
Use custom soft shadows defined in `globals.css`:
- `shadow-soft`: subtle card lift
- `shadow-soft-md`: medium emphasis
- `shadow-soft-lg`: modal/auth emphasis

## Components
**Buttons** (`components/ui/button.tsx`)
- Default: primary coral background.
- Secondary/outline/ghost follow shadcn variants.
- Auth flows use neutral black CTA (`bg-neutral-900`) to avoid competing with the coral accent.
- Primary CTA rule: use coral for core in-app actions (e.g. "Fund wallet", "Create agent"). Use neutral/outline for secondary actions. Use destructive only for irreversible actions.

**Inputs** (`components/ui/input.tsx`)
- Height `h-10`, neutral borders, `text-[13px]`.
- Focus ring uses primary.

**Cards**
- `border-neutral-100 bg-white shadow-soft rounded-xl`.
- KPI cards use uppercase label + large numeric value.

**Header**
- Sticky, light blur, thin border: `bg-white/80 border-neutral-100 backdrop-blur-sm`.

**Status badges**
- Green (active), amber (paused), red (error), neutral (needs setup).

**Recipes (quick patterns)**
- KPI card: `text-[11px]` uppercase label + `text-2xl` value + optional `text-[12px]` helper.
- Form section: label `text-[12px] font-medium`, inputs `h-10`, helper `text-[12px]` neutral.
- Sidebar item: `text-[13px]`, subtle hover, active uses neutral background.

## Iconography
- Use Lucide icons.
- Typical sizes: `h-3.5` to `h-5`, stroke width `1.5`.

## Motion
- Keep motion subtle: `transition-colors` for hover, `transition-all` for progress.
- Avoid heavy animations; prefer instant, crisp feedback.

## Data Display
- Currency formatting: `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`.
- Use mono font for IDs, keys, and addresses.

## Theme Usage
- Default: light theme. Dark theme is supported but not the primary visual target.
- If designing new pages, match light theme tokens unless explicitly asked for dark variants.

## Do / Don't
- Do keep backgrounds light and neutral with warm coral accents.
- Do use CSS variables and Tailwind tokens.
- Don't introduce saturated backgrounds or hard shadows.
- Don't mix new fonts unless approved.
