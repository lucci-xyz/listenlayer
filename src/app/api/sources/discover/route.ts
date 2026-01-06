import { NextResponse } from "next/server";
import { z } from "zod";
import { JSDOM } from "jsdom";
import Parser from "rss-parser";
import { extractReadableText } from "@/lib/content";

const schema = z.object({
  url: z.string().min(3),
});

const MAX_BYTES = 800_000;
const COMMON_FEED_PATHS = [
  "/feed",
  "/feed.xml",
  "/rss",
  "/rss.xml",
  "/atom.xml",
  "/index.xml",
];

type FeedType = "rss" | "atom";

type FeedSampleItem = {
  title?: string;
  url?: string;
  publishedAt?: string;
};

type FeedPreview = {
  feedUrl: string;
  title?: string;
  description?: string;
  sampleItems?: FeedSampleItem[];
};

type ArticlePreview = {
  title?: string;
  imageUrl?: string;
  excerpt?: string;
  author?: string;
  publishedAt?: string;
  readTimeMinutes?: number;
  siteName?: string;
};

type Candidate = {
  canonicalUrl: string;
  articlePreview: ArticlePreview;
  confidence: "high" | "medium" | "low";
};

type DiscoverResult = {
  kind: "feed" | "article" | "homepage" | "unknown";
  confidence: "high" | "medium" | "low";
  inputUrl: string;
  canonicalUrl?: string;
  articlePreview?: ArticlePreview;
  feedPreview?: FeedPreview;
  candidates?: Candidate[];
  // Legacy fields for backward compatibility
  platformHint?: string | null;
  origin: string;
  displayName: string;
  faviconUrl?: string | null;
};

function ensureUrl(raw: string) {
  if (!/^https?:\/\//i.test(raw)) {
    return `https://${raw}`;
  }
  return raw;
}

function absoluteUrl(maybeUrl: string, base: string) {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return maybeUrl;
  }
}

async function fetchText(url: string) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const sliced = buffer.subarray(0, MAX_BYTES);
  return {
    text: sliced.toString("utf-8"),
    contentType: response.headers.get("content-type") || "",
    finalUrl: response.url || url,
  };
}

function looksLikeRss(text: string, contentType: string) {
  const header = contentType.toLowerCase();
  if (header.includes("rss") || header.includes("atom")) return true;
  if (header.includes("xml")) {
    return /<rss\b|<feed\b/i.test(text);
  }
  return /<rss\b|<feed\b/i.test(text);
}

function detectFeedType(text: string): FeedType {
  return /<feed\b/i.test(text) ? "atom" : "rss";
}

const parser = new Parser();

type ParsedFeed = {
  url: string;
  title?: string;
  description?: string;
  type: FeedType;
  items: FeedSampleItem[];
};

async function parseFeedFromText(text: string, url: string): Promise<ParsedFeed | null> {
  if (!looksLikeRss(text.slice(0, 2048), "")) return null;
  try {
    const feed = await parser.parseString(text);
    const items = (feed.items || []).slice(0, 5).map((item) => ({
      title: item.title || undefined,
      url:
        (typeof item.link === "string" && item.link) ||
        (typeof item.guid === "string" && item.guid) ||
        undefined,
      publishedAt: item.pubDate || item.isoDate || undefined,
    }));
    return {
      url,
      title: feed.title || undefined,
      description: feed.description || undefined,
      type: detectFeedType(text),
      items,
    };
  } catch {
    return null;
  }
}

async function parseFeedFromUrl(url: string): Promise<ParsedFeed | null> {
  try {
    const { text, contentType, finalUrl } = await fetchText(url);
    if (!looksLikeRss(text.slice(0, 2048), contentType)) return null;
    const feed = await parseFeedFromText(text, finalUrl);
    return feed ? { ...feed, url: finalUrl } : null;
  } catch {
    return null;
  }
}

function getMetaContent(doc: Document, selector: string) {
  return doc.querySelector(selector)?.getAttribute("content") || "";
}

function getCanonicalUrl(doc: Document, fallback: string) {
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  const ogUrl = getMetaContent(doc, 'meta[property="og:url"]');
  const candidate = canonical || ogUrl || fallback;
  return absoluteUrl(candidate, fallback);
}

