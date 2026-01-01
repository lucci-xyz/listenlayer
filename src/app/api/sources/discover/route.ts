import { NextResponse } from "next/server";
import { z } from "zod";
import { JSDOM } from "jsdom";
import Parser from "rss-parser";

const schema = z.object({
  url: z.string().min(3),
});

const MAX_BYTES = 800_000;

function ensureUrl(raw: string) {
  if (!/^https?:\/\//i.test(raw)) {
    return `https://${raw}`;
  }
  return raw;
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
    finalUrl: response.url,
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

function absoluteUrl(maybeUrl: string, base: string) {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return maybeUrl;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const normalized = ensureUrl(parsed.data.url.trim());
    const { text, contentType, finalUrl } = await fetchText(normalized);

    if (looksLikeRss(text, contentType)) {
      const parser = new Parser();
      let feedTitle = "";
      let feedLink = "";
      try {
        const feed = await parser.parseString(text);
        feedTitle = feed.title || "";
        feedLink = feed.link || finalUrl;
      } catch {
        feedTitle = "";
      }

      const domain = new URL(feedLink || finalUrl).hostname;
      return NextResponse.json({
        detectedType: "RSS",
        sourceUrl: finalUrl,
        pageUrl: feedLink || finalUrl,
        siteName: feedTitle || domain,
        domain,
        iconUrl: `https://${domain}/favicon.ico`,
        rssUrl: finalUrl,
      });
    }

    const dom = new JSDOM(text, { url: finalUrl });
    const doc = dom.window.document;
    const domain = new URL(finalUrl).hostname;

    const title =
      doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content") ||
      doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      doc.title ||
      domain;

    const iconHref =
      doc.querySelector('link[rel~="icon"]')?.getAttribute("href") ||
      doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ||
      "/favicon.ico";

    const rssHref =
      doc.querySelector('link[rel~="alternate"][type="application/rss+xml"]')?.getAttribute("href") ||
      doc.querySelector('link[rel~="alternate"][type="application/atom+xml"]')?.getAttribute("href") ||
      null;

    let discoveredRss = rssHref ? absoluteUrl(rssHref, finalUrl) : null;

    if (!discoveredRss) {
      const candidates = [
        "/feed",
        "/feed.xml",
        "/rss",
        "/rss.xml",
        "/atom.xml",
        "/index.xml",
      ];
      for (const path of candidates) {
        try {
          const candidateUrl = new URL(path, finalUrl).toString();
          const candidate = await fetchText(candidateUrl);
          if (looksLikeRss(candidate.text, candidate.contentType)) {
            discoveredRss = candidateUrl;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    const detectedType = discoveredRss ? "RSS" : "URL";
    const sourceUrl = discoveredRss || finalUrl;

    return NextResponse.json({
      detectedType,
      sourceUrl,
      pageUrl: finalUrl,
      siteName: title,
      domain,
      iconUrl: absoluteUrl(iconHref, finalUrl),
      rssUrl: discoveredRss,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
