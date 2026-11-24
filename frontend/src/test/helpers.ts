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
