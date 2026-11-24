import dotenv from 'dotenv';
import { z } from 'zod';

// Load backend/.env into process.env (a no-op when the file does not exist,
// for example inside Docker where the variables are injected by Compose).
dotenv.config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5001),
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
