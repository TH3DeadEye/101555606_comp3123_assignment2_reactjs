import { env } from './config/env';
import { createApp } from './app';

createApp().listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
});
