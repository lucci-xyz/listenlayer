function decodeHtmlEntities(input: string) {
  // Minimal entity decoding for better titles/excerpts without adding deps.
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}

export function stripHtml(input: string) {
  const withoutTags = input.replace(/<[^>]*>/g, " ");
  return decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
}

export function summarize(text: string, limit: number) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}…`;
}

export function removeTagBlocks(html: string, tagNames: string[]) {
  let out = html;
  for (const tagName of tagNames) {
    const re = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, "gi");
    out = out.replace(re, " ");
  }
  return out;
}

export function extractFirstTagInnerHtml(html: string, tagName: string): string | null {
  const re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = html.match(re);
  return match?.[1] ?? null;
}

export function parseHtmlTagAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) {
    const key = m[1]?.toLowerCase();
    if (!key) continue;
    const value = (m[2] ?? m[3] ?? m[4] ?? "").trim();
    attrs[key] = value;
  }
  return attrs;
}

export function extractMetaContent(html: string, key: string) {
  const normalizedKey = key.toLowerCase();
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const attrs = parseHtmlTagAttributes(tag);
    const prop = (attrs["property"] || "").toLowerCase();
    const name = (attrs["name"] || "").toLowerCase();
    if (prop === normalizedKey || name === normalizedKey) {
      const content = attrs["content"] || "";
      if (content) return decodeHtmlEntities(content).trim();
    }
  }
  return null;
}

export function extractTitleFromHtml(html: string, fallback?: string) {
  const metaTitle =
    extractMetaContent(html, "og:title") ||
    extractMetaContent(html, "twitter:title");
  if (metaTitle) return metaTitle;

  const h1 = extractFirstTagInnerHtml(html, "h1");
  if (h1) {
    const text = stripHtml(h1);
    if (text) return text;
  }

  const titleTag = extractFirstTagInnerHtml(html, "title");
  if (titleTag) {
    const text = stripHtml(titleTag);
    if (text) return text;
  }

  return fallback || null;
}

/**
 * Extract content from common CMS class-based containers.
 * Returns the content of the first matching div with these classes.
 */
function extractDivByClass(html: string, classNames: string[]): string | null {
  for (const className of classNames) {
    // Match div with the class (handles multiple classes on same element)
    const regex = new RegExp(
      `<div[^>]*class\\s*=\\s*["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)</div>`,
      "i"
    );
    const match = html.match(regex);
    if (match?.[1] && match[1].length > 500) {
      return match[1];
    }
  }
  return null;
}

export function extractMainTextFromHtml(html: string) {
  const cleaned = removeTagBlocks(html, [
    "script",
    "style",
    "noscript",
    "svg",
    "iframe",
    "canvas",
    "template",
    "nav",
    "header",
    "footer",
    "aside",
    "form",
  ]);

  // Try semantic HTML5 tags first
  let preferred =
    extractFirstTagInnerHtml(cleaned, "article") ||
    extractFirstTagInnerHtml(cleaned, "main");
  
  // If semantic tags didn't yield much, try common CMS content classes
  if (!preferred || preferred.length < 1000) {
    const classContent = extractDivByClass(cleaned, [
      "entry-content",      // WordPress
      "post-content",       // WordPress/Ghost
      "article-content",    // Various
      "content-body",       // Various
      "story-body",         // News sites
      "article-body",       // News sites
      "post-body",          // Blogger
      "blog-content",       // Various
      "single-content",     // WordPress themes
      "page-content",       // Various
    ]);
    if (classContent && (!preferred || classContent.length > preferred.length)) {
      preferred = classContent;
    }
  }

  // Fallback to body
  if (!preferred) {
    preferred = extractFirstTagInnerHtml(cleaned, "body") || cleaned;
  }

  return stripHtml(preferred);
}

export function extractLinkTags(html: string): Array<Record<string, string>> {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  return tags.map(parseHtmlTagAttributes);
}

