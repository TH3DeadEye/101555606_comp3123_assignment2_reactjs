import { describe, expect, it } from 'vitest';
import { api, resolveApiOrigin } from './client';

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
