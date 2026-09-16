import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('rate limiting', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '3';
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.LOGIN_RATE_LIMIT_MAX = '2';
    process.env.TRUST_PROXY = 'false';
  });

  afterEach(() => {
    delete process.env.RATE_LIMIT_ENABLED;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.LOGIN_RATE_LIMIT_WINDOW_MS;
    delete process.env.LOGIN_RATE_LIMIT_MAX;
  });

  it('returns 429 when the global API limit is exceeded', async () => {
    const { apiRateLimiter } = await import('../src/middleware/rate-limit.js');
    const app = express();
    app.use('/api', apiRateLimiter);
    app.get('/api/ping', (_req, res) => {
      res.json({ data: { ok: true } });
    });

    expect((await request(app).get('/api/ping')).status).toBe(200);
    expect((await request(app).get('/api/ping')).status).toBe(200);
    expect((await request(app).get('/api/ping')).status).toBe(200);
    const limited = await request(app).get('/api/ping');

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect(limited.headers['ratelimit-limit']).toBeDefined();
  });

  it('returns 429 when login attempts exceed the auth limit', async () => {
    const { loginRateLimiter } = await import('../src/middleware/rate-limit.js');
    const app = express();
    app.use(express.json());
    app.post('/login', loginRateLimiter, (_req, res) => {
      res.status(401).json({ error: { message: 'Invalid', code: 'UNAUTHORIZED' } });
    });

    const payload = { email: 'nobody@example.com', password: 'WrongPass1' };

    expect((await request(app).post('/login').send(payload)).status).toBe(401);
    expect((await request(app).post('/login').send(payload)).status).toBe(401);
    const limited = await request(app).post('/login').send(payload);

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('LOGIN_RATE_LIMITED');
  });
});
