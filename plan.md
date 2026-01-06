You’re updating the styling + copy of the ListenLayer marketing site (`/`) and the app dashboard (`/app`) so it feels **designed by a human** and **not like a generic AI SaaS template**. Keep functionality the same unless explicitly noted. Focus on (1) stronger hierarchy, (2) distinctive typography + spacing, (3) fewer boilerplate sections, (4) a consistent brand “signature”, and (5) removing fake-sounding claims.

## Global goals

* Make the UI feel **premium, minimal, and intentional** (Notion/Stripe-level restraint).
* Reduce “SaaS starter template” silhouette: avoid perfectly symmetrical, repetitive grids and identical cards everywhere.
* Establish a coherent design system: tokens for **type, spacing, radius, borders, shadows, and one accent color**.
* Do not introduce loud gradients/neon. If you use a gradient, it must be subtle and used sparingly.

## Design system (implement first)

1. Typography

* Use **two fonts max**:

  * Body: a clean sans (Inter/Geist/SF).
  * Headings: a distinctive display font (Instrument Serif / Fraunces / Space Grotesk). Headings only.
* Reduce weights: mostly 400 and 600. Avoid 700/800 everywhere.
* Set a clear scale:

  * H1 ~ 56–64px desktop, tight leading (1.0–1.1), slight negative tracking.
  * Body ~ 16–18px with ~1.6 line-height.
  * Use a small “eyebrow” label above key headings.

2. Layout + spacing

* Increase max page width to ~1120–1200px.
* Increase section spacing (96–120px) and reduce the number of boxed components.
* Prefer left-aligned hero on desktop (centered hero reads templatey).

3. Surfaces

* Choose one surface style and apply consistently:

  * `rounded-2xl` or `rounded-3xl` for hero containers.
  * Border-first: `border-zinc-200/70` (or equivalent).
  * One subtle shadow style only. Avoid default heavy card shadows.
* Add subtle hover states (border darken + tiny lift) consistently.

4. Accent usage rules

* Pick **one accent** and use it only for:

  * Primary CTA button
  * Active nav indicator
  * One key highlight metric
  * Small chart/detail elements
* Everything else stays neutral.

5. “Signature” motif

* Add ONE distinctive motif repeated 3–5 times across marketing + app:

  * e.g., soft blurred orb behind hero, waveform divider, or a capsule container style.
* Keep it subtle; consistency matters more than flash.

## Marketing site (`/`) — reduce AI-template feel

A) Copy changes (remove “AI-generated voice”)

* Remove/soften “AI-powered narration” and generic superlatives (“beautiful”, “sleek”, “professional”, “studio-quality”, “natural”).
* Replace with specific, concrete outcomes (what happens when I paste a URL? what do I get?).
* Add 1 opinionated line that sounds human (e.g., “Great for newsletters and blogs. Overkill for audiobooks.”).
* Fix small copy polish issues (e.g., missing space in “intoaudio”).
* If “Trusted by 500+ creators / 10,000+ episodes…” isn’t verified, replace with logos, a demo embed, or remove.

B) Layout changes (biggest win)

* Convert hero to a **two-column layout**:

  * Left: headline, 1–2 line value prop, primary CTA + secondary (listen/demo), “3 free episodes / no card” line.
  * Right: a real-looking visual (player screenshot/mock, example episode embed).
* Replace the “3 steps” + “6 features” repetition with a more narrative section:

  * Combine into a single “How it works / What you get” section using fewer boxes, more whitespace.
* Pricing:

  * Avoid 3 identical cards. Make the “Most popular” plan visually distinct (wider or featured).
  * Use a subtle badge and consistent spacing.

C) Visual details

* Use custom icon style or minimal icons; avoid generic icon grid look.
* Add micro-interactions: hover transitions, button press states.
* Reduce symmetry and repetition; intentionally vary section layouts (one split section, one full-width section, one simple list).

## App dashboard (`/app`) — make it feel like a real product, not an admin starter

A) Sidebar identity

* Replace the plain “L” with a proper brand block (logo mark + wordmark).
* Add section labels (e.g., Workspace / Content / Insights).
* Improve active state: left accent bar + subtle background + border.
* Shows list:

  * Replace letter avatars (“D/T/C”) with **site favicons** in circles.
  * If favicon missing, fall back to letter avatar.

B) Dashboard hierarchy

* Stop giving every metric equal weight.
* Make “Episode credits remaining” the hero metric card (bigger, more prominent).
* Convert other metrics (Shows / Episodes / Generating / Total plays) into compact cards or chips.
* If possible, add tiny deltas/sparklines (subtle, not noisy).

C) Recent episodes list → structured rows

* Convert “Recent episodes” into a table-like list with columns:

  * Title
  * Show
  * Status pill (Published / Generating / Canceled)
  * Age (e.g., 5d ago)
  * Plays (if available)
* Implement consistent **status pills** with muted semantic colors.

D) Remove duplication

* “Episodes by show” and “Your shows” overlap.
* Keep “Your shows” as the management list.
* Replace “Episodes by show” with either:

  * a small distribution chart card, OR
  * “Top episode” / “Listener retention highlight” card.
* Add good empty states (e.g., CNN has 0 episodes → nice empty card with CTA).

E) Micro polish

* Add skeleton loading for generating states.
* Add consistent hover/active states for rows and cards.

## Implementation notes

* Keep changes incremental and clean: no over-engineering.
* Apply tokens globally (tailwind config / CSS variables if used) so marketing and app share the same visual DNA.
* Make sure accessibility stays good (contrast, focus rings).
* After implementing, do a pass specifically hunting “template vibes”:

  * too many identical cards
  * too much centered symmetry
  * too many buzzwords and superlatives
  * unverified stats/claims

Deliverables:

1. Updated design tokens (fonts, radii, shadows, borders, accent).
2. Updated `/` marketing layout + copy per above.
3. Updated `/app` dashboard layout + styling per above.
4. Before/after notes summarizing what changed and why it reduces “AI template” feel.
