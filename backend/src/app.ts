import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { config } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { AppError } from './utils/errors.js';
import { authRouter } from './routes/auth.js';
import { organizationsRouter } from './routes/organizations.js';
import { teamsRouter } from './routes/teams.js';
import { usersRouter } from './routes/users.js';
import { rolesRouter } from './routes/roles.js';
import { contentRouter } from './routes/content.js';
import { subscriptionRouter } from './routes/subscription.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: [config.corsOrigin, 'http://localhost:8081', 'http://localhost:19006'],
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/organizations', organizationsRouter);
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
