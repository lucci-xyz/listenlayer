Update the ListenLayer onboarding UX to be non-technical-user friendly, remove jargon (RSS), and fix the current “Website detected but Continue is disabled” bug. Keep all existing backend logic working; this is primarily UI flow + detection improvements. Do not break existing workspace pages, generation, embeds, or analytics.

Context (current UI at /app/onboarding):
- User pastes a URL and clicks “Detect source”.
- UI shows results (e.g., “Website detected”, “No RSS feed found. Paste a specific article URL instead.”).
- Radio options exist: “Use RSS feed” / “Use website URL”.
- In some cases (e.g., Substack profile URL like https://substack.com/@username?...), it detects “Substack” and “Website detected” but “Continue to format” becomes non-clickable (disabled). This is confusing and must be fixed.

Primary goals:
1) Make onboarding understandable for non-technical people:
   - Lead with “Create audio from a link” instead of “Create a workspace”.
   - Hide the term “RSS” behind “Advanced”. Default language should be “Auto-sync feed”.
2) Progressive disclosure:
   - Users paste a link, we detect what it is, then ask if they want ongoing auto-sync only when relevant.
   - If recurring content is detected (feed found), offer “Keep it synced (recommended)” vs “Just this one”.
3) Fix the bug where “Use website URL” is selectable but user cannot continue.
4) Improve detection for Substack links:
   - Recognize Substack profile URLs and resolve them to the publication/home URL and then discover the feed at {origin}/feed.
   - Substack publications are expected to have RSS at /feed on the publication subdomain (e.g., https://example.substack.com/feed). Implement this path when Substack is detected.

Design/UX requirements:
- One primary action per step.
- No “RSS” jargon in the main UI.
- Clear next steps when detection fails.
- Keep UI clean/minimal, using shadcn/ui components (Card, Button, Dialog, Tabs/SegmentedControl, Badge, Alert).
- Make the flow feel like: paste → detect → generate → optional “save workspace/auto-sync”.

Implementation plan (execute all):

A) Rename and restructure onboarding to start with a “Create audio” mental model
- Change the heading from “Add a new workspace” to something like:
  - Title: “Create audio from a link”
  - Subtitle: “Paste a link once. We’ll handle the rest.”
- The user should not be forced to create a workspace first. Instead:
  - Step 1: Paste link
  - Step 2: Confirm what we found + choose between:
     - “Keep it synced (recommended)” (only shown if feed discovered OR if we can infer recurring publication)
     - “Just this one”
  - Step 3: Choose format (existing format page) and proceed

B) Change option labels to non-technical language + hide RSS
- Replace “Use RSS feed” with “Auto-sync feed (recommended)”
- Replace “Use website URL” with “Use this website link”
- Add “Advanced” disclosure that reveals the technical details:
  - Show the detected feed URL(s)
  - Option to paste an RSS URL manually
  - Label it explicitly “RSS (advanced)”
- Default selection should be “Auto-sync feed” if found; otherwise “Just this one” (article mode).

C) Fix gating logic for Continue (the current bug)
Currently: user can select “Use website URL” but Continue is disabled.
Fix:
- Define a clear “supported next step” predicate and use it both for:
  - enabling/disabling “Continue”
  - what options are shown as selectable
- Implement:
  - If feed discovered => Continue enabled (workspace/auto-sync path available)
  - Else if URL is a specific article/post URL => Continue enabled (one-off generation path available)
  - Else (homepage/profile/non-article and no feed) => Continue disabled and show a helpful message with actions:
      - “Paste a specific post link”
      - “Or paste your homepage (we’ll try again)”
- IMPORTANT: Do not show a selectable option that still blocks Continue. If an option is shown, it must be viable OR show a clear “Coming soon” disabled state.

D) Improve detection: resolve and canonicalize URLs
- Always canonicalize the input URL:
  - trim, ensure scheme
  - follow redirects (fetch with redirect: "follow")
  - keep final URL and origin
- Parse HTML for <link rel="canonical"> and OpenGraph if needed to derive a canonical URL for detection.

