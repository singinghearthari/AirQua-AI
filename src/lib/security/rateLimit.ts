import { pruneExpiredMapEntries, setBoundedMapEntry } from './boundedMap';

// Bounded in-memory sliding window rate limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const MAX_RATE_LIMIT_KEYS = 1000;
const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Checks whether an IP or client key is within the allowable rate limit.
 * Automatically prunes expired buckets and caps stored keys to protect memory.
 */
export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    if (rateLimitMap.size >= MAX_RATE_LIMIT_KEYS) {
      pruneExpiredMapEntries(rateLimitMap, (entry) => now > entry.resetAt);
    }
    setBoundedMapEntry(
      rateLimitMap,
      key,
      { count: 1, resetAt: now + windowMs },
      MAX_RATE_LIMIT_KEYS
    );
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (record.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    retryAfterSec: 0,
  };
}
