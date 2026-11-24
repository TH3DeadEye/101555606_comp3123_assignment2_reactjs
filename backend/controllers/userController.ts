import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { logger } from '../config/logger';
import { BCRYPT_ROUNDS, User } from '../models/User';
import { HttpError } from '../utils/HttpError';
import { signToken } from '../utils/token';
import { loginSchema, signupSchema } from '../validators/userSchemas';

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

// A real bcrypt hash of a random value. When the account does not exist we
// still compare against it, so "unknown user" and "wrong password" take the
// same time and an attacker cannot use the response time to find valid users.
const unknownUserHash = bcrypt.hash(randomBytes(16).toString('hex'), BCRYPT_ROUNDS);

// POST /api/v1/user/login -> 200 with a JWT
export async function login(req: Request, res: Response): Promise<void> {
  const { username, email, password } = loginSchema.parse(req.body);

  // Only validated strings reach this filter, so operator objects such as
  // { "$ne": null } have already been rejected.
  const user = await User.findOne({
    ...(username ? { username } : {}),
    ...(email ? { email } : {}),
  }).select('+password');

  const passwordMatches = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, await unknownUserHash);

  if (!user || !passwordMatches) {
    // The submitted username, email and password are deliberately not logged.
    logger.warn('Login failed', {
      event: 'login_failed',
      reason: user ? 'wrong_password' : 'unknown_account',
      userId: user?.id,
    });
    // The same message for both cases, so the response does not reveal which
    // accounts exist.
    throw new HttpError(401, 'Invalid username/email or password.', { code: 'INVALID_CREDENTIALS' });
  }

  const token = signToken(user.id);
  logger.info('User logged in', { event: 'login_success', userId: user.id });
  res.status(200).json({ message: 'Login successful.', token, user });
}
