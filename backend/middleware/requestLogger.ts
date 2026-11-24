import type { RequestHandler } from 'express';
import { logger } from '../config/logger';

// Logs one line per finished request: method, path, status and duration.
// Bodies, headers (Authorization) and query strings are intentionally not
// logged, so passwords and tokens can never end up in the log files.
export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const path = req.originalUrl.split('?')[0];
    const isHealthCheck = path === '/health' && res.statusCode < 400;

    let level: 'debug' | 'info' | 'warn' | 'error' = 'info';
    if (isHealthCheck) level = 'debug';
    else if (res.statusCode >= 500) level = 'error';
    else if (res.statusCode >= 400) level = 'warn';

    logger.log(level, `${req.method} ${path} ${res.statusCode}`, {
      event: 'http_request',
      method: req.method,
      path,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      ip: req.ip,
      userId: req.user?.id,
    });
  });

  next();
};
