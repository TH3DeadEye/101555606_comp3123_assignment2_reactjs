import type { Request } from 'express';
import { HttpError } from './HttpError';

// The authenticate middleware sets req.user. This helper gives controllers a
// non-optional value and fails safely if a route forgot to use the middleware.
export function currentUser(req: Request): { id: string; username: string } {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required. Please log in.', { code: 'AUTH_REQUIRED' });
  }
  return req.user;
}
