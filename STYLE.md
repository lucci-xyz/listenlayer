You are a UI design + front-end styling agent. Your job is to restyle this existing website to match the *visual design system* of the provided reference image. Do NOT copy any layout or content from the reference—only the style language (colors, typography, spacing, surfaces, borders, icon treatment, components, states).

## Style goal (high level)

“Calm, soft, minimal dashboard” aesthetic:

* Cool off-white / sage-gray surfaces, subtle borders, very low-contrast dividers
* Rounded cards, generous padding, almost no heavy shadows
* Desaturated teal as primary accent + warm peach as secondary accent
* Clean sans UI font + elegant serif for page titles / hero numbers
* Outline icons only, consistent stroke weight, muted color

## Color system (tokens)

Use muted, desaturated colors only. No pure black, no saturated blues, no neon.

Neutrals / surfaces:

* --bg: #CAD7D4  (sage-tinted app backdrop)
* --sidebar: #ECF1F1  (cool off-white)
* --surface: #FFFFFF  (main cards)
* --surface-2: #F3F5F5 (secondary surface fill)
* --border: #E3E8E7 (hairline dividers)
* --text: #141414 (primary text, not pure black)
* --text-muted: #6B7573 (secondary text)
* --icon: #6B7573 (icons match muted text)

Accents:

* --primary: #4E746B (muted teal)
* --primary-2: #73918A (lighter teal)
* --accent: #DD9469 (warm peach)
* --accent-2: #F6E1D8 (peach tint background)

States:

* --focus: use a subtle outline/ring in --primary-2 at low opacity
* --hover: darken surface slightly or increase border contrast slightly (never change hue)
* --active: use soft pill highlight (surface) rather than saturated fills

## Typography rules

* UI font: Inter / SF Pro / system sans (use what’s available). Weight range 400–600.
* Editorial font (titles / big metric numbers): a classy serif (e.g., “Instrument Serif”, “Fraunces”, “Source Serif”, or similar). Use sparingly.
* Hierarchy should be subtle: rely on size + weight + spacing, not loud color.

Type scale guidance:

* Page title: serif, 28–34px, 500–600
* Card title: sans, 14–16px, 600
* Body: sans, 14–15px, 400–500
* Muted labels: sans, 12–13px, 500, color --text-muted
* Big metric: serif, 28–40px, 500–600

Line height: 1.35–1.5. No tight leading.

## Layout + spacing system

* Use an 8px spacing grid.
* Cards have generous padding: 16–24px.
* Gutters between cards: 16–24px.
* Sidebar padding: 16–20px.
* Use whitespace to separate sections; minimize heavy separators.

## Surfaces, borders, radii, shadows

* Border: 1px solid var(--border), low contrast.
* Radius:

  * Cards: 14–16px
  * Inputs/buttons: 12–14px
  * Pills/chips: 999px
* Shadows: extremely soft or none. Prefer borders over shadows.

  * If needed: a subtle ambient shadow with low opacity and large blur (no harsh drop shadows).

## Components (visual rules)

### Sidebar / nav

* Sidebar uses --sidebar background.
* Nav items are simple rows with outline icons on the left.
* Active nav item is a “pill” (white surface) with subtle border, not a colored bar.
* Icon size 18–20px, stroke 1.5–1.75, color --icon.

### Cards

* White background, subtle border.
* Card header: title left, small action (icon button) right.
* Content uses muted labels and clear spacing.

### Buttons

* Primary: subtle—either white surface with teal border/text OR very light teal tint background. No saturated teal fills.
* Secondary: white surface + border.
* Icon buttons: circular/rounded, low-contrast hover.

### Inputs

* White surface, subtle border, 12–14px radius.
* Focus ring is soft teal at low opacity.
* Placeholder text uses --text-muted.

### Badges / pills

* Very light tinted background (primary-2 or accent-2) + muted text.
* No hard outlines unless needed.

### Charts / indicators

* Flat, minimal. No strong gridlines.
* Use muted teal for positive/primary and warm peach for secondary/negative.
* Legends are tiny with small colored squares/dots.

## Interaction + accessibility

* Maintain readable contrast for text (don’t go too faint).
* Hover states should be gentle: slight background tint or border contrast.
* Focus states must be visible but soft.

## Don’ts

* Don’t use bright blues, neon, or heavy gradients.
* Don’t use thick borders, sharp corners, or heavy shadows.
* Don’t use filled icon sets; outline only.
* Don’t add visual clutter (too many colors, too many lines).

## Deliverable

Apply these tokens + rules consistently across the site:

1. Define CSS variables / theme tokens
2. Restyle: background, sidebar, nav, cards, typography, buttons, inputs, tables, badges
3. Ensure spacing + radii + borders match the reference’s calm minimal vibe
4. Use an outline icon set (Lucide-style) with consistent stroke and muted color