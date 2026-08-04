// Provides typed, timeout-aware clients for public readiness and protected pilot routes.

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : null;
const DEFAULT_TIMEOUT_MS = 10_000;

export type ApiErrorCode =
  | 'not-configured'
  | 'missing-access-key'
  | 'access-denied'
  | 'storage-unavailable'
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

export interface ValidationRunRecord {
  validation_run_id?: string;
  survey_id?: string;
  actor?: string;
  status?: string;
  output_folder?: string;
  issue_count?: string | number;
  quality_score?: string | number;
  created_at?: string;
  [key: string]: unknown;
}

export interface ProtectedIssueRecord {
  issue_id?: string;
  validation_run_id?: string;
  survey_id?: string;
  record_id?: string;
  variable_name?: string;
  rule_id?: string;
  issue_type?: string;
  severity?: string;
  expected_rule?: string;
  message?: string;
  status?: string;
  reviewer?: string;
  decision?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface ValidationRunsData {
  count: number;
  validation_runs: ValidationRunRecord[];
}

export interface IssueRegisterData {
  count: number;
  issues: ProtectedIssueRecord[];
}

export interface ProtectedAccessSnapshot {
  validationRunCount: number;
  issueCount: number;
  validationRuns: ValidationRunRecord[];
  issues: ProtectedIssueRecord[];
  checkedAt: string;
}

interface RequestOptions {
  timeoutMs?: number;
  accessKey?: string;
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

function parseValidationRunsEnvelope(payload: unknown): ServiceEnvelope<ValidationRunsData> {
  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    !isRecord(payload.data) ||
    typeof payload.data.count !== 'number' ||
    !Array.isArray(payload.data.validation_runs)
  ) {
    throw new ApiError(
      'The backend returned an unexpected validation-runs response.',
      'invalid-response',
      0,
      payload,
    );
  }

  return payload as unknown as ServiceEnvelope<ValidationRunsData>;
}

function parseIssueRegisterEnvelope(payload: unknown): ServiceEnvelope<IssueRegisterData> {
  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    !isRecord(payload.data) ||
    typeof payload.data.count !== 'number' ||
    !Array.isArray(payload.data.issues)
  ) {
    throw new ApiError(
      'The backend returned an unexpected issue-register response.',
      'invalid-response',
      0,
      payload,
    );
  }

  return payload as unknown as ServiceEnvelope<IssueRegisterData>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      'The backend URL is not configured. Add EXPO_PUBLIC_API_BASE_URL to .env.local.',
      'not-configured',
    );
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (options.accessKey?.trim()) {
    headers['x-api-key'] = options.accessKey.trim();
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers,
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
      if (response.status === 403) {
        throw new ApiError(
          'Protected backend access was denied. Check the session access key.',
          'access-denied',
          response.status,
        );
      }

      if (response.status === 404) {
        throw new ApiError(
          'Protected storage routes are unavailable. Start the backend with a configured database path.',
          'storage-unavailable',
          response.status,
        );
      }

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
  validationRuns: async (accessKey: string) =>
    parseValidationRunsEnvelope(await request<unknown>('/validation-runs', { accessKey })),
  issueRegister: async (accessKey: string) =>
    parseIssueRegisterEnvelope(await request<unknown>('/issue-register', { accessKey })),
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

export async function checkProtectedAccess(accessKey: string): Promise<ProtectedAccessSnapshot> {
  const trimmedAccessKey = accessKey.trim();

  if (!trimmedAccessKey) {
    throw new ApiError(
      'Enter the protected-route access key for this app session.',
      'missing-access-key',
    );
  }

  const [validationRuns, issueRegister] = await Promise.all([
    api.validationRuns(trimmedAccessKey),
    api.issueRegister(trimmedAccessKey),
  ]);

  if (validationRuns.status !== 'ok' || issueRegister.status !== 'ok') {
    throw new ApiError(
      'The protected backend routes returned an incomplete response.',
      'invalid-response',
      0,
      { validationRuns, issueRegister },
    );
  }

  return {
    validationRunCount: validationRuns.data.count,
    issueCount: issueRegister.data.count,
    validationRuns: validationRuns.data.validation_runs,
    issues: issueRegister.data.issues,
    checkedAt: new Date().toISOString(),
  };
}
