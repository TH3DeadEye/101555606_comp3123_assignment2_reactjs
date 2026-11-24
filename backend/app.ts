import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/requestLogger';
import { healthRoutes } from './routes/healthRoutes';
import { userRoutes } from './routes/userRoutes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '10kb' }));

  app.use('/health', healthRoutes);
  app.use('/api/v1/user', userRoutes);

  // These two must stay last: unknown routes, then the central error handler.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