function getDisplayName(doc: Document, fallback: string) {
  return (
    getMetaContent(doc, 'meta[property="og:site_name"]') ||
    getMetaContent(doc, 'meta[property="og:title"]') ||
    getMetaContent(doc, 'meta[name="application-name"]') ||
    doc.title ||
    fallback
  );
}

function getFaviconUrl(doc: Document, fallback: string) {
  const iconHref =
    doc.querySelector('link[rel~="icon"]')?.getAttribute("href") ||
    doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ||
    "/favicon.ico";
  return absoluteUrl(iconHref, fallback);
}

function detectPlatform(hostname: string, doc: Document, html: string) {
  if (hostname.endsWith("substack.com")) return "substack";
  if (hostname.endsWith("medium.com")) return "medium";
  const generator = doc.querySelector('meta[name="generator"]')?.getAttribute("content") || "";
  if (generator.toLowerCase().includes("wordpress") || html.includes("wp-content")) {
    return "wordpress";
  }
  return null;
}

function looksLikeArticleUrl(value: string) {
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return false;
    const last = segments[segments.length - 1] || "";
    if (last.length < 6) return false;
    const hasYear = segments.some((segment) => /^(19|20)\d{2}$/.test(segment));
    const slugLike = /[a-zA-Z]/.test(last) && /[-_]/.test(last);
    const hasLive = /live|blog|story|article|post|news/i.test(last);
    return hasYear || slugLike || hasLive;
  } catch {
    return false;
  }
}

function hasArticleMetadata(doc: Document, html: string) {
  const ogType = getMetaContent(doc, 'meta[property="og:type"]').toLowerCase();
  if (ogType.includes("article") || ogType.includes("news") || ogType.includes("story")) return true;
  if (doc.querySelector('meta[property="article:section"]')) return true;
  const parsely = doc.querySelector('meta[name="parsely-type"]')?.getAttribute("content") || "";
  if (/post|story|article|live/i.test(parsely)) return true;

  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  for (const script of scripts) {
    const content = script.textContent || "";
    if (!content.trim()) continue;
    try {
      const json = JSON.parse(content);
      const nodes = Array.isArray(json) ? json : [json];
      for (const node of nodes) {
        const type = node?.["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((t: string) => /Article|NewsArticle|BlogPosting|LiveBlogPosting/i.test(t))) {
          return true;
        }
      }
    } catch {
      continue;
    }
  }

  return /LiveBlogPosting|NewsArticle|BlogPosting/i.test(html);
}

function extractArticlePreview(doc: Document, html: string, canonicalUrl: string): ArticlePreview {
  // Title
  const title =
    getMetaContent(doc, 'meta[property="og:title"]') ||
    getMetaContent(doc, 'meta[name="twitter:title"]') ||
    doc.querySelector("h1")?.textContent?.trim() ||
    doc.title ||
    undefined;

  // Image
  const imageUrl =
    getMetaContent(doc, 'meta[property="og:image"]') ||
    getMetaContent(doc, 'meta[name="twitter:image"]') ||
    undefined;

  // Excerpt
  const ogDescription = getMetaContent(doc, 'meta[property="og:description"]');
  const metaDescription = getMetaContent(doc, 'meta[name="description"]');
  const twitterDescription = getMetaContent(doc, 'meta[name="twitter:description"]');
  const excerpt = ogDescription || metaDescription || twitterDescription || undefined;

  // Author - try JSON-LD first, then meta tags
  let author: string | undefined;
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  for (const script of scripts) {
    try {
      const json = JSON.parse(script.textContent || "");
      const nodes = Array.isArray(json) ? json : [json];
      for (const node of nodes) {
        if (node?.author?.name) {
          author = node.author.name;
          break;
        }
        if (typeof node?.author === "string") {
          author = node.author;
          break;
        }
        if (Array.isArray(node?.author) && node.author[0]?.name) {
          author = node.author[0].name;
          break;
        }
      }
      if (author) break;
    } catch {
      continue;
    }
  }
  if (!author) {
    author =
      getMetaContent(doc, 'meta[name="author"]') ||
      getMetaContent(doc, 'meta[property="article:author"]') ||
      undefined;
  }

  // Published date - try JSON-LD first, then meta tags
  let publishedAt: string | undefined;
  for (const script of scripts) {
    try {
      const json = JSON.parse(script.textContent || "");
      const nodes = Array.isArray(json) ? json : [json];
      for (const node of nodes) {
        if (node?.datePublished) {
          publishedAt = node.datePublished;
          break;
        }
      }
      if (publishedAt) break;
    } catch {
      continue;
    }
  }
  if (!publishedAt) {
    publishedAt =
      getMetaContent(doc, 'meta[property="article:published_time"]') ||
      getMetaContent(doc, 'meta[name="date"]') ||
      undefined;
  }

  // Site name
  const siteName =
    getMetaContent(doc, 'meta[property="og:site_name"]') ||
    getMetaContent(doc, 'meta[name="application-name"]') ||
    undefined;

  // Read time - compute from word count
  const readableText = extractReadableText(html, canonicalUrl);
  const wordCount = readableText.split(/\s+/).filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200)); // 200 WPM average

  return {
    title,
    imageUrl: imageUrl ? absoluteUrl(imageUrl, canonicalUrl) : undefined,
    excerpt,
    author,
    publishedAt,
    readTimeMinutes,
    siteName,
  };
}

