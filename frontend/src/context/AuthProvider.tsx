import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { login as loginRequest } from '../api/authApi';
import { setUnauthorizedHandler, type UnauthorizedReason } from '../api/client';
import type { LoginPayload } from '../api/types';
import { clearSession, getTokenExpiry, loadSession, saveSession, type Session } from '../utils/session';
import { AuthContext, type AuthContextValue } from './AuthContext';

// setTimeout cannot wait longer than about 24.8 days.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // Read straight from localStorage, so a refresh keeps the user logged in and
  // a protected page never flashes the login screen first.
  const [session, setSession] = useState<Session | null>(loadSession);
  const [sessionNotice, setSessionNotice] = useState<UnauthorizedReason | null>(null);

  const endSession = useCallback(
    (notice: UnauthorizedReason | null) => {
      clearSession();
      // Private data must not stay in memory once the user is gone.
      queryClient.clear();
      setSession(null);
      setSessionNotice(notice);
    },
    [queryClient],
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await loginRequest(payload);
      const next: Session = { token: response.token, user: response.user };
      saveSession(next);
      queryClient.clear(); // the new user starts with an empty cache
      setSession(next);
      setSessionNotice(null);
    },
    [queryClient],
  );

  const logout = useCallback(() => endSession(null), [endSession]);

  // The Axios interceptor reports 401 answers from protected endpoints here.
  useEffect(() => {
    setUnauthorizedHandler((reason) => endSession(reason));
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  // End the session by itself when the token's lifetime is over.
  useEffect(() => {
    if (!session) return;
    const expiry = getTokenExpiry(session.token);
    if (expiry === null) return;

    const wait = Math.min(Math.max(expiry - Date.now(), 0), MAX_TIMEOUT_MS);
    const timer = setTimeout(() => endSession('expired'), wait);
    return () => clearTimeout(timer);
  }, [session, endSession]);

  // Logging in or out in another tab changes localStorage here too.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== 'token') return; // null means storage.clear()
      const restored = loadSession();
      if (!restored) queryClient.clear();
      setSession(restored);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [queryClient]);

  // The back/forward cache can bring back an old page without running any code.
  // Re-check the session so a logged-out user does not see private data again.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setSession(loadSession());
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      sessionNotice,
      login,
      logout,
    }),
    [session, sessionNotice, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
