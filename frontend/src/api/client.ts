import axios from 'axios';

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
