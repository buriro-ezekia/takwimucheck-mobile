// Provides a typed, timeout-aware client for TakwimuCheck backend readiness checks.

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : null;
const DEFAULT_TIMEOUT_MS = 10_000;

export type ApiErrorCode =
  | 'not-configured'
  | 'timeout'
  | 'network'
  | 'http'
  | 'invalid-response';

export interface ApiConfiguration {
  configured: boolean;
  baseUrl: string | null;
}

export interface HealthResponse {
  status: string;
  service: string;
}

export interface VersionResponse {
  version: string;
}

export interface RuntimeStatusData {
  version: string;
  protected_storage_routes: boolean;
  cors_enabled: boolean;
  [key: string]: unknown;
}

export interface ServiceEnvelope<T> {
  status: string;
  data: T;
}

export interface BackendConnectionSnapshot {
  service: string;
  version: string;
  protectedStorageRoutes: boolean;
  corsEnabled: boolean;
  checkedAt: string;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, code: ApiErrorCode, status = 0, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function getApiConfiguration(): ApiConfiguration {
  return {
    configured: Boolean(API_BASE_URL),
    baseUrl: API_BASE_URL,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractServerMessage(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.detail === 'string' && payload.detail.trim()) {
    return payload.detail.trim();
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }

  return null;
}

function parseRuntimeEnvelope(payload: unknown): ServiceEnvelope<RuntimeStatusData> {
  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    !isRecord(payload.data) ||
    typeof payload.data.version !== 'string'
  ) {
    throw new ApiError(
      'The backend returned an unexpected runtime-status response.',
      'invalid-response',
      0,
      payload,
    );
  }

  return payload as unknown as ServiceEnvelope<RuntimeStatusData>;
}

async function request<T>(path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      'The backend URL is not configured. Add EXPO_PUBLIC_API_BASE_URL to .env.local.',
      'not-configured',
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    const responseText = await response.text();
    let payload: unknown = null;

    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = responseText;
      }
    }

    if (!response.ok) {
      const serverMessage = extractServerMessage(payload);
      throw new ApiError(
        serverMessage
          ? `The backend returned ${response.status}: ${serverMessage}`
          : `The backend returned status ${response.status}.`,
        'http',
        response.status,
        payload,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        `The backend did not respond within ${Math.round(timeoutMs / 1000)} seconds.`,
        'timeout',
      );
    }

    throw new ApiError(
      'The backend could not be reached. Check the URL, connection and server status.',
      'network',
      0,
      error,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'An unexpected backend error occurred.';
}

export const api = {
  health: () => request<HealthResponse>('/health'),
  version: () => request<VersionResponse>('/version'),
  runtimeStatus: async () => parseRuntimeEnvelope(await request<unknown>('/runtime-status')),
};

export async function checkBackendConnection(): Promise<BackendConnectionSnapshot> {
  const [health, version, runtimeStatus] = await Promise.all([
    api.health(),
    api.version(),
    api.runtimeStatus(),
  ]);

  if (health.status !== 'ok' || !health.service?.trim()) {
    throw new ApiError(
      'The backend health endpoint returned an unexpected response.',
      'invalid-response',
      0,
      health,
    );
  }

  if (!version.version?.trim() || runtimeStatus.status !== 'ok') {
    throw new ApiError(
      'The backend version or runtime-status response was incomplete.',
      'invalid-response',
      0,
      { version, runtimeStatus },
    );
  }

  return {
    service: health.service,
    version: runtimeStatus.data.version || version.version,
    protectedStorageRoutes: Boolean(runtimeStatus.data.protected_storage_routes),
    corsEnabled: Boolean(runtimeStatus.data.cors_enabled),
    checkedAt: new Date().toISOString(),
  };
}
