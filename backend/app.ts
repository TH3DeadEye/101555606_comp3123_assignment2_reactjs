import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestLogger } from './middleware/requestLogger';
import { healthRoutes } from './routes/healthRoutes';
import { userRoutes } from './routes/userRoutes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // Helmet adds security headers (X-Content-Type-Options, Content-Security-Policy,
  // Strict-Transport-Security, ...) that make browsers refuse risky behaviour.
  app.use(helmet());

  // CORS lets the browser accept responses for the frontend origin only. It is
  // registered before everything else so that even error responses (for
  // example a 429) carry the headers and the frontend can read them.
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      // Headers the browser may expose to the frontend code (for 429 messages)
      exposedHeaders: ['Retry-After', 'RateLimit', 'RateLimit-Policy'],
      maxAge: 600,
    }),
  );

  app.use(requestLogger);
  app.use(express.json({ limit: '10kb' }));

  app.use('/health', healthRoutes);
  app.use('/api/v1/user', userRoutes);

  // These two must stay last: unknown routes, then the central error handler.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
