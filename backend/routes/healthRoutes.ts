import { Router } from 'express';
import { isDatabaseConnected } from '../config/db';

export const healthRoutes = Router();

// GET /health: used by Docker and cloud platforms to see whether the API is
// running. It answers 503 when the API is up but MongoDB is not reachable.
healthRoutes.get('/', (_req, res) => {
  const databaseUp = isDatabaseConnected();

  res.status(databaseUp ? 200 : 503).json({
    status: databaseUp ? 'ok' : 'error',
    uptime_seconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: databaseUp ? 'connected' : 'disconnected',
  });
});
