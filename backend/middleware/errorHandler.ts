import type { ErrorRequestHandler } from 'express';
import { logger } from '../config/logger';
import { HttpError } from '../utils/HttpError';

// Turns anything that was thrown into an HttpError. Anything we do not
// recognise becomes a generic 500 so internal details never reach the client.
function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;

  // Errors raised by express.json() before a route runs
  if (typeof err === 'object' && err !== null && 'type' in err) {
    if (err.type === 'entity.parse.failed') {
      return new HttpError(400, 'The request body is not valid JSON.', { code: 'MALFORMED_JSON' });
    }
    if (err.type === 'entity.too.large') {
      return new HttpError(413, 'The request body is too large.', { code: 'PAYLOAD_TOO_LARGE' });
    }
  }

  return new HttpError(500, 'Something went wrong on the server. Please try again later.', {
    code: 'INTERNAL_ERROR',
  });
}

function eventName(error: HttpError): string {
  if (error.status === 401) return 'authentication_failure';
  if (error.status === 403) return 'authorization_failure';
  if (error.code === 'VALIDATION_ERROR') return 'validation_failure';
  if (error.status === 429) return 'rate_limited';
  if (error.status >= 500) return 'server_error';
  return 'client_error';
}

// Express recognises an error handler by its four parameters.
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const error = toHttpError(err);

  const context = {
    event: eventName(error),
    method: req.method,
    path: req.originalUrl.split('?')[0],
    code: error.code,
    // Only the names of invalid fields are logged, never the submitted values.
    fields: error.errors?.map((item) => item.field),
  };

  if (error.status >= 500) {
    // The real cause and stack trace go to the log file only.
    logger.error(err instanceof Error ? err.message : String(err), {
      ...context,
      stack: err instanceof Error ? err.stack : undefined,
    });
  } else {
    logger.warn(error.message, context);
  }

  res.status(error.status).json({
    status: 'error',
    code: error.code,
    message: error.message,
    ...(error.errors ? { errors: error.errors } : {}),
  });
};