async function discoverFeedsFromDocument(
  doc: Document,
  baseUrl: string,
  origin: string
): Promise<ParsedFeed[]> {
  const candidates = new Set<string>();
  const alternates = Array.from(doc.querySelectorAll('link[rel~="alternate"]'));
  for (const link of alternates) {
    const type = link.getAttribute("type") || "";
    if (!type || /(rss|atom|xml)/i.test(type)) {
      const href = link.getAttribute("href") || "";
      if (href) {
        candidates.add(absoluteUrl(href, baseUrl));
      }
    }
  }
  for (const path of COMMON_FEED_PATHS) {
    try {
      candidates.add(new URL(path, origin).toString());
    } catch {
      continue;
    }
  }

  const feeds: ParsedFeed[] = [];
  for (const candidate of candidates) {
    const feed = await parseFeedFromUrl(candidate);
    if (feed) {
      feeds.push(feed);
    }
    if (feeds.length >= 3) break;
  }
  return feeds;
}

function getSubstackOrigin(finalUrl: string, doc: Document) {
  const parsed = new URL(finalUrl);
  const hostname = parsed.hostname;
  if (hostname.endsWith(".substack.com") && hostname !== "substack.com") {
    return parsed.origin;
  }
  if (hostname === "substack.com" || hostname === "www.substack.com") {
    const canonical = getCanonicalUrl(doc, finalUrl);
    try {
      const canonicalHost = new URL(canonical).hostname;
      if (canonicalHost.endsWith(".substack.com") && canonicalHost !== "substack.com") {
        return new URL(canonical).origin;
      }
      if (canonicalHost !== "substack.com" && canonicalHost !== "www.substack.com") {
        return new URL(canonical).origin;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function guessSubstackOriginFromProfile(pathname: string) {
  const match = pathname.match(/^\/@([^/?#]+)/);
  if (!match) return null;
  const slug = match[1];
  if (!slug) return null;
  return `https://${slug}.substack.com`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const inputUrl = parsed.data.url.trim();
    const normalized = ensureUrl(inputUrl);
    const { text, contentType, finalUrl } = await fetchText(normalized);

    // Direct RSS/Atom feed
    if (looksLikeRss(text.slice(0, 2048), contentType)) {
      const feed = await parseFeedFromText(text, finalUrl);
      if (feed) {
        const host = new URL(finalUrl).hostname;
        return NextResponse.json({
          kind: "feed",
          confidence: "high",
          inputUrl,
          canonicalUrl: feed.url,
          feedPreview: {
            feedUrl: feed.url,
            title: feed.title,
            description: feed.description,
            sampleItems: feed.items.slice(0, 3),
          },
          platformHint: detectPlatform(host, new JSDOM(text).window.document, text),
          origin: new URL(feed.url).origin,
          displayName: feed.title || host,
          faviconUrl: `https://${host}/favicon.ico`,
        } satisfies DiscoverResult);
      }
    }

    const dom = new JSDOM(text, { url: finalUrl });
    const doc = dom.window.document;
    const canonicalUrl = getCanonicalUrl(doc, finalUrl);
    let origin = (() => {
      try {
        return new URL(canonicalUrl).origin;
      } catch {
        return new URL(finalUrl).origin;
      }
    })();
    let displayName = getDisplayName(doc, new URL(origin).hostname);
    let faviconUrl = getFaviconUrl(doc, canonicalUrl);
    const platformHint = detectPlatform(new URL(finalUrl).hostname, doc, text);

    const pathname = new URL(finalUrl).pathname;
    const isSubstackProfile =
      (new URL(finalUrl).hostname === "substack.com" ||
        new URL(finalUrl).hostname === "www.substack.com") &&
      (/^\/@/.test(pathname) || pathname.startsWith("/profile"));

    let feeds: ParsedFeed[] = [];
    let substackOrigin = getSubstackOrigin(finalUrl, doc);
    if (!substackOrigin && isSubstackProfile) {
      const guessedOrigin = guessSubstackOriginFromProfile(pathname);
      if (guessedOrigin) {
        const feed = await parseFeedFromUrl(`${guessedOrigin}/feed`);
        if (feed) {
          substackOrigin = guessedOrigin;
          feeds = [feed];
        }
      }
    }

    if (substackOrigin && feeds.length === 0) {
      const feed = await parseFeedFromUrl(`${substackOrigin}/feed`);
      if (feed) {
        feeds = [feed];
      } else {
        try {
          const home = await fetchText(substackOrigin);
          const homeDom = new JSDOM(home.text, { url: home.finalUrl });
          const homeDoc = homeDom.window.document;
          const homeCanonical = getCanonicalUrl(homeDoc, home.finalUrl);
          origin = new URL(homeCanonical).origin;
          displayName = getDisplayName(homeDoc, new URL(origin).hostname);
          faviconUrl = getFaviconUrl(homeDoc, homeCanonical);
          feeds = await discoverFeedsFromDocument(homeDoc, homeCanonical, origin);
        } catch {
          feeds = [];
        }
      }
    }

    if (!substackOrigin) {
      feeds = await discoverFeedsFromDocument(doc, canonicalUrl, origin);
    } else if (feeds.length > 0) {
      origin = substackOrigin;
      displayName = displayName || new URL(substackOrigin).hostname;
    }

    // Extract article preview for the current page
    const articlePreview = extractArticlePreview(doc, text, canonicalUrl);

    // If feeds found, return as feed with article preview as option
    if (feeds.length > 0) {
      const feedDisplayName = feeds[0]?.title || displayName;
      const primaryFeed = feeds[0];
      return NextResponse.json({
        kind: "feed",
        confidence: "high",
        inputUrl,
        canonicalUrl: substackOrigin && isSubstackProfile ? substackOrigin : canonicalUrl,
        articlePreview: articlePreview.title ? articlePreview : undefined,
        feedPreview: {
          feedUrl: primaryFeed.url,
          title: primaryFeed.title,
          description: primaryFeed.description,
          sampleItems: primaryFeed.items.slice(0, 3),
        },
        platformHint,
        origin: substackOrigin || origin,
        displayName: feedDisplayName,
        faviconUrl,
      } satisfies DiscoverResult);
    }

    // No feed found - determine if article or homepage
    const readableText = extractReadableText(text, canonicalUrl);
    const wordCount = readableText.split(/\s+/).filter(Boolean).length;
    const isArticleHint = hasArticleMetadata(doc, text) || looksLikeArticleUrl(canonicalUrl);
    const isArticle = !isSubstackProfile && (wordCount >= 300 || isArticleHint);

    if (isArticle) {
      // Determine confidence based on metadata quality
      const hasTitle = Boolean(articlePreview.title);
      const hasImage = Boolean(articlePreview.imageUrl);
      const hasExcerpt = Boolean(articlePreview.excerpt);
      const metadataScore = [hasTitle, hasImage, hasExcerpt, isArticleHint].filter(Boolean).length;
      const confidence: "high" | "medium" | "low" =
        metadataScore >= 3 ? "high" : metadataScore >= 2 ? "medium" : "low";

      return NextResponse.json({
        kind: "article",
        confidence,
        inputUrl,
        canonicalUrl,
        articlePreview,
        platformHint,
        origin,
        displayName,
        faviconUrl,
      } satisfies DiscoverResult);
    }

    // Homepage or unknown
    return NextResponse.json({
      kind: "homepage",
      confidence: "medium",
      inputUrl,
      canonicalUrl,
      platformHint,
      origin,
      displayName,
      faviconUrl,
    } satisfies DiscoverResult);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
