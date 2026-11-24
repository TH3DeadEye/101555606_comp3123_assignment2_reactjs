import { AxiosError, AxiosHeaders, CanceledError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';
import { formatWait, isCanceled, toAppError } from './errors';

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

function httpError(status: number, data: unknown, headers: Record<string, string> = {}): AxiosError {
  const response = { status, data, statusText: '', headers, config } as AxiosResponse;
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, {}, response);
}

const apiError = (status: number, code: string, message: string, extra: object = {}) =>
  httpError(status, { status: 'error', code, message, ...extra });

describe('toAppError: problems without a server answer', () => {
  it('explains a network failure without technical words', () => {
    const result = toAppError(new AxiosError('Network Error', 'ERR_NETWORK', config));
    expect(result.kind).toBe('network');
    expect(result.message).toBe('Cannot reach the server. Check your connection and try again.');
    expect(result.message).not.toMatch(/Network Error|axios/i);
  });

  it('explains a timeout', () => {
    const result = toAppError(new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED', config));
    expect(result.kind).toBe('timeout');
    expect(result.message).toMatch(/too long/);
  });

  it('never shows the message of an unexpected non-HTTP error', () => {
    const result = toAppError(new TypeError("Cannot read properties of undefined (reading 'x')"));
    expect(result.kind).toBe('unknown');
    expect(result.message).toBe('Something unexpected happened. Please try again.');
  });

  it('recognises a cancelled request so it can be ignored', () => {
    expect(isCanceled(new CanceledError())).toBe(true);
    expect(isCanceled(new Error('x'))).toBe(false);
  });
});

describe('toAppError: login and session errors (401)', () => {
  it('invalid login credentials', () => {
    const result = toAppError(apiError(401, 'INVALID_CREDENTIALS', 'Invalid username/email or password.'));
    expect(result.kind).toBe('unauthorized');
    expect(result.message).toBe('Incorrect username/email or password.');
  });

  it('expired session', () => {
    expect(toAppError(apiError(401, 'TOKEN_EXPIRED', 'x')).message).toBe('Your session has expired. Please log in again.');
  });

  it('invalid session', () => {
    expect(toAppError(apiError(401, 'TOKEN_INVALID', 'x')).message).toMatch(/no longer valid/);
  });
});

describe('toAppError: validation (400) and conflicts (409)', () => {
  it('groups several messages for the same field and keeps the other fields', () => {
    const result = toAppError(
      apiError(400, 'VALIDATION_ERROR', 'Validation failed.', {
        errors: [
          { field: 'password', message: 'Password must contain a number.' },
          { field: 'password', message: 'Password must contain a special character.' },
          { field: 'email', message: 'Enter a valid email address.' },
        ],
      }),
    );

    expect(result.kind).toBe('validation');
    expect(result.message).toBe('Please correct the highlighted fields and try again.');
    expect(result.fieldErrors).toEqual({
      password: ['Password must contain a number.', 'Password must contain a special character.'],
      email: ['Enter a valid email address.'],
    });
  });

  it('shows the server wording for "user already exists" and points at the field', () => {
    const result = toAppError(
      apiError(409, 'CONFLICT', 'That username is already taken.', {
        errors: [{ field: 'username', message: 'That username is already taken.' }],
      }),
    );

    expect(result.kind).toBe('conflict');
    expect(result.message).toBe('That username is already taken.');
    expect(result.fieldErrors.username).toEqual(['That username is already taken.']);
  });
});

describe('toAppError: employees (403 / 404)', () => {
  it("another user's employee", () => {
    const result = toAppError(apiError(403, 'FORBIDDEN', 'You do not have permission to access this employee.'));
    expect(result.kind).toBe('forbidden');
    expect(result.message).toBe("You don't have access to this employee.");
  });

  it('employee that does not exist', () => {
    const result = toAppError(apiError(404, 'NOT_FOUND', 'Employee not found.'));
    expect(result.kind).toBe('not-found');
    expect(result.message).toMatch(/could not be found/);
  });
});

describe('toAppError: rate limiting (429)', () => {
  it('turns retry_after_seconds into a readable wait', () => {
    const result = toAppError(apiError(429, 'RATE_LIMITED', 'Too many failed login attempts.', { retry_after_seconds: 899 }));
    expect(result.kind).toBe('rate-limit');
    expect(result.retryAfterSeconds).toBe(899);
    expect(result.message).toBe('Too many attempts. Please wait 15 minutes and try again.');
  });

  it('falls back to the Retry-After header', () => {
    const result = toAppError(httpError(429, 'Too Many Requests', { 'retry-after': '30' }));
    expect(result.message).toBe('Too many attempts. Please wait 30 seconds and try again.');
  });

  it('still works without any timing information', () => {
    expect(toAppError(httpError(429, null)).message).toBe('Too many attempts. Please wait a few minutes and try again.');
  });
});

describe('toAppError: picture uploads', () => {
  it('file too large (413) is attached to the picture field', () => {
    const result = toAppError(apiError(413, 'FILE_TOO_LARGE', 'The picture is too large.'));
    expect(result.kind).toBe('file');
    expect(result.message).toBe('The picture is too large. The maximum size is 2 MB.');
    expect(result.fieldErrors.profile_picture).toEqual([result.message]);
  });

  it('wrong file type (400)', () => {
    const result = toAppError(apiError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG and WebP images are allowed.'));
    expect(result.kind).toBe('file');
    expect(result.message).toBe('Only JPEG, PNG and WebP pictures are allowed.');
  });
});

describe('toAppError: server problems (5xx)', () => {
  it('hides whatever the server said', () => {
    const result = toAppError(apiError(500, 'INTERNAL_ERROR', 'TypeError: secret details at db.js:42'));
    expect(result.kind).toBe('server');
    expect(result.message).toBe('The server ran into a problem. Please try again in a moment.');
    expect(result.message).not.toContain('secret');
  });

  it('copes with an HTML error page from a proxy', () => {
    const result = toAppError(httpError(502, '<html><body>Bad Gateway</body></html>'));
    expect(result.kind).toBe('server');
    expect(result.message).not.toContain('html');
  });
});

describe('formatWait', () => {
  it('uses seconds, minutes and hours with correct plurals', () => {
    expect(formatWait(1)).toBe('1 second');
    expect(formatWait(45)).toBe('45 seconds');
    expect(formatWait(60)).toBe('1 minute');
    expect(formatWait(61)).toBe('2 minutes');
    expect(formatWait(899)).toBe('15 minutes');
    expect(formatWait(3600)).toBe('1 hour');
    expect(formatWait(7300)).toBe('3 hours');
  });
});
