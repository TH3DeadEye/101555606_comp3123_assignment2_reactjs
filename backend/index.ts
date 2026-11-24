import { env } from './config/env';
import { flushLogs, logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/db';
import { createApp } from './app';

async function main(): Promise<void> {
  const app = createApp();
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server started on port ${env.PORT}`, {
      event: 'server_start',
      port: env.PORT,
      environment: env.NODE_ENV,
    });
  });

  // Stop accepting requests, close MongoDB, then exit (Docker sends SIGTERM).
  const shutdown = (signal: string): void => {
    logger.info(`${signal} received, shutting down`, { event: 'server_stop' });
    server.close(() => {
      void disconnectDatabase()
        .then(flushLogs)
        .then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(async (error: unknown) => {
  logger.error('Server failed to start', {
    event: 'server_start_failed',
    error: error instanceof Error ? error.message : String(error),
  });
  await flushLogs();
  process.exit(1);
});
