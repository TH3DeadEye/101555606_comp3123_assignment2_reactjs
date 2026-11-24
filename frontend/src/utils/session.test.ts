import { describe, expect, it } from 'vitest';
import { makeJwt, testUser } from '../test/helpers';
import { clearSession, getToken, getTokenExpiry, isTokenExpired, loadSession, saveSession } from './session';

describe('reading a token expiry', () => {
  it('reads the exp claim in milliseconds', () => {
    const before = Date.now();
    const expiry = getTokenExpiry(makeJwt({ expiresInSeconds: 3600 }));
    expect(expiry).toBeGreaterThanOrEqual(before + 3_599_000);
    expect(expiry).toBeLessThanOrEqual(Date.now() + 3_601_000);
  });

  it('returns null for something that is not a JWT', () => {
    expect(getTokenExpiry('')).toBeNull();
    expect(getTokenExpiry('not-a-jwt')).toBeNull();
    expect(getTokenExpiry('a.!!!.c')).toBeNull();
  });

  it('detects an expired token and treats an unreadable one as expired', () => {
    expect(isTokenExpired(makeJwt({ expiresInSeconds: 60 }))).toBe(false);
    expect(isTokenExpired(makeJwt({ expiresInSeconds: -5 }))).toBe(true);
    expect(isTokenExpired('garbage')).toBe(true);
  });
});

describe('session storage', () => {
  it('saves and restores a session (this is what survives a page refresh)', () => {
    const token = makeJwt();
    saveSession({ token, user: testUser });

    expect(getToken()).toBe(token);
    expect(loadSession()).toEqual({ token, user: testUser });
  });

  it('uses the "token" key in localStorage', () => {
    const token = makeJwt();
    saveSession({ token, user: testUser });
    expect(localStorage.getItem('token')).toBe(token);
  });

  it('is empty when nothing was stored', () => {
    expect(loadSession()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it('clearSession removes the token and the user', () => {
    saveSession({ token: makeJwt(), user: testUser });
    clearSession();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(loadSession()).toBeNull();
  });

  it('drops an expired session instead of restoring it', () => {
    saveSession({ token: makeJwt({ expiresInSeconds: -10 }), user: testUser });
    expect(loadSession()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('drops a session whose stored user is corrupt', () => {
    localStorage.setItem('token', makeJwt());
    localStorage.setItem('user', '{not json');
    expect(loadSession()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();

    localStorage.setItem('token', makeJwt());
    localStorage.setItem('user', JSON.stringify({ unexpected: true }));
    expect(loadSession()).toBeNull();
  });
});
