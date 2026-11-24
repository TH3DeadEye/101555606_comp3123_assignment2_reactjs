import express from 'express';
import { requestLogger } from './middleware/requestLogger';
import { healthRoutes } from './routes/healthRoutes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '10kb' }));

  app.use('/health', healthRoutes);

  return app;
}
