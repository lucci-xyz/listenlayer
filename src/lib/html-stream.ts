/**
 * Streaming HTML fetcher that extracts content progressively.
 * Optimized for large pages like live blogs - stops downloading once we have enough text.
 */

import { fetchWithTimeout, browserLikeHeaders } from "@/lib/fetch";
import { validateExternalUrl } from "@/lib/url-validator";
import { extractMainTextFromHtml, extractTitleFromHtml } from "@/lib/html";

// Maximum bytes to download (generous limit for streaming)
const MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024; // 15MB absolute max

// Target text length - stop downloading once we have this much readable content
const TARGET_TEXT_LENGTH = 20000; // ~4000 words, plenty for a podcast script

// Chunk size for streaming
const CHUNK_SIZE = 256 * 1024; // 256KB chunks

// Check interval - how often to check if we have enough content
const CHECK_INTERVAL_BYTES = 512 * 1024; // Check every 512KB

export interface StreamFetchResult {
  html: string;
  text: string;
  title: string | null;
  bytesDownloaded: number;
  stoppedEarly: boolean;
}

/**
 * Fetch HTML content with streaming, stopping early if we have enough text.
 * This is optimized for large pages like CNN live blogs.
 */
export async function fetchHtmlStreaming(
  url: string,
  auth?: Record<string, string>
): Promise<StreamFetchResult> {
  // Validate URL to prevent SSRF
  validateExternalUrl(url);

  const response = await fetchWithTimeout(url, {
    redirect: "follow",
    timeoutMs: 30000, // Longer timeout for streaming
    headers: {
      ...browserLikeHeaders,
      ...auth,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status}`);
  }

  // Check if we can stream
  const body = response.body;
  if (!body) {
    throw new Error("Response body not available for streaming");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let lastCheckBytes = 0;
  let stoppedEarly = false;
  let currentHtml = "";
  let extractedText = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      totalBytes += value.length;

      // Check if we've exceeded the absolute maximum
      if (totalBytes > MAX_DOWNLOAD_BYTES) {
        stoppedEarly = true;
        break;
      }

      // Periodically check if we have enough content
      if (totalBytes - lastCheckBytes >= CHECK_INTERVAL_BYTES) {
        lastCheckBytes = totalBytes;
        
        // Decode what we have so far
        currentHtml = decoder.decode(Buffer.concat(chunks), { stream: true });
        
        // Try to extract text
        extractedText = extractMainTextFromHtml(currentHtml);
        
        // If we have enough readable text, stop downloading
        if (extractedText.length >= TARGET_TEXT_LENGTH) {
          stoppedEarly = true;
          break;
        }
      }
    }
  } finally {
    // Always cancel the reader to free resources
    try {
      await reader.cancel();
    } catch {
      // Ignore cancel errors
    }
  }

  // Final decode
  const html = decoder.decode(Buffer.concat(chunks));
  
  // Final text extraction if not already done
  if (!extractedText || extractedText.length < TARGET_TEXT_LENGTH) {
    extractedText = extractMainTextFromHtml(html);
  }

  const title = extractTitleFromHtml(html);

  return {
    html,
    text: extractedText,
    title,
    bytesDownloaded: totalBytes,
    stoppedEarly,
  };
}

/**
 * Simple HTML fetch with increased limits but no streaming.
 * Fallback for environments where streaming isn't available.
 */
export async function fetchHtmlSimple(
  url: string,
  auth?: Record<string, string>,
  maxBytes = 10 * 1024 * 1024 // 10MB default
): Promise<{ html: string; bytesDownloaded: number }> {
  validateExternalUrl(url);

  const response = await fetchWithTimeout(url, {
    redirect: "follow",
    timeoutMs: 30000,
    headers: {
      ...browserLikeHeaders,
      ...auth,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status}`);
  }

  // Check content-length header if available
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    // For very large pages, try to get just the beginning
    const body = response.body;
    if (body) {
      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      try {
        while (totalBytes < maxBytes) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          totalBytes += value.length;
        }
      } finally {
        await reader.cancel().catch(() => {});
      }

      const decoder = new TextDecoder("utf-8", { fatal: false });
      return {
        html: decoder.decode(Buffer.concat(chunks)),
        bytesDownloaded: totalBytes,
      };
    }
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  
  // Truncate if too large
  const truncated = buffer.length > maxBytes 
    ? buffer.subarray(0, maxBytes) 
    : buffer;

  return {
    html: truncated.toString("utf-8"),
    bytesDownloaded: truncated.length,
  };
}

/**
 * Smart HTML fetcher - uses streaming when beneficial, falls back to simple fetch.
 */
export async function fetchHtmlSmart(
  url: string,
  auth?: Record<string, string>
): Promise<StreamFetchResult> {
  try {
    return await fetchHtmlStreaming(url, auth);
  } catch (error) {
    // Fallback to simple fetch if streaming fails
    const { html, bytesDownloaded } = await fetchHtmlSimple(url, auth);
    const text = extractMainTextFromHtml(html);
    const title = extractTitleFromHtml(html);
    
    return {
      html,
      text,
      title,
      bytesDownloaded,
      stoppedEarly: false,
    };
  }
}
