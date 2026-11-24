import { createContext } from 'react';
import type { LoginPayload } from '../api/types';
import type { AuthUser } from '../api/types';
import type { UnauthorizedReason } from '../api/client';

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  // Why the user was logged out against their will (shown on the login page)
  sessionNotice: UnauthorizedReason | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
