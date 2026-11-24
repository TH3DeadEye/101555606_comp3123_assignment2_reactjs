import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { User } from '../models/User';
import { HttpError } from '../utils/HttpError';
import { isObjectId } from '../utils/objectId';
import { verifyToken } from '../utils/token';

const invalidToken = () =>
  new HttpError(401, 'Your session is not valid. Please log in again.', { code: 'TOKEN_INVALID' });

// Protects a route. It expects "Authorization: Bearer <jwt>", verifies the
// token, loads the user it belongs to and puts that user on req.user. Every
// later "who owns this?" decision uses req.user, never anything sent by the client.
export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    throw new HttpError(401, 'Authentication required. Please log in.', { code: 'AUTH_REQUIRED' });
  }

  const [scheme, token, ...extra] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token || extra.length > 0) {
    throw invalidToken();
  }

  let userId: string;
  try {
    userId = verifyToken(token);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new HttpError(401, 'Your session has expired. Please log in again.', {
        code: 'TOKEN_EXPIRED',
      });
    }
    throw invalidToken();
  }

  // A valid signature is not enough: the account must still exist.
  const user = isObjectId(userId) ? await User.findById(userId).select('username') : null;
  if (!user) throw invalidToken();

  req.user = { id: user.id, username: user.username };
  next();
};
