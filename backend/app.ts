import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/requestLogger';
import { healthRoutes } from './routes/healthRoutes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '10kb' }));

  app.use('/health', healthRoutes);

  // These two must stay last: unknown routes, then the central error handler.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
