import { NextResponse } from "next/server";
import { z } from "zod";
import Parser from "rss-parser";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isAllowedAppOrigin } from "@/lib/security";
import { extractLinkTags, extractMetaContent, extractTitleFromHtml } from "@/lib/html";
import { validateExternalUrl, SSRFError } from "@/lib/url-validator";
import { fetchWithTimeout, feedHeaders, browserLikeHeaders } from "@/lib/fetch";
import { sanitizeErrorMessage } from "@/lib/errors";

const schema = z.object({
  url: z.string().url(),
});

type FeedInfo = {
  url: string;
  title?: string;
  type: "rss" | "atom";
  itemCount?: number;
  latestItemTitle?: string;
  latestItemUrl?: string;
};

type DiscoveryResult = {
  kind: "feed" | "article" | "website" | "unknown";
  platformHint?: string | null;
  feeds: FeedInfo[];
  recommendedFeedUrl?: string | null;
  canonicalUrl: string;
  origin: string;
  displayName: string;
  faviconUrl?: string | null;
};

async function isValidFeed(url: string): Promise<FeedInfo | null> {
  try {
    const parser = new Parser();
    const response = await fetchWithTimeout(url, { 
      redirect: "follow",
      timeoutMs: 10000,
      headers: feedHeaders
    });
    if (!response.ok) return null;
    
    const text = await response.text();
    if (!text.includes("<rss") && !text.includes("<feed") && !text.includes("<channel")) {
      return null;
    }
    
    const feed = await parser.parseString(text);
    return {
      url,
      title: feed.title,
      type: text.includes("<feed") ? "atom" : "rss",
      itemCount: feed.items?.length || 0,
      latestItemTitle: feed.items?.[0]?.title,
      latestItemUrl: feed.items?.[0]?.link as string | undefined,
    };
  } catch {
    return null;
  }
}

function detectPlatform(url: string, html: string): string | null {
  const hostname = new URL(url).hostname;
  
  if (hostname.includes("substack.com") || hostname.endsWith(".substack.com")) {
    return "substack";
  }
  if (hostname.includes("medium.com") || html.includes("Medium")) {
    return "medium";
  }
  if (html.includes("wp-content") || html.includes("wordpress")) {
    return "wordpress";
  }
  if (html.includes("ghost")) {
    return "ghost";
  }
  return null;
}

function isArticlePage(html: string, pathname: string): boolean {
  // Check for article-like URLs
  if (pathname.match(/\/\d{4}\/\d{2}\//) || pathname.includes("/post/") || pathname.includes("/p/")) {
    return true;
  }
  // Check for article meta tags / structural hints
  const ogType = (extractMetaContent(html, "og:type") || "").toLowerCase();
  if (ogType.includes("article") || ogType.includes("news") || ogType.includes("story")) {
    return true;
  }
  if (/<article\b/i.test(html) || /itemprop\s*=\s*["']articleBody["']/i.test(html)) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  if (!isAllowedAppOrigin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rate = await rateLimit(`discover:${ip}`, "discover");
  if (!rate.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const inputUrl = parsed.data.url;

  // SSRF validation
  try {
    validateExternalUrl(inputUrl);
  } catch (error) {
    if (error instanceof SSRFError) {
      return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    // First check if the URL itself is a feed
    const directFeed = await isValidFeed(inputUrl);
    if (directFeed) {
      const urlObj = new URL(inputUrl);
      return NextResponse.json({
        kind: "feed",
        feeds: [directFeed],
        recommendedFeedUrl: inputUrl,
        canonicalUrl: inputUrl,
        origin: urlObj.origin,
        displayName: directFeed.title || urlObj.hostname,
        faviconUrl: `${urlObj.origin}/favicon.ico`,
      } satisfies DiscoveryResult);
    }

    // Fetch the page HTML
    const response = await fetchWithTimeout(inputUrl, { 
      redirect: "follow",
      timeoutMs: 15000,
      headers: browserLikeHeaders
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const finalUrl = response.url;
    const urlObj = new URL(finalUrl);
    const html = await response.text();

    // Extract metadata (no DOM dependency)
    const displayName =
      extractMetaContent(html, "og:site_name") ||
      extractMetaContent(html, "og:title") ||
      extractTitleFromHtml(html) ||
      urlObj.hostname;

    const linkTags = extractLinkTags(html);
    const iconHref =
      linkTags.find((l) => (l["rel"] || "").toLowerCase().includes("icon"))?.["href"] ||
      null;
    const faviconUrl = iconHref || `${urlObj.origin}/favicon.ico`;

    const canonicalHref =
      linkTags.find((l) => (l["rel"] || "").toLowerCase() === "canonical")?.["href"] ||
      null;
    const canonicalUrl = canonicalHref || finalUrl;
    
    const platform = detectPlatform(finalUrl, html);

    // Discover feeds from link tags - validate in parallel
    const alternateLinks = linkTags.filter((l) => {
      const rel = (l["rel"] || "").toLowerCase();
      const type = (l["type"] || "").toLowerCase();
      return rel.includes("alternate") && (type.includes("rss") || type.includes("atom"));
    });
    
    const alternateFeedUrls = alternateLinks
      .map(link => link["href"])
      .filter((href): href is string => Boolean(href))
      .map(href => new URL(href, finalUrl).href);
    
    // Validate all alternate feeds in parallel
    const alternateFeedResults = await Promise.all(
      alternateFeedUrls.map(url => isValidFeed(url))
    );
    const feeds: FeedInfo[] = alternateFeedResults.filter((f): f is FeedInfo => f !== null);

    // If no feeds found via link tags, try common endpoints in parallel
    if (feeds.length === 0) {
      const commonPaths = ["/feed", "/rss", "/rss.xml", "/feed.xml", "/atom.xml", "/index.xml"];
      
      // For Substack, prioritize /feed
      if (platform === "substack") {
        commonPaths.unshift("/feed");
      }

      // Validate all common paths in parallel
      const commonFeedUrls = commonPaths.map(path => `${urlObj.origin}${path}`);
      const commonFeedResults = await Promise.all(
        commonFeedUrls.map(url => isValidFeed(url))
      );
      
      // Take the first valid feed found
      const firstValid = commonFeedResults.find((f): f is FeedInfo => f !== null);
      if (firstValid) {
        feeds.push(firstValid);
      }
    }

    // Determine the kind
    let kind: DiscoveryResult["kind"] = "website";
    if (feeds.length > 0) {
      kind = "feed";
    } else if (isArticlePage(html, urlObj.pathname)) {
      kind = "article";
    }

    return NextResponse.json({
      kind,
      platformHint: platform,
      feeds,
      recommendedFeedUrl: feeds[0]?.url || null,
      canonicalUrl,
      origin: urlObj.origin,
      displayName,
      faviconUrl: faviconUrl.startsWith("http") ? faviconUrl : new URL(faviconUrl, finalUrl).href,
    } satisfies DiscoveryResult);
  } catch (error) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(error) },
      { status: 500 }
    );
  }
}
