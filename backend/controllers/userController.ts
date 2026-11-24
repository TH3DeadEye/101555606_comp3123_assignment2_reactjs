import type { Request, Response } from 'express';
import { logger } from '../config/logger';
import { User } from '../models/User';
import { signupSchema } from '../validators/userSchemas';

// POST /api/v1/user/signup -> 201
// Validation errors (400) and duplicate users (409) are thrown and turned into
// JSON responses by the central error handler.
export async function signup(req: Request, res: Response): Promise<void> {
  const { username, email, password } = signupSchema.parse(req.body);

  // The password is hashed by the model's pre-save hook, never here.
  const user = await User.create({ username, email, password });

  logger.info('New user registered', { event: 'user_signup', userId: user.id });
  res.status(201).json({ message: 'User registered successfully.', user });
}
