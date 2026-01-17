import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Upstash is configured
const isUpstashConfigured =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Create Redis client only if configured
const redis = isUpstashConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Rate limit presets for different route types
const limiters = {
  // Standard API routes - 30 requests per minute
  standard: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        analytics: true,
        prefix: "ratelimit:standard",
      })
    : null,

  // Analytics/playback events - higher limit (120 per minute)
  analytics: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(120, "1 m"),
        analytics: true,
        prefix: "ratelimit:analytics",
      })
    : null,

  // Authentication routes - stricter limit (10 per minute)
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:auth",
      })
    : null,

  // Episode generation - moderate limit (20 per minute)
  generate: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 m"),
        analytics: true,
        prefix: "ratelimit:generate",
      })
    : null,

  // Discovery/preview - moderate limit (30 per minute)
  discover: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        analytics: true,
        prefix: "ratelimit:discover",
      })
    : null,
};

export type RateLimitType = keyof typeof limiters;

// In-memory fallback for development/testing when Upstash is not configured
type RateEntry = { count: number; resetAt: number };
const fallbackBuckets = new Map<string, RateEntry>();

function fallbackRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = fallbackBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    fallbackBuckets.set(key, next);
    return { ok: true, remaining: limit - 1, resetAt: next.resetAt };
  }

  if (entry.count >= limit) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  fallbackBuckets.set(key, entry);
  return { ok: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// Default limits per type for fallback
const defaultLimits: Record<RateLimitType, { limit: number; windowMs: number }> = {
  standard: { limit: 30, windowMs: 60_000 },
  analytics: { limit: 120, windowMs: 60_000 },
  auth: { limit: 10, windowMs: 60_000 },
  generate: { limit: 20, windowMs: 60_000 },
  discover: { limit: 30, windowMs: 60_000 },
};

/**
 * Rate limit a request by key and type.
 * Uses Upstash Redis in production, falls back to in-memory for development.
 */
export async function rateLimit(
  key: string,
  type: RateLimitType = "standard"
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const limiter = limiters[type];

  // Use Upstash if configured
  if (limiter) {
    const result = await limiter.limit(key);
    return {
      ok: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  }

  // Fallback to in-memory (only for development)
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[rate-limit] Upstash not configured - rate limiting disabled in production!"
    );
    // In production without Upstash, still allow requests but log warning
    return { ok: true, remaining: 999, resetAt: Date.now() + 60_000 };
  }

  const { limit, windowMs } = defaultLimits[type];
  return fallbackRateLimit(`${type}:${key}`, limit, windowMs);
}

/**
 * Legacy synchronous rate limit function for backward compatibility.
 * @deprecated Use async `rateLimit` instead for production.
 */
export function rateLimitSync(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number; resetAt: number } {
  return fallbackRateLimit(key, limit, windowMs);
}
