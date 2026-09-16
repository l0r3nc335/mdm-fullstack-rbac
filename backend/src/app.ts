import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { config } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiRateLimiter } from './middleware/rate-limit.js';
import { AppError } from './utils/errors.js';
import { authRouter } from './routes/auth.js';
import { organizationsRouter } from './routes/organizations.js';
import { teamsRouter } from './routes/teams.js';
import { usersRouter } from './routes/users.js';
import { rolesRouter } from './routes/roles.js';
import { contentRouter } from './routes/content.js';
import { subscriptionRouter } from './routes/subscription.js';
import { orgStatsRouter, platformStatsRouter } from './routes/stats.js';

export function createApp() {
  const app = express();

  if (config.trustProxy) {
    // Required behind nginx / load balancer so rate limits use the real client IP
    app.set('trust proxy', 1);
  }

  app.use(
    cors({
      origin: [config.corsOrigin, 'http://localhost:8081', 'http://localhost:19006'],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });

  // Global API rate limit (skips /api/health above)
  app.use('/api', apiRateLimiter);

  app.use('/api/auth', authRouter);
  app.use('/api/stats/platform', platformStatsRouter);
  app.use('/api/organizations', organizationsRouter);
  app.use('/api/organizations/:orgUuid/stats', orgStatsRouter);
  app.use('/api/organizations/:orgUuid/teams', teamsRouter);
  app.use('/api/organizations/:orgUuid/users', usersRouter);
  app.use('/api/organizations/:orgUuid/roles', rolesRouter);
  app.use('/api/organizations/:orgUuid/content', contentRouter);
  app.use('/api/organizations/:orgUuid/subscription', subscriptionRouter);

  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof ZodError) {
      next(new AppError(err.issues.map((e) => e.message).join('; '), 400, 'VALIDATION_ERROR'));
      return;
    }
    next(err);
  });

  app.use(errorHandler);

  return app;
}
