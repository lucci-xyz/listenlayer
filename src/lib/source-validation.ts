import { extractReadableText } from "@/lib/content";
import { JSDOM } from "jsdom";

const MAX_BYTES = 800_000;

export async function fetchHtmlSnippet(url: string) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const sliced = buffer.subarray(0, MAX_BYTES);
  return {
    html: sliced.toString("utf-8"),
    finalUrl: response.url || url,
  };
}

export async function validateReadableUrl(url: string, minWords = 300) {
  const { html, finalUrl } = await fetchHtmlSnippet(url);
  const text = extractReadableText(html, finalUrl);
  const dom = new JSDOM(html, { url: finalUrl });
  const doc = dom.window.document;
  if (!text) {
    throw new Error("No readable article text found. Use a specific article URL.");
  }
  const words = text.split(/\s+/).filter(Boolean);
  const looksLikeArticle = looksLikeArticleUrl(finalUrl) || hasArticleMetadata(doc, html);
  const relaxedThreshold = 120;
  if (words.length < minWords && (!looksLikeArticle || words.length < relaxedThreshold)) {
    throw new Error("Not enough article text to generate an episode. Use a specific article URL.");
  }
  return { finalUrl, textLength: text.length };
}

function looksLikeArticleUrl(value: string) {
  try {
    const parsed = new URL(value);
    const segments = parsed.pathname.split("/").filter(Boolean);
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

function getMetaContent(doc: Document, selector: string) {
  return doc.querySelector(selector)?.getAttribute("content") || "";
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
