interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Basic rate-limiter:
 * Allows up to maxAttempts within windowMs per key (IP + email).
 * In-memory map; in distributed multi-region serverless, Redis/Upstash can be swapped in.
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 10,
  windowMs = 60 * 1000
): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    return { success: false, remaining: 0 };
  }

  record.count += 1;
  return { success: true, remaining: maxAttempts - record.count };
}
