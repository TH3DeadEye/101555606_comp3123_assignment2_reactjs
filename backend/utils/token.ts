import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

// The token only carries the user's id ("sub") and its expiry. Nothing
// personal is stored in it, because a JWT is signed but not encrypted:
// anyone who has the token can read its contents.
export function signToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}
