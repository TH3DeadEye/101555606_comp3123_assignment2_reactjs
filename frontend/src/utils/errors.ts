import { isAxiosError, isCancel } from 'axios';
import type { ApiErrorBody } from '../api/types';

export type ErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limit'
  | 'file'
  | 'network'
  | 'timeout'
  | 'server'
  | 'unknown';

// What the screens work with. Nothing technical (stack traces, status text,
// Axios messages) ever ends up in "message", so it is always safe to show.
export interface AppError {
  kind: ErrorKind;
  status: number | null;
  code: string | null;
  message: string;
  // Messages grouped by form field, for example { email: ['Enter a valid email address.'] }
  fieldErrors: Record<string, string[]>;
  retryAfterSeconds: number | null;
}

const PICTURE_FIELD = 'profile_picture';

// Friendly texts for the error codes the backend sends.
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect username/email or password.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  TOKEN_INVALID: 'Your session is no longer valid. Please log in again.',
  AUTH_REQUIRED: 'Please log in to continue.',
  FORBIDDEN: "You don't have access to this employee.",
  NOT_FOUND: 'That employee could not be found. It may have been deleted.',
  FILE_TOO_LARGE: 'The picture is too large. The maximum size is 2 MB.',
  INVALID_FILE_TYPE: 'Only JPEG, PNG and WebP pictures are allowed.',
  UNEXPECTED_FILE: 'The picture could not be uploaded. Please choose the file again.',
  TOO_MANY_FILES: 'Only one picture can be uploaded at a time.',
  BAD_UPLOAD: 'The picture could not be uploaded. Please choose the file again.',
  MALFORMED_JSON: 'The request could not be understood. Please try again.',
};

const FILE_CODES = new Set(['FILE_TOO_LARGE', 'INVALID_FILE_TYPE', 'UNEXPECTED_FILE', 'TOO_MANY_FILES', 'BAD_UPLOAD']);

const SERVER_MESSAGE = 'The server ran into a problem. Please try again in a moment.';
const UNKNOWN_MESSAGE = 'Something unexpected happened. Please try again.';

// "about 15 minutes", "30 seconds", "2 hours"
export function formatWait(seconds: number): string {
  const plural = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'}`;
  if (seconds < 60) return plural(Math.max(1, Math.ceil(seconds)), 'second');
  if (seconds < 3600) return plural(Math.ceil(seconds / 60), 'minute');
  return plural(Math.ceil(seconds / 3600), 'hour');
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && (value as { status?: unknown }).status === 'error';
}

function groupFieldErrors(body: ApiErrorBody): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const { field, message } of body.errors ?? []) {
    (grouped[field] ??= []).push(message);
  }
  return grouped;
}

function readRetryAfter(body: ApiErrorBody | null, header: unknown): number | null {
  if (body?.retry_after_seconds !== undefined) return body.retry_after_seconds;
  const parsed = Number(header);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function unknownError(): AppError {
  return { kind: 'unknown', status: null, code: null, message: UNKNOWN_MESSAGE, fieldErrors: {}, retryAfterSeconds: null };
}

// An aborted request (the user left the page, a newer search replaced it) is
// not a failure and should not be shown.
export function isCanceled(error: unknown): boolean {
  return isCancel(error);
}

export function toAppError(error: unknown): AppError {
  if (!isAxiosError(error)) return unknownError();

  // No response at all: the server could not be reached.
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        kind: 'timeout',
        status: null,
        code: error.code,
        message: 'The server took too long to respond. Please try again.',
        fieldErrors: {},
        retryAfterSeconds: null,
      };
    }
    return {
      kind: 'network',
      status: null,
      code: error.code ?? null,
      message: 'Cannot reach the server. Check your connection and try again.',
      fieldErrors: {},
      retryAfterSeconds: null,
    };
  }

  const { status, data, headers } = error.response;
  // Bodies that are not our JSON error shape (for example an HTML 502 page from
  // a proxy) are ignored, so nothing technical can leak into the message.
  const body = isApiErrorBody(data) ? data : null;
  const code = body?.code ?? null;
  const fieldErrors = body ? groupFieldErrors(body) : {};
  const base = { status, code, fieldErrors, retryAfterSeconds: null };

  if (status >= 500) return { ...base, kind: 'server', message: SERVER_MESSAGE };

  if (status === 429) {
    const retryAfterSeconds = readRetryAfter(body, (headers as Record<string, unknown>)['retry-after']);
    const wait = retryAfterSeconds === null ? 'a few minutes' : formatWait(retryAfterSeconds);
    return { ...base, kind: 'rate-limit', retryAfterSeconds, message: `Too many attempts. Please wait ${wait} and try again.` };
  }

  if ((code && FILE_CODES.has(code)) || status === 413) {
    const message = (code && MESSAGES[code]) || MESSAGES.FILE_TOO_LARGE!;
    // Shown next to the picture control in the form.
    return { ...base, kind: 'file', message, fieldErrors: { ...fieldErrors, [PICTURE_FIELD]: [message] } };
  }

  const friendly = code ? MESSAGES[code] : undefined;

  switch (status) {
    case 400:
      return {
        ...base,
        kind: 'validation',
        message: friendly ?? 'Please correct the highlighted fields and try again.',
      };
    case 401:
      return { ...base, kind: 'unauthorized', message: friendly ?? 'Please log in to continue.' };
    case 403:
      return { ...base, kind: 'forbidden', message: friendly ?? MESSAGES.FORBIDDEN! };
    case 404:
      return { ...base, kind: 'not-found', message: friendly ?? MESSAGES.NOT_FOUND! };
    case 409:
      // The backend's conflict messages are already written for people
      // ("That username is already taken.").
      return { ...base, kind: 'conflict', message: body?.message ?? 'That value is already in use.' };
    default:
      return { ...base, kind: 'unknown', message: UNKNOWN_MESSAGE };
  }
}

export function getErrorMessage(error: unknown): string {
  return toAppError(error).message;
}
