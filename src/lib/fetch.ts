/**
 * Fetch utilities with timeout support and retry logic.
 * Designed for serverless environments where request timeouts are critical.
 */

export class FetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = "FetchTimeoutError";
  }
}

export class FetchError extends Error {
  status: number;
  url: string;

  constructor(url: string, status: number, statusText?: string) {
    super(`Fetch failed: ${status} ${statusText || ""} for ${url}`);
    this.name = "FetchError";
    this.status = status;
    this.url = url;
  }
}

export interface FetchWithTimeoutOptions extends RequestInit {
  /** Timeout in milliseconds (default: 15000) */
  timeoutMs?: number;
  /** Number of retry attempts for transient failures (default: 0) */
  retries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** HTTP status codes that should trigger a retry (default: [429, 502, 503, 504]) */
  retryStatusCodes?: number[];
}

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 0;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_RETRY_STATUS_CODES = [429, 502, 503, 504];

/**
 * Fetch with timeout support using AbortController.
 * Automatically aborts the request if it takes longer than the specified timeout.
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    retryStatusCodes = DEFAULT_RETRY_STATUS_CODES,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;
  let attempts = 0;

  while (attempts <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if we should retry based on status code
      if (!response.ok && retryStatusCodes.includes(response.status) && attempts < retries) {
        lastError = new FetchError(url, response.status, response.statusText);
        attempts++;
        await sleep(retryDelayMs * attempts); // Exponential-ish backoff
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new FetchTimeoutError(url, timeoutMs);
      }

      // Retry on network errors
      if (attempts < retries) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempts++;
        await sleep(retryDelayMs * attempts);
        continue;
      }

      throw error;
    }
  }

  // Should not reach here, but just in case
  throw lastError || new Error("Fetch failed after retries");
}

/**
 * Default headers for external content fetching.
 * Mimics a browser to avoid being blocked by sites.
 */
export const browserLikeHeaders: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
};

/**
 * Headers for RSS/Atom feed fetching.
 */
export const feedHeaders: Record<string, string> = {
  "User-Agent": "ListenLayer/1.0 (RSS Reader)",
  Accept: "application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * Fetch HTML content with browser-like headers and timeout.
 */
export async function fetchHtmlContent(
  url: string,
  options: Omit<FetchWithTimeoutOptions, "headers"> & { headers?: Record<string, string> } = {}
): Promise<{ html: string; finalUrl: string; response: Response }> {
  const response = await fetchWithTimeout(url, {
    redirect: "follow",
    timeoutMs: 15000,
    ...options,
    headers: {
      ...browserLikeHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new FetchError(url, response.status, response.statusText);
  }

  // Check content length to prevent downloading huge files
  const contentLength = response.headers.get("content-length");
  const maxBytes = 5 * 1024 * 1024; // 5MB
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error(`Content too large: ${contentLength} bytes exceeds ${maxBytes} byte limit`);
  }

  const html = await response.text();
  return {
    html,
    finalUrl: response.url || url,
    response,
  };
}

/**
 * Fetch RSS/Atom feed with appropriate headers and timeout.
 */
export async function fetchFeedContent(
  url: string,
  options: Omit<FetchWithTimeoutOptions, "headers"> & { headers?: Record<string, string> } = {}
): Promise<{ xml: string; response: Response }> {
  const response = await fetchWithTimeout(url, {
    redirect: "follow",
    timeoutMs: 12000,
    ...options,
    headers: {
      ...feedHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new FetchError(url, response.status, response.statusText);
  }

  const xml = await response.text();
  return { xml, response };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
