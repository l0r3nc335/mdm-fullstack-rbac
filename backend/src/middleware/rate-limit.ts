import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import type { Request } from 'express';
import { config } from '../config/env.js';

function disabledLimiter(
  _req: Request,
  _res: unknown,
  next: (err?: unknown) => void,
) {
  next();
}

function buildLimiter(options: Partial<Options>) {
  if (!config.rateLimitEnabled) {
    return disabledLimiter;
  }

  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    // Behind nginx / load balancer on EC2
    validate: { xForwardedForHeader: false },
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMITED',
        },
      });
    },
    ...options,
  });
}

/** Broad API protection against floods / scrapers. */
export const apiRateLimiter = buildLimiter({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: undefined,
});

/**
 * Stricter limiter for credential stuffing / brute-force on login.
 * Keys by IP + normalized email when present.
 */
export const loginRateLimiter = buildLimiter({
  windowMs: config.loginRateLimitWindowMs,
  max: config.loginRateLimitMax,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const ip = ipKeyGenerator(req.ip ?? 'unknown');
    return email ? `${ip}:${email}` : ip;
  },
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        message: 'Too many login attempts. Please wait and try again.',
        code: 'LOGIN_RATE_LIMITED',
      },
    });
  },
});
