import type { AuthUser } from '../api/types';

// The JWT and the logged-in user live in localStorage so the session survives
// a page refresh. The trade-off (any script that runs on the page, for example
// through an XSS bug, could read it) is explained in the README.
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export interface Session {
  token: string;
  user: AuthUser;
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage can be blocked by the browser's privacy settings
  }
}

export function getToken(): string | null {
  return readStorage(TOKEN_KEY);
}

export function saveSession(session: Session): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* nothing to clear if storage is blocked */
  }
}

// Reads the expiry (in milliseconds since 1970) from the token's payload. The
// signature is NOT checked here: this only lets the UI notice an expired
// session early. The backend verifies every token for real.
export function getTokenExpiry(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const { exp } = JSON.parse(json) as { exp?: unknown };
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

// A token that cannot be read is treated as unusable, like an expired one.
export function isTokenExpired(token: string, now: number = Date.now()): boolean {
  const expiry = getTokenExpiry(token);
  return expiry === null || expiry <= now;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate._id === 'string' && typeof candidate.username === 'string';
}

// Restores the session after a refresh. Anything missing, corrupt or expired
// is cleaned up and reported as "not logged in".
export function loadSession(): Session | null {
  const token = readStorage(TOKEN_KEY);
  const rawUser = readStorage(USER_KEY);
  if (!token || !rawUser) return null;

  try {
    const user: unknown = JSON.parse(rawUser);
    if (isAuthUser(user) && !isTokenExpired(token)) return { token, user };
  } catch {
    /* fall through: the stored user was not valid JSON */
  }

  clearSession();
  return null;
}
