import axios, { AxiosError } from 'axios';
import type { ApiError } from '../types/api';
import { clearSession, getStoredToken } from '../utils/token';

/** The one Axios instance the whole app uses. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  // Generous: a free-tier backend can take ~1 minute to wake up after sleeping.
  timeout: 60_000,
});

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

type UnauthorizedListener = () => void;
let onUnauthorized: UnauthorizedListener | null = null;

/** AuthContext registers here so a 401 anywhere logs the user out and sends them to /login. */
export function setUnauthorizedHandler(listener: UnauthorizedListener | null): void {
  onUnauthorized = listener;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? '';
    // A 401 from login itself means "wrong password", not "session expired".
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthCall) {
      clearSession();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** Pulls the backend's ApiError out of an Axios error, if there is one. */
export function toApiError(error: unknown): ApiError | null {
  if (axios.isAxiosError(error) && error.response?.data && typeof error.response.data === 'object') {
    const data = error.response.data as Partial<ApiError>;
    if (typeof data.message === 'string') {
      return { fieldErrors: [], ...data } as ApiError;
    }
  }
  return null;
}

/** A human-readable message for any error. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const apiError = toApiError(error);
  if (apiError) return apiError.message;
  if (axios.isAxiosError(error) && !error.response) return 'Cannot reach the server. Is the backend running?';
  return fallback;
}

/** Backend field errors as { field: message }. */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  for (const fe of toApiError(error)?.fieldErrors ?? []) {
    if (!result[fe.field]) result[fe.field] = fe.message;
  }
  return result;
}
