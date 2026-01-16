import { extractMainTextFromHtml } from "@/lib/html";

export function extractReadableText(html: string, url: string) {
  // NOTE: We intentionally avoid jsdom here to keep serverless runtime compatible
  // across Vercel Node versions (jsdom@27+ pulls ESM-only deps that can crash).
  const text = extractMainTextFromHtml(html);
  if (text && text.length > 200) return text;
  return text;
}
