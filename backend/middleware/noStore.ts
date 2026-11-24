import type { RequestHandler } from 'express';

// API responses contain private data (employees, tokens), so browsers and
// proxies must not keep a copy. This also stops the browser's back button from
// showing stale data after a user logs out.
export const noStore: RequestHandler = (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};
