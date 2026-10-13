interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter for authentication endpoints.
 * @param key Unique identifier (e.g. `ip:email`)
 * @param maxAttempts Max allowed attempts within the window
 * @param windowMs Time window in milliseconds
 * @returns { success: boolean, remaining: number, resetInSeconds: number }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { success: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = store.get(key);

  if (!record || record.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      success: true,
      remaining: maxAttempts - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= maxAttempts) {
    const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      success: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  record.count += 1;
  store.set(key, record);
  return {
    success: true,
    remaining: maxAttempts - record.count,
    resetInSeconds: Math.ceil((record.resetAt - now) / 1000),
  };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}
