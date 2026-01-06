Update the “New show” onboarding at `/app/onboarding` to make detection + intent clearer.

GOAL
When a user pastes a URL, show a confident preview of what was detected, and let them choose:

1. Create ONE episode from this link
2. Create a SHOW that auto-syncs new posts (via RSS discovery)

FRONTEND (ONBOARDING UI)

* After “Continue”, replace the current vague “Post detected / Just this one post” UI with a large preview card:

  * big hero image (16:9), title (2 lines), excerpt (1–3 lines)
  * metadata row: author • site • published date • est. read time
  * “Open original” link (canonical URL)
  * “Not the right post?” link (edit URL)
* Buttons:

  * Primary: “Create one episode” (helper: generate audio for this post only)
  * Secondary (only if feed found): “Create show & auto-sync” (helper: watch feed + generate new episodes)
* If detection confidence is low, show 2–3 candidate preview cards and require user selection.

BACKEND (DETECT SOURCE RESPONSE)
Refactor the existing detect endpoint to return structured data:

{
kind: "article" | "feed" | "homepage" | "unknown",
confidence: "high" | "medium" | "low",
inputUrl,
canonicalUrl?,
articlePreview?: { title?, imageUrl?, excerpt?, author?, publishedAt?, readTimeMinutes?, siteName? },
feedPreview?: { feedUrl, title?, description?, sampleItems?: [{title?, url?, publishedAt?}] },
candidates?: [{ canonicalUrl, articlePreview, confidence }]
}

Detection requirements:

* Extract preview via OpenGraph + JSON-LD + canonical + meta description (fallback).
* Compute read time from word count.
* Discover RSS/Atom via `<link rel="alternate" type="application/rss+xml|application/atom+xml">` and a few common heuristics (/feed, /rss, /atom.xml).
* If feed is valid, return feedPreview with ~3 latest items.

CREATE ACTIONS

* “Create one episode” → create episode from canonicalUrl (store preview metadata).
* “Create show & auto-sync” → create show from feedUrl + store settings:

  * autoSync = true
  * createDraftsFirst = true (default)
    (Optional) Add a small “Connect a source” section that accepts homepage/post URL and uses the same RSS discovery; do NOT implement OAuth in this pass.

DONE WHEN

* Preview makes it obvious the right post was detected.
* No “Just this one post” phrasing; user chooses one-off vs auto-sync.
* RSS-based auto-sync works when a feed is discoverable; OAuth is out of scope.
