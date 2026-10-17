import { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

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

/**
 * Express middleware for general IP-based rate limiting
 */
export function ipRateLimiter(maxAttempts = 100, windowMs = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const key = `rate:ip:${ip}`;
    const result = checkRateLimit(key, maxAttempts, windowMs);

    if (!result.success) {
      res.status(429).json({
        success: false,
        error: `Too many requests. Please try again in ${result.resetInSeconds} seconds.`,
      });
      return;
    }
    next();
  };
}
