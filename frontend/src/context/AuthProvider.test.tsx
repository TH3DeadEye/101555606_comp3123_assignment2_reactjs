import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '../api/authApi';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { fakeServer, makeJwt, restoreServer, testUser } from '../test/helpers';
import { saveSession } from '../utils/session';
import { AuthProvider } from './AuthProvider';

vi.mock('../api/authApi');

let queryClient: QueryClient;

function renderAuth() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useAuth(), { wrapper });
}

beforeEach(() => {
  queryClient = new QueryClient();
  queryClient.setQueryData(['employees'], ['private data of the previous user']);
});

afterEach(() => {
  vi.useRealTimers();
  restoreServer();
  vi.resetAllMocks();
});

describe('starting up', () => {
  it('is logged out when nothing is stored', () => {
    const { result } = renderAuth();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('restores the session from localStorage, so a page refresh keeps the user logged in', () => {
    saveSession({ token: makeJwt(), user: testUser });

    const { result } = renderAuth();

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.username).toBe('alice');
  });

  it('refuses to be used outside the provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});

describe('login and logout', () => {
  it('stores the token and user, and starts with a clean cache', async () => {
    const token = makeJwt();
    vi.mocked(authApi.login).mockResolvedValue({ message: 'ok', token, user: testUser });
    const { result } = renderAuth();

    await act(async () => {
      await result.current.login({ username: 'alice', password: 'Str0ng!Pass' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.username).toBe('alice');
    expect(localStorage.getItem('token')).toBe(token);
    expect(queryClient.getQueryData(['employees'])).toBeUndefined();
  });

  it('stays logged out and passes the error on when the login fails', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('invalid credentials'));
    const { result } = renderAuth();

    await act(async () => {
      await expect(result.current.login({ username: 'alice', password: 'wrong' })).rejects.toThrow('invalid credentials');
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('logout clears the stored session and every cached private value', () => {
    saveSession({ token: makeJwt(), user: testUser });
    const { result } = renderAuth();

    act(() => result.current.logout());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.sessionNotice).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(queryClient.getQueryData(['employees'])).toBeUndefined();
  });
});

describe('losing the session', () => {
  it('ends the session when the backend answers 401 and says why', async () => {
    saveSession({ token: makeJwt(), user: testUser });
    fakeServer(() => ({ status: 401, data: { status: 'error', code: 'TOKEN_EXPIRED' } }));
    const { result } = renderAuth();

    await act(async () => {
      await api.get('/emp/employees').catch(() => undefined);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.sessionNotice).toBe('expired');
    expect(localStorage.getItem('token')).toBeNull();
    expect(queryClient.getQueryData(['employees'])).toBeUndefined();
  });

  it('ends the session by itself when the token runs out', () => {
    vi.useFakeTimers();
    saveSession({ token: makeJwt({ expiresInSeconds: 5 }), user: testUser });
    const { result } = renderAuth();
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1_500);
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.sessionNotice).toBe('expired');
  });

  it('follows a logout made in another tab', () => {
    saveSession({ token: makeJwt(), user: testUser });
    const { result } = renderAuth();
    expect(result.current.isAuthenticated).toBe(true);

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'token', newValue: null }));
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(queryClient.getQueryData(['employees'])).toBeUndefined();
  });

  it('re-checks the session when the browser restores the page from its back/forward cache', () => {
    saveSession({ token: makeJwt(), user: testUser });
    const { result } = renderAuth();

    localStorage.clear(); // the user logged out while this page was in the cache
    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });

    expect(result.current.isAuthenticated).toBe(false);
  });
});
