import dotenv from 'dotenv';

dotenv.config();

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'rbac-demo-jwt-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  /** bcrypt cost factor (production-grade default: 12). */
  bcryptRounds: intEnv('BCRYPT_ROUNDS', 12),
  /**
   * Rate limiting on by default.
   * Disabled automatically under Vitest unless RATE_LIMIT_ENABLED=true.
   */
  rateLimitEnabled:
    process.env.RATE_LIMIT_ENABLED === 'true'
      ? true
      : process.env.RATE_LIMIT_ENABLED === 'false'
        ? false
        : process.env.VITEST !== 'true',
  /** Global API window / max requests per IP. */
  rateLimitWindowMs: intEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  rateLimitMax: intEnv('RATE_LIMIT_MAX', 300),
  /** Login-specific window / max attempts per IP+email. */
  loginRateLimitWindowMs: intEnv('LOGIN_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  loginRateLimitMax: intEnv('LOGIN_RATE_LIMIT_MAX', 10),
  /** Trust first proxy hop (nginx) when TRUST_PROXY=1 or true. */
  trustProxy: process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true',
};
