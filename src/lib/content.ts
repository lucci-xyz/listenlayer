import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export function extractReadableText(html: string, url: string) {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  const text = article?.textContent?.trim();
  if (text && text.length > 200) {
    return text;
  }

  const fallback = dom.window.document.body?.textContent || "";
  return fallback.replace(/\s+/g, " ").trim();
}
