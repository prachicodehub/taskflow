import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setUnauthorizedHandler } from '../api/axiosClient';
import { authApi } from '../api/endpoints';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/api';
import { clearSession, getTokenExpiry, loadSession, saveSession } from '../utils/token';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /** Set when the session ended on its own (expired / rejected), so the login page can explain why. */
  logoutReason: string | null;
  login: (body: LoginRequest) => Promise<void>;
  register: (body: RegisterRequest) => Promise<void>;
  logout: (reason?: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthResponse | null>(() => loadSession());
  const [logoutReason, setLogoutReason] = useState<string | null>(null);

  const logout = useCallback(
    (reason?: string) => {
      clearSession();
      setSession(null);
      setLogoutReason(reason ?? null);
      queryClient.clear(); // never show the previous user's cached data
    },
    [queryClient],
  );

  const startSession = useCallback((auth: AuthResponse) => {
    saveSession(auth);
    setLogoutReason(null);
    setSession(auth);
  }, []);

  const login = useCallback(async (body: LoginRequest) => startSession(await authApi.login(body)), [startSession]);
  const register = useCallback(
    async (body: RegisterRequest) => startSession(await authApi.register(body)),
    [startSession],
  );

  // Any 401 from the API (expired or revoked token) → log out.
  useEffect(() => {
    setUnauthorizedHandler(() => logout('Your session has expired. Please log in again.'));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Auto-logout exactly when the JWT expires, even if the user is idle.
  useEffect(() => {
    if (!session) return;
    const expiry = getTokenExpiry(session.token) ?? Date.parse(session.expiresAt);
    const delay = expiry - Date.now();
    if (delay <= 0) {
      logout('Your session has expired. Please log in again.');
      return;
    }
    // setTimeout overflows above ~24.8 days; tokens here live minutes, but cap it to be safe.
    const timer = window.setTimeout(
      () => logout('Your session has expired. Please log in again.'),
      Math.min(delay, 2_147_000_000),
    );
    return () => window.clearTimeout(timer);
  }, [session, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: session !== null,
      logoutReason,
      login,
      register,
      logout,
    }),
    [session, logoutReason, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
