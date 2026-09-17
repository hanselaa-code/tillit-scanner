import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimiterOptions {
  windowMs: number; // Tidsvindu i millisekunder
  maxRequests: number; // Maks antall forespørsler per vindu
}

export class MemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxRequests: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: RateLimiterOptions = { windowMs: 60 * 1000, maxRequests: 15 }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;

    // Periodisk opprydding av utgåtte IP-er for å hindre minnelekkasje
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), this.windowMs * 2);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  public getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown-client';
  }

  public check(ip: string): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.records.get(ip);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(ip, record);
    }

    // Filtrer ut tidsstempler som er eldre enn det gjeldende vinduet
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldestTimestamp = record.timestamps[0];
      const retryAfterMs = oldestTimestamp + this.windowMs - now;
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      return {
        allowed: false,
        retryAfterSeconds,
        remaining: 0,
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: this.maxRequests - record.timestamps.length,
    };
  }

  public cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [ip, record] of this.records.entries()) {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      if (record.timestamps.length === 0) {
        this.records.delete(ip);
      }
    }
  }

  public reset(): void {
    this.records.clear();
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.records.clear();
  }
}

// Standard rate limiter: 15 forespørsler per 60 sekunder per IP
export const defaultRateLimiter = new MemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
});

/**
 * Express middleware for rate limiting.
 */
export function rateLimiterMiddleware(limiter: MemoryRateLimiter = defaultRateLimiter) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = limiter.getClientIp(req);
    const result = limiter.check(ip);

    res.setHeader('X-RateLimit-Limit', 15);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfterSeconds);
      res.status(429).json({
        error: 'Too Many Requests',
        message: `For mange forespørsler fra din enhet. Vennligst vent ${result.retryAfterSeconds} sekunder før du prøver på nytt.`,
        retryAfterSeconds: result.retryAfterSeconds,
      });
      return;
    }

    next();
  };
}
