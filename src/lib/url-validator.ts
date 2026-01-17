/**
 * URL validation utilities to prevent SSRF (Server-Side Request Forgery) attacks.
 * Blocks requests to internal networks, cloud metadata endpoints, and non-HTTP protocols.
 */

// Private/internal IP ranges that should be blocked
const BLOCKED_IP_PATTERNS = [
  // Loopback
  /^127\./,
  /^0\./,
  // Private networks (RFC 1918)
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  // Link-local
  /^169\.254\./,
  // AWS/Cloud metadata endpoints
  /^169\.254\.169\.254$/,
  // IPv6 loopback and private ranges (simplified)
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^fd00:/i,
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  // Common internal hostnames
  "internal",
  "intranet",
  "local",
  // Cloud metadata
  "metadata.google.internal",
  "metadata",
]);

// Allowed protocols
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export class SSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SSRFError";
  }
}

/**
 * Check if a hostname appears to be an IP address.
 */
function isIPAddress(hostname: string): boolean {
  // IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return true;
  }
  // IPv6 (bracketed or raw)
  if (hostname.includes(":") || hostname.startsWith("[")) {
    return true;
  }
  return false;
}

/**
 * Check if an IP address is blocked (private/internal).
 */
function isBlockedIP(ip: string): boolean {
  // Remove IPv6 brackets if present
  const cleanIP = ip.replace(/^\[|\]$/g, "");
  return BLOCKED_IP_PATTERNS.some((pattern) => pattern.test(cleanIP));
}

/**
 * Validate a URL for safe external fetching.
 * Throws SSRFError if the URL is potentially dangerous.
 *
 * @param urlString - The URL to validate
 * @throws SSRFError if the URL is blocked
 */
export function validateExternalUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new SSRFError("Invalid URL format");
  }

  // Check protocol
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new SSRFError(`Protocol not allowed: ${url.protocol}`);
  }

  // Get hostname (lowercase for comparison)
  const hostname = url.hostname.toLowerCase();

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SSRFError("Hostname not allowed");
  }

  // Check if it's an IP address
  if (isIPAddress(hostname)) {
    if (isBlockedIP(hostname)) {
      throw new SSRFError("IP address not allowed");
    }
  }

  // Check for suspicious patterns in hostname
  if (
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".localhost")
  ) {
    throw new SSRFError("Internal hostname not allowed");
  }

  // Block URLs with credentials
  if (url.username || url.password) {
    throw new SSRFError("URLs with credentials not allowed");
  }

  // Block unusual ports commonly used for internal services
  const blockedPorts = new Set([
    "22", // SSH
    "23", // Telnet
    "25", // SMTP
    "445", // SMB
    "3306", // MySQL
    "5432", // PostgreSQL
    "6379", // Redis
    "27017", // MongoDB
  ]);
  if (url.port && blockedPorts.has(url.port)) {
    throw new SSRFError("Port not allowed");
  }

  return url;
}

/**
 * Check if a URL is safe for external fetching (non-throwing version).
 *
 * @param urlString - The URL to check
 * @returns Object with `safe` boolean and optional `error` message
 */
export function isExternalUrlSafe(urlString: string): {
  safe: boolean;
  error?: string;
  url?: URL;
} {
  try {
    const url = validateExternalUrl(urlString);
    return { safe: true, url };
  } catch (error) {
    if (error instanceof SSRFError) {
      return { safe: false, error: error.message };
    }
    return { safe: false, error: "Invalid URL" };
  }
}

/**
 * Validate and normalize a feed URL.
 */
export function validateFeedUrl(urlString: string): URL {
  const url = validateExternalUrl(urlString);
  
  // Additional feed-specific validations could go here
  // For example, checking for common feed paths
  
  return url;
}
