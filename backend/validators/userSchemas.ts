import { z } from 'zod';
import { emailField, requiredText } from './common';

const usernameField = requiredText('Username')
  .trim()
  .min(3, 'Username must be at least 3 characters.')
  .max(30, 'Username must be at most 30 characters.')
  .regex(
    /^[A-Za-z0-9._-]+$/,
    'Username can only contain letters, numbers, dots, underscores and hyphens.',
  )
  .toLowerCase();

// bcrypt only reads the first 72 bytes of a password, so longer ones are
// rejected instead of being silently truncated.
const passwordField = requiredText('Password')
  .min(8, 'Password must be at least 8 characters.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character.');

// strictObject rejects unknown properties, so a client cannot slip extra
// fields (for example "isAdmin") into the request.
export const signupSchema = z.strictObject(
  {
    username: usernameField,
    email: emailField,
    password: passwordField,
  },
  { error: 'A JSON body with username, email and password is required.' },
);

export type SignupInput = z.infer<typeof signupSchema>;
