import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Periodic cleanup threshold
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function purgeExpiredEntries(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * Checks in-memory sliding-window rate limit for an identifier.
 *
 * @param key Unique identifier (e.g. `upload:${userId}`)
 * @param limit Maximum allowed requests within the window
 * @param windowSeconds Window duration in seconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  purgeExpiredEntries(now);

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowSeconds * 1000;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetSeconds: windowSeconds,
    };
  }

  if (entry.count >= limit) {
    const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
    };
  }

  entry.count += 1;
  const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    resetSeconds,
  };
}

/**
 * Enforces rate limiting on a specific key. Throws AppError("RATE_LIMITED", ...) if exceeded.
 */
export function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): void {
  const result = checkRateLimit(key, limit, windowSeconds);
  if (!result.allowed) {
    logger.warn("rate_limit.exceeded", { status: 429 });
    throw new AppError(
      "RATE_LIMITED",
      `Too many requests. Please wait ${result.resetSeconds} seconds before retrying.`
    );
  }
}

/**
 * Resets rate limit store (used in testing).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
