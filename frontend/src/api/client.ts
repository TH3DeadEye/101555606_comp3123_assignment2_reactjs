import axios, { isAxiosError } from 'axios';
import { getToken } from '../utils/session';

const DEFAULT_API_URL = 'http://localhost:5001';

// "localhost:5001" parses as a URL with the scheme "localhost:", so the scheme
// has to be checked as well as the syntax.
function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// Turns the VITE_API_URL setting into a clean origin without a trailing slash.
export function resolveApiOrigin(raw: string | undefined): string {
  const value = (raw ?? '').trim() || DEFAULT_API_URL;

  if (!isHttpUrl(value)) {
    throw new Error(`VITE_API_URL must be a full http(s) URL such as ${DEFAULT_API_URL}, but it is "${value}".`);
  }

  return value.replace(/\/+$/, '');
}

// Where the backend lives. Uploaded pictures are served from this origin too.
export const API_ORIGIN = resolveApiOrigin(import.meta.env.VITE_API_URL);

// The one Axios instance every API call goes through.
export const api = axios.create({
  baseURL: `${API_ORIGIN}/api/v1`,
  timeout: 15_000,
  headers: { Accept: 'application/json' },
});

// ---- Session handling ------------------------------------------------------

export type UnauthorizedReason = 'expired' | 'invalid';
type UnauthorizedHandler = (reason: UnauthorizedReason) => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

// The auth context registers a function here that clears the session and sends
// the user to the login page. A callback keeps this file free of React.
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

// These two endpoints answer 401 or 409 for ordinary reasons (wrong password,
// username taken), which must never log anybody out.
const PUBLIC_ENDPOINTS = ['/user/login', '/user/signup'];

function isPublicEndpoint(url: string | undefined): boolean {
  return PUBLIC_ENDPOINTS.some((endpoint) => (url ?? '').endsWith(endpoint));
}

// Every request carries "Authorization: Bearer <jwt>" while a session exists.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

// A 401 from a protected endpoint means the token is missing, invalid or
// expired: tell the auth context so it can clear the session and redirect.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401 && !isPublicEndpoint(error.config?.url)) {
      const body = error.response.data as { code?: unknown } | undefined;
      unauthorizedHandler?.(body?.code === 'TOKEN_EXPIRED' ? 'expired' : 'invalid');
    }
    return Promise.reject(error);
  },
);
