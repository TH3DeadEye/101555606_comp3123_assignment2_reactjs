import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeServer, makeJwt, restoreServer, testUser } from '../test/helpers';
import { saveSession } from '../utils/session';
import { api, resolveApiOrigin, setUnauthorizedHandler } from './client';

describe('resolveApiOrigin', () => {
  it('falls back to the local backend when nothing is configured', () => {
    expect(resolveApiOrigin(undefined)).toBe('http://localhost:5001');
    expect(resolveApiOrigin('   ')).toBe('http://localhost:5001');
  });

  it('removes trailing slashes so paths can be appended safely', () => {
    expect(resolveApiOrigin('https://api.example.com/')).toBe('https://api.example.com');
    expect(resolveApiOrigin('https://api.example.com///')).toBe('https://api.example.com');
  });

  it('keeps a port and a plain address untouched', () => {
    expect(resolveApiOrigin('http://localhost:5001')).toBe('http://localhost:5001');
  });

  it('refuses a value that is not a full http(s) URL', () => {
    expect(() => resolveApiOrigin('not a url')).toThrow(/VITE_API_URL/);
    expect(() => resolveApiOrigin('localhost:5001')).toThrow(/VITE_API_URL/); // scheme missing
    expect(() => resolveApiOrigin('ftp://example.com')).toThrow(/VITE_API_URL/);
  });
});

describe('api client', () => {
  it('sends every request to the versioned API path of the configured origin', () => {
    expect(api.defaults.baseURL).toMatch(/\/api\/v1$/);
  });
});

describe('request interceptor', () => {
  afterEach(restoreServer);

  it('attaches the JWT as a Bearer token while a session exists', async () => {
    const token = makeJwt();
    saveSession({ token, user: testUser });
    let seen: unknown;
    fakeServer((config) => {
      seen = config.headers.get('Authorization');
      return { status: 200, data: [] };
    });

    await api.get('/emp/employees');

    expect(seen).toBe(`Bearer ${token}`);
  });

  it('sends no Authorization header when logged out', async () => {
    let seen: unknown = 'not-called';
    fakeServer((config) => {
      seen = config.headers.get('Authorization');
      return { status: 200, data: [] };
    });

    await api.get('/emp/employees');

    expect(seen).toBeUndefined();
  });
});

describe('response interceptor (401 handling)', () => {
  const onUnauthorized = vi.fn();

  beforeEach(() => {
    onUnauthorized.mockClear();
    setUnauthorizedHandler(onUnauthorized);
  });
  afterEach(() => {
    restoreServer();
    setUnauthorizedHandler(null);
  });

  it('reports a 401 from a protected endpoint and still rejects the request', async () => {
    fakeServer(() => ({ status: 401, data: { status: 'error', code: 'TOKEN_INVALID' } }));

    await expect(api.get('/emp/employees')).rejects.toMatchObject({ response: { status: 401 } });

    expect(onUnauthorized).toHaveBeenCalledExactlyOnceWith('invalid');
  });

  it('tells an expired token apart from an invalid one', async () => {
    fakeServer(() => ({ status: 401, data: { status: 'error', code: 'TOKEN_EXPIRED' } }));

    await expect(api.get('/emp/employees')).rejects.toBeDefined();

    expect(onUnauthorized).toHaveBeenCalledExactlyOnceWith('expired');
  });

  it('does NOT log anyone out when the login itself answers 401 (wrong password)', async () => {
    fakeServer(() => ({ status: 401, data: { status: 'error', code: 'INVALID_CREDENTIALS' } }));

    await expect(api.post('/user/login', {})).rejects.toBeDefined();

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('ignores errors that are not 401', async () => {
    for (const status of [400, 403, 404, 409, 429, 500]) {
      fakeServer(() => ({ status, data: { status: 'error' } }));
      await expect(api.get('/emp/employees')).rejects.toBeDefined();
    }

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not crash when no handler is registered', async () => {
    setUnauthorizedHandler(null);
    fakeServer(() => ({ status: 401, data: {} }));

    await expect(api.get('/emp/employees')).rejects.toMatchObject({ response: { status: 401 } });
  });
});
