import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected', { event: 'db_disconnected' });
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected', { event: 'db_reconnected' });
  });

  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  // Make sure unique indexes exist before the API starts accepting writes.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));

  logger.info('Connected to MongoDB', {
    event: 'db_connected',
    database: mongoose.connection.name,
    host: mongoose.connection.host,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

// readyState 1 means "connected"
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
