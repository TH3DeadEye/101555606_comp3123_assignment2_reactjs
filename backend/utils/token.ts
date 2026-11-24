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

// Returns the user id stored in the token. It throws TokenExpiredError for an
// expired token and JsonWebTokenError for a forged, tampered or malformed one.
// Only HS256 is accepted, which blocks "alg: none" and algorithm-swap attacks.
export function verifyToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new jwt.JsonWebTokenError('token has no subject');
  }
  return payload.sub;
}
