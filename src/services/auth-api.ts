// Provides typed clients for sign-in, token refresh, logout and server entitlement checks.

import { Platform } from 'react-native';

import { ApiError, getApiConfiguration } from '@/services/api';

const DEFAULT_TIMEOUT_MS = 15_000;

export type UserRole = 'admin' | 'supervisor' | 'reviewer' | 'viewer';

export interface AuthUser {
  user_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  roles?: string[];
  revenuecat_app_user_id: string;
  authentication_method?: string;
}

export interface AuthSessionData {
  token_type: 'bearer';
  access_token: string;
  refresh_token: string;
  access_expires_at: string;
  refresh_expires_at: string;
  user: AuthUser;
}

export interface ServerEntitlementData {
  configured: boolean;
  active: boolean;
  entitlement_id: string;
  app_user_id: string;
  expires_at: string;
  checked_at: string;
  source: string;
  message: string;
}

interface ServiceEnvelope<T> {
  status: string;
  data: T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serverMessage(payload: unknown): string {
  if (!isRecord(payload)) return '';
  const detail = payload.detail;
  if (typeof detail === 'string') return detail;
  if (isRecord(detail) && typeof detail.message === 'string') return detail.message;
  if (typeof payload.message === 'string') return payload.message;
  return '';
}

function authenticationNetworkMessage(baseUrl: string): string {
  const nativeLoopback =
    Platform.OS !== 'web' &&
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?=[:/]|$)/i.test(baseUrl);

  if (nativeLoopback) {
    return (
      'The authentication backend is configured with localhost or 127.0.0.1. ' +
      'A physical phone cannot reach the computer through that address. ' +
      'Set EXPO_PUBLIC_API_BASE_URL to the computer LAN IPv4 address, restart Metro with --clear, and try again.'
    );
  }

  return 'The authentication service could not be reached.';
}

async function request<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    accessToken?: string;
    body?: Record<string, unknown>;
  } = {},
): Promise<T> {
  const configuration = getApiConfiguration();
  if (!configuration.baseUrl) {
    throw new ApiError(
      'The backend URL is not configured. Add EXPO_PUBLIC_API_BASE_URL to .env.local.',
      'not-configured',
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (options.accessToken?.trim()) {
    headers.Authorization = `Bearer ${options.accessToken.trim()}`;
  }

  try {
    const response = await fetch(`${configuration.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const message = serverMessage(payload);
      throw new ApiError(
        message || `The authentication service returned status ${response.status}.`,
        response.status === 401 ? 'access-denied' : 'http',
        response.status,
        payload,
      );
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The authentication service timed out.', 'timeout');
    }
    throw new ApiError(
      authenticationNetworkMessage(configuration.baseUrl),
      'network',
      0,
      error,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseSession(payload: unknown): AuthSessionData {
  if (
    !isRecord(payload) ||
    payload.status !== 'ok' ||
    !isRecord(payload.data) ||
    typeof payload.data.access_token !== 'string' ||
    typeof payload.data.refresh_token !== 'string' ||
    !isRecord(payload.data.user)
  ) {
    throw new ApiError(
      'The backend returned an invalid authentication session.',
      'invalid-response',
      0,
      payload,
    );
  }
  return payload.data as unknown as AuthSessionData;
}

export async function signIn(email: string, password: string): Promise<AuthSessionData> {
  return parseSession(
    await request<unknown>('/auth/login', {
      method: 'POST',
      body: { email: email.trim(), password },
    }),
  );
}

export async function refreshSession(refreshToken: string): Promise<AuthSessionData> {
  return parseSession(
    await request<unknown>('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    }),
  );
}

export async function signOut(accessToken: string): Promise<void> {
  await request<unknown>('/auth/logout', {
    method: 'POST',
    accessToken,
  });
}

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  const response = await request<ServiceEnvelope<{ user: AuthUser }>>('/auth/me', {
    accessToken,
  });
  if (response.status !== 'ok' || !response.data?.user) {
    throw new ApiError('The backend returned an invalid user profile.', 'invalid-response');
  }
  return response.data.user;
}

export async function getServerEntitlement(
  accessToken: string,
  forceRefresh = false,
): Promise<ServerEntitlementData> {
  const response = await request<ServiceEnvelope<ServerEntitlementData>>(
    `/auth/entitlement?force_refresh=${forceRefresh ? 'true' : 'false'}`,
    { accessToken },
  );
  if (response.status !== 'ok' || typeof response.data?.active !== 'boolean') {
    throw new ApiError(
      'The backend returned an invalid server entitlement result.',
      'invalid-response',
    );
  }
  return response.data;
}

export function roleAtLeast(role: UserRole | undefined, minimum: UserRole): boolean {
  const rank: Record<UserRole, number> = {
    viewer: 10,
    reviewer: 20,
    supervisor: 30,
    admin: 40,
  };
  return role ? rank[role] >= rank[minimum] : false;
}
