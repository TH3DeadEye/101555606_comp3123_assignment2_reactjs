import { rateLimit, type AugmentedRequest } from 'express-rate-limit';
import { env } from '../config/env';
import { HttpError } from '../utils/HttpError';

const windowMs = env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

interface LimiterOptions {
  max: number;
  message: string;
  // true: only failed requests (status 400 or higher) count towards the limit
  countFailuresOnly?: boolean;
}

function createLimiter({ max, message, countFailuresOnly = false }: LimiterOptions) {
  return rateLimit({
    windowMs,
    limit: max,
    // Sends RateLimit / RateLimit-Policy headers, plus Retry-After once blocked
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: countFailuresOnly,
    // Hand the 429 to the central error handler so it is logged and has the
    // same JSON shape as every other error.
    handler: (req, _res, next, usedOptions) => {
      const info = (req as AugmentedRequest)[usedOptions.requestPropertyName];
      const resetTime = info?.resetTime?.getTime() ?? Date.now() + windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));
      next(new HttpError(429, message, { code: 'RATE_LIMITED', retryAfterSeconds }));
    },
  });
}

// POST /api/v1/user/login: only wrong passwords and invalid requests count, so
// a user who logs in correctly is never blocked, but guessing is.
export const loginLimiter = createLimiter({
  max: env.AUTH_RATE_LIMIT_MAX,
  countFailuresOnly: true,
  message: 'Too many failed login attempts. Please wait a few minutes and try again.',
});

// POST /api/v1/user/signup: every request counts, which limits mass account creation.
export const signupLimiter = createLimiter({
  max: env.AUTH_RATE_LIMIT_MAX,
  message: 'Too many sign-up attempts from this address. Please try again later.',
});

// Safety net for every /api route.
export const apiLimiter = createLimiter({
  max: env.API_RATE_LIMIT_MAX,
  message: 'Too many requests. Please slow down and try again shortly.',
});