E) Substack-specific improvement (critical)
When a pasted URL is on substack.com and matches a profile style (e.g., /@username, /profile, or has utm tracking):
- Fetch the page and derive the publication/home URL.
  - Prefer canonical link tags or OpenGraph site URL.
  - If the page redirects to a subdomain like https://username.substack.com, use that origin.
- After obtaining the publication origin, attempt feed autodiscovery:
  - Try `${origin}/feed` (Substack standard) first.
  - Then try head <link rel="alternate"> from the publication homepage.
- If `${origin}/feed` returns valid RSS/Atom, mark “Auto-sync feed found” and proceed.
- If still no feed, treat it as a “website link” and require a specific post URL; show guidance.

F) Detection engine behavior (general)
Implement robust feed discovery for generic websites:
1) Fetch HTML of the candidate page (homepage).
2) Look for <link rel="alternate" type="application/rss+xml|application/atom+xml"> candidates, resolve relative URLs.
3) If none, probe common endpoints on the origin:
   - /rss.xml, /feed, /feed.xml, /rss, /atom.xml, /index.xml
4) Validate a candidate as a feed by:
   - fetching it
   - checking for <rss or <feed in first ~2KB
   - parsing with rss-parser
Return a structured result:
- kind: "feed" | "article" | "website" | "unknown"
- platformHint: "substack" | "medium" | "wordpress" | etc (if detected)
- feeds: array of { url, title?, type: rss|atom, itemCount?, latestItemTitle? }
- recommendedFeedUrl
- canonicalUrl, origin, displayName, faviconUrl

G) UI behavior on detection results
- If feed found:
  - Show a success state: “We can keep this updated automatically.”
  - Default selection: “Keep it synced (recommended)”
  - Continue enabled
- If article URL:
  - Show: “We’ll generate audio for this post.”
  - Default selection: “Just this one”
  - Continue enabled
- If website detected but no feed and not an article:
  - Show an Alert:
    - “We couldn’t find an auto-sync feed for this link.”
    - “Paste a specific article link, or paste your homepage again.”
  - Continue disabled
  - Provide an inline example placeholder for post URLs
- Always show platform badge when detected (e.g., “Substack detected”) but keep it subtle.

H) Workspace creation behavior
- If user chooses “Keep it synced”:
  - Create a workspace (Site) + Source using the recommended feed URL (RSS/Atom) behind the scenes.
  - Name workspace automatically from extracted title/OG title; allow edit via small “Edit name” link.
  - Then send them to format step.
- If user chooses “Just this one”:
  - Create a lightweight “draft generation” flow:
    - Either create a workspace silently (minimal default) OR create an “episode draft” first and offer to save later.
  - MVP acceptable: create a workspace automatically but label it as “Project” or “Workspace” only later.
  - The important part: user experience begins with “Create audio” not “Manage workspaces”.

I) Update copy everywhere in onboarding
- Replace “Detect source” with:
  - “Continue” (and auto-detect on paste/blur), OR keep “Detect” but the primary CTA should lead forward.
- Ensure the call-to-action reads like a human action:
  - “Create audio” / “Continue to format”
- Keep buttons always enabled only when the next step is possible; otherwise show why.

J) Tests / sanity checks
Add lightweight tests or at least a manual checklist documented in README:
- Pasting a valid RSS URL => auto-sync option available, continue works.
- Pasting a blog homepage with <link rel="alternate"> => feed found, continue works.
- Pasting Substack profile URL (substack.com/@user...) => resolves to publication, detects /feed, continue works.
- Pasting a non-feed homepage without a feed => continue disabled with clear guidance.
- Pasting a specific article URL => “Just this one” path works and proceeds.

Deliverables:
- Updated onboarding UI with the above UX.
- Fixed Continue button gating bug.
- Substack profile URL detection improved to discover /feed on publication origin.
- No TODOs; app runs locally.

Now implement these changes in the existing repository. Ensure the UX is simple for non-technical users and that the “website detected but can’t continue” bug is gone.
