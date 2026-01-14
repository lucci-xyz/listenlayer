import { NextResponse } from "next/server";
import { z } from "zod";
import { JSDOM } from "jsdom";
import Parser from "rss-parser";

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
    const response = await fetch(url, { 
      redirect: "follow",
      headers: { "User-Agent": "ListenLayer/1.0" }
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

function isArticlePage(doc: Document, pathname: string): boolean {
  // Check for article-like URLs
  if (pathname.match(/\/\d{4}\/\d{2}\//) || pathname.includes("/post/") || pathname.includes("/p/")) {
    return true;
  }
  // Check for article meta tags
  if (doc.querySelector('meta[property="og:type"][content="article"]')) {
    return true;
  }
  if (doc.querySelector('article') || doc.querySelector('[itemprop="articleBody"]')) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const inputUrl = parsed.data.url;

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
    const response = await fetch(inputUrl, { 
      redirect: "follow",
      headers: { "User-Agent": "ListenLayer/1.0" }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const finalUrl = response.url;
    const urlObj = new URL(finalUrl);
    const html = await response.text();
    const dom = new JSDOM(html, { url: finalUrl });
    const doc = dom.window.document;

    // Extract metadata
    const getMeta = (selector: string) => doc.querySelector(selector)?.getAttribute("content") || "";
    const displayName = getMeta('meta[property="og:site_name"]') || 
                       getMeta('meta[property="og:title"]') || 
                       doc.title || 
                       urlObj.hostname;
    const faviconUrl = doc.querySelector('link[rel*="icon"]')?.getAttribute("href") || 
                       `${urlObj.origin}/favicon.ico`;
    const canonicalUrl = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || finalUrl;
    
    const platform = detectPlatform(finalUrl, html);

    // Discover feeds from link tags
    const feedLinks = doc.querySelectorAll('link[rel="alternate"][type*="rss"], link[rel="alternate"][type*="atom"]');
    const feeds: FeedInfo[] = [];

    for (const link of Array.from(feedLinks) as Element[]) {
      const href = link.getAttribute("href");
      if (!href) continue;
      
      const feedUrl = new URL(href, finalUrl).href;
      const feedInfo = await isValidFeed(feedUrl);
      if (feedInfo) {
        feeds.push(feedInfo);
      }
    }

    // If no feeds found via link tags, try common endpoints
    if (feeds.length === 0) {
      const commonPaths = ["/feed", "/rss", "/rss.xml", "/feed.xml", "/atom.xml", "/index.xml"];
      
      // For Substack, prioritize /feed
      if (platform === "substack") {
        commonPaths.unshift("/feed");
      }

      for (const path of commonPaths) {
        const feedUrl = `${urlObj.origin}${path}`;
        const feedInfo = await isValidFeed(feedUrl);
        if (feedInfo) {
          feeds.push(feedInfo);
          break; // Found one, that's enough
        }
      }
    }

    // Determine the kind
    let kind: DiscoveryResult["kind"] = "website";
    if (feeds.length > 0) {
      kind = "feed";
    } else if (isArticlePage(doc, urlObj.pathname)) {
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
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
