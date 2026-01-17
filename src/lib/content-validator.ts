/**
 * Content validation for episode generation.
 * Pre-validates content length and attempts to follow "read more" links.
 */

import { extractMainTextFromHtml, extractTitleFromHtml, stripHtml } from "./html";
import { fetchWithTimeout, browserLikeHeaders } from "./fetch";
import { validateExternalUrl, SSRFError } from "./url-validator";
import { loggers } from "./logger";

const log = loggers.episode;

export const MIN_WORDS_FOR_GENERATION = 300;

export type ContentValidationResult = {
  isValid: boolean;
  wordCount: number;
  minRequired: number;
  title: string | null;
  text: string;
  excerpt: string;
  /** If we found and followed a "read more" link */
  followedLink: string | null;
  /** User-friendly message explaining the validation result */
  message: string | null;
  /** Error code for API responses */
  code: "CONTENT_TOO_SHORT" | "CONTENT_OK" | "FETCH_FAILED" | null;
};

/**
 * Patterns to detect "read more" / "full article" links
 */
const READ_MORE_PATTERNS = [
  /read\s+(the\s+)?full\s+(article|story|post|text)/i,
  /continue\s+reading/i,
  /read\s+more/i,
  /full\s+(article|story|post)/i,
  /view\s+(full\s+)?(article|story|post)/i,
  /see\s+(the\s+)?full\s+(article|story|text)/i,
  /click\s+here\s+to\s+read/i,
];

/**
 * Find "read more" links in HTML that point to external content
 */
function findReadMoreLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  
  // Match anchor tags with href
  const anchorRegex = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([^<]*(?:<[^/a][^>]*>[^<]*)*)<\/a>/gi;
  let match;
  
  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const linkText = stripHtml(match[2]).toLowerCase();
    
    // Check if link text matches "read more" patterns
    for (const pattern of READ_MORE_PATTERNS) {
      if (pattern.test(linkText)) {
        try {
          // Resolve relative URLs
          const absoluteUrl = new URL(href, baseUrl).toString();
          
          // Validate it's a safe external URL
          validateExternalUrl(absoluteUrl);
          
          // Skip if it's the same page (anchor link) or same URL
          if (absoluteUrl !== baseUrl && !absoluteUrl.includes("#")) {
            links.push(absoluteUrl);
          }
        } catch {
          // Invalid URL or SSRF blocked - skip
        }
        break;
      }
    }
  }
  
  return links;
}

/**
 * Fetch HTML content from a URL
 */
async function fetchHtml(
  url: string, 
  authHeaders: Record<string, string> = {}
): Promise<{ html: string; ok: boolean; status: number }> {
  try {
    const res = await fetchWithTimeout(url, {
      redirect: "follow",
      timeoutMs: 15000,
      headers: { ...browserLikeHeaders, ...authHeaders },
    });
    
    if (!res.ok) {
      return { html: "", ok: false, status: res.status };
    }
    
    const html = await res.text();
    return { html, ok: true, status: res.status };
  } catch (error) {
    log.warn({ url, error: error instanceof Error ? error.message : "Unknown" }, "Failed to fetch URL for validation");
    return { html: "", ok: false, status: 0 };
  }
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Create excerpt from text
 */
function createExcerpt(text: string, maxLength = 180): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}

/**
 * Validate content from a URL for episode generation.
 * Will attempt to follow "read more" links if initial content is too short.
 */
export async function validateContentForGeneration(
  url: string,
  authHeaders: Record<string, string> = {},
  providedSourceText?: string
): Promise<ContentValidationResult> {
  // If sourceText is provided and sufficient, use it
  if (providedSourceText) {
    const words = countWords(providedSourceText);
    if (words >= MIN_WORDS_FOR_GENERATION) {
      return {
        isValid: true,
        wordCount: words,
        minRequired: MIN_WORDS_FOR_GENERATION,
        title: null,
        text: providedSourceText,
        excerpt: createExcerpt(providedSourceText),
        followedLink: null,
        message: null,
        code: "CONTENT_OK",
      };
    }
  }

  // Fetch the initial page
  const { html, ok, status } = await fetchHtml(url, authHeaders);
  
  if (!ok) {
    return {
      isValid: false,
      wordCount: 0,
      minRequired: MIN_WORDS_FOR_GENERATION,
      title: null,
      text: "",
      excerpt: "",
      followedLink: null,
      message: status === 401 || status === 403
        ? "This content requires authentication."
        : status === 404
        ? "Content not found."
        : "Unable to access this content.",
      code: "FETCH_FAILED",
    };
  }

  const title = extractTitleFromHtml(html);
  let text = extractMainTextFromHtml(html);
  let wordCount = countWords(text);
  let followedLink: string | null = null;

  // If content is too short, look for "read more" links
  if (wordCount < MIN_WORDS_FOR_GENERATION) {
    const readMoreLinks = findReadMoreLinks(html, url);
    
    log.debug({ 
      url, 
      wordCount, 
      readMoreLinksFound: readMoreLinks.length 
    }, "Content too short, checking for read more links");

    // Try following the first valid "read more" link
    for (const linkUrl of readMoreLinks.slice(0, 3)) {
      try {
        const linkedPage = await fetchHtml(linkUrl, authHeaders);
        if (linkedPage.ok) {
          const linkedText = extractMainTextFromHtml(linkedPage.html);
          const linkedWordCount = countWords(linkedText);
          
          log.debug({ 
            linkUrl, 
            linkedWordCount 
          }, "Checked read more link");

          if (linkedWordCount > wordCount) {
            text = linkedText;
            wordCount = linkedWordCount;
            followedLink = linkUrl;
            
            // If we found enough content, stop
            if (wordCount >= MIN_WORDS_FOR_GENERATION) {
              break;
            }
          }
        }
      } catch {
        // Failed to fetch linked page, continue to next
      }
    }
  }

  const isValid = wordCount >= MIN_WORDS_FOR_GENERATION;
  
  let message: string | null = null;
  if (!isValid) {
    message = `This article only has ${wordCount} words. We need at least ${MIN_WORDS_FOR_GENERATION} words to generate a quality audio episode. Try a longer article.`;
    if (followedLink) {
      message += " We tried following the 'read more' link but it didn't have enough content either.";
    }
  }

  return {
    isValid,
    wordCount,
    minRequired: MIN_WORDS_FOR_GENERATION,
    title,
    text,
    excerpt: createExcerpt(text),
    followedLink,
    message,
    code: isValid ? "CONTENT_OK" : "CONTENT_TOO_SHORT",
  };
}
