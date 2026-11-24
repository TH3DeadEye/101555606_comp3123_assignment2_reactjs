import type { RequestHandler } from 'express';
import { HttpError } from '../utils/HttpError';

// Runs when no route matched. ROUTE_NOT_FOUND is deliberately different from
// the NOT_FOUND code used when an employee id does not exist.
export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, 'The requested route does not exist.', { code: 'ROUTE_NOT_FOUND' }));
};
