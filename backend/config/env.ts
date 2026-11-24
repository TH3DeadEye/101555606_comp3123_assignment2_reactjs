import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load backend/.env into process.env (a no-op when the file does not exist,
// for example inside Docker where the variables are injected by Compose).
dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5001),

  // The connection string may contain credentials, so it is never logged.
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  LOG_DIR: z
    .string()
    .min(1)
    .default('logs')
    .transform((dir) => path.resolve(dir)),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment configuration:');
  for (const issue of result.error.issues) {
    console.error(`  - ${issue.path.join('.') || 'env'}: ${issue.message}`);
  }
  console.error('Check backend/.env against backend/.env.example.');
  process.exit(1);
}

export const env = result.data;
