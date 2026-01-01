import { extractReadableText } from "@/lib/content";

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
  if (!text) {
    throw new Error("No readable article text found. Use a specific article URL.");
  }
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < minWords) {
    throw new Error("Not enough article text to generate an episode. Use a specific article URL.");
  }
  return { finalUrl, textLength: text.length };
}
