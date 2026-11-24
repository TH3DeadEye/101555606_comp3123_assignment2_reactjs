import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { api } from '../api/client';
import type { AuthUser, Employee } from '../api/types';

const base64Url = (value: object): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Builds a token with the same shape as the backend's JWTs. The signature is
// fake: the frontend never verifies it, only the backend does.
export function makeJwt(options: { expiresInSeconds?: number; sub?: string } = {}): string {
  const { expiresInSeconds = 3600, sub = 'user-1' } = options;
  const now = Math.floor(Date.now() / 1000);
  return [
    base64Url({ alg: 'HS256', typ: 'JWT' }),
    base64Url({ sub, iat: now, exp: now + expiresInSeconds }),
    'signature',
  ].join('.');
}

export const testUser: AuthUser = {
  _id: 'user-1',
  username: 'alice',
  email: 'alice@example.com',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

export function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    _id: 'emp-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@example.com',
    position: 'Software Engineer',
    department: 'Engineering',
    salary: 85000,
    date_of_joining: '2024-03-01T00:00:00.000Z',
    profile_picture: null,
    user: 'user-1',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---- Fake network -----------------------------------------------------------

const realAdapter = api.defaults.adapter;

// Replaces the network with a function that answers every request. Any status
// outside 200-299 rejects like a real failed request would.
export function fakeServer(answer: (config: InternalAxiosRequestConfig) => { status: number; data?: unknown }): void {
  const adapter: AxiosAdapter = (config) =>
    new Promise((resolve, reject) => {
      const { status, data } = answer(config);
      const response = { data, status, statusText: '', headers: {}, config, request: {} } as AxiosResponse;
      if (status >= 200 && status < 300) resolve(response);
      else reject(new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, {}, response));
    });
  api.defaults.adapter = adapter;
}

export function restoreServer(): void {
  api.defaults.adapter = realAdapter;
}

// The server cannot be reached at all (no response).
export function fakeNetworkFailure(): void {
  api.defaults.adapter = (config) => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK', config));
}

// The request is sent but never answered, which shows what the UI does while waiting.
export function fakePendingServer(): void {
  api.defaults.adapter = () => new Promise(() => undefined);
}
