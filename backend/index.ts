import { env } from './config/env';
import { logger } from './config/logger';
import { createApp } from './app';

createApp().listen(env.PORT, () => {
  logger.info(`Server started on port ${env.PORT}`, {
    event: 'server_start',
    port: env.PORT,
    environment: env.NODE_ENV,
  });
});
