// Provides typed, timeout-aware clients for readiness, authenticated data and CSV validation routes.

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : null;
const DEFAULT_TIMEOUT_MS = 10_000;
const VALIDATION_TIMEOUT_MS = 120_000;

export type ApiErrorCode =
  | 'not-configured'
  | 'missing-access-key'
  | 'access-denied'
  | 'storage-unavailable'
  | 'preflight-failed'
  | 'metadata-unavailable'
  | 'validation-failed'
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
  csv_preflight_enabled?: boolean;
  validation_submission_enabled?: boolean;
  authentication_enabled?: boolean;
  short_lived_access_tokens_enabled?: boolean;
  role_based_authorisation_enabled?: boolean;
  legacy_api_key_allowed?: boolean;
  server_revenuecat_verification_enabled?: boolean;
  access_token_ttl_seconds?: number;
  refresh_token_ttl_seconds?: number;
  upload_max_file_size_bytes?: number;
  upload_max_records?: number;
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
  csvPreflightEnabled: boolean;
  validationSubmissionEnabled: boolean;
  authenticationEnabled: boolean;
  shortLivedAccessTokensEnabled: boolean;
  roleBasedAuthorisationEnabled: boolean;
  serverRevenueCatVerificationEnabled: boolean;
  accessTokenTtlSeconds: number | null;
  refreshTokenTtlSeconds: number | null;
  uploadMaxFileSizeBytes: number | null;
  uploadMaxRecords: number | null;
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

export interface UploadableCsvFile {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  webFile?: Blob | null;
}

export interface CsvPreflightLimits {
  max_file_size_bytes: number;
  max_records: number;
}

export interface CsvPreflightData {
  ready: boolean;
  file_name: string;
  file_size_bytes: number;
  sha256: string;
  encoding: string;
  row_count: number;
  column_count: number;
  columns: string[];
  empty_row_count: number;
  inconsistent_row_count: number;
  warnings: string[];
  errors: string[];
  error_codes: string[];
  limits: CsvPreflightLimits;
}

export interface ValidationSubmissionData {
  validation_run: ValidationRunRecord;
  preflight: CsvPreflightData;
  issues_written: number;
  quality_rating: string;
  artifacts: Record<string, string>;
}

interface RequestOptions {
  timeoutMs?: number;
  accessKey?: string;
  method?: 'GET' | 'POST';
  body?: BodyInit;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, code: ApiErrorCode, status = 0, details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function isApiError(error: unknown): error is ApiError {
  if (error instanceof ApiError) {
    return true;
  }

  return (
    error instanceof Error &&
    error.name === 'ApiError' &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  );
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

function extractServerDetail(payload: unknown): { code: string | null; message: string | null } {
  if (typeof payload === 'string' && payload.trim()) {
    return { code: null, message: payload.trim() };
  }

  if (!isRecord(payload)) {
    return { code: null, message: null };
  }

  const detail = payload.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return { code: null, message: detail.trim() };
  }

  if (isRecord(detail)) {
    return {
      code: typeof detail.code === 'string' ? detail.code : null,
      message: typeof detail.message === 'string' ? detail.message : null,
    };
  }

  return {
    code: typeof payload.code === 'string' ? payload.code : null,
    message: typeof payload.message === 'string' ? payload.message : null,
  };
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

function parsePreflightEnvelope(payload: unknown): ServiceEnvelope<CsvPreflightData> {
  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    !isRecord(payload.data) ||
    typeof payload.data.ready !== 'boolean' ||
    typeof payload.data.row_count !== 'number' ||
    typeof payload.data.column_count !== 'number' ||
    !Array.isArray(payload.data.columns) ||
    !Array.isArray(payload.data.warnings) ||
    !Array.isArray(payload.data.errors)
  ) {
    throw new ApiError(
      'The backend returned an unexpected CSV preflight response.',
      'invalid-response',
      0,
      payload,
    );
  }

  return payload as unknown as ServiceEnvelope<CsvPreflightData>;
}

function parseSubmissionEnvelope(payload: unknown): ServiceEnvelope<ValidationSubmissionData> {
  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    !isRecord(payload.data) ||
    !isRecord(payload.data.validation_run) ||
    !isRecord(payload.data.preflight) ||
    typeof payload.data.issues_written !== 'number'
  ) {
    throw new ApiError(
      'The backend returned an unexpected validation submission response.',
      'invalid-response',
      0,
      payload,
    );
  }

  return payload as unknown as ServiceEnvelope<ValidationSubmissionData>;
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
    headers.Authorization = `Bearer ${options.accessKey.trim()}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body,
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
      const serverDetail = extractServerDetail(payload);

      if (response.status === 401) {
        throw new ApiError(
          serverDetail.message || 'Your authenticated session has expired. Sign in again.',
          'access-denied',
          response.status,
          payload,
        );
      }

      if (response.status === 403) {
        throw new ApiError(
          serverDetail.message || 'Your account is not authorised for this action.',
          'access-denied',
          response.status,
          payload,
        );
      }

      if (response.status === 402) {
        throw new ApiError(
          serverDetail.message || 'An active TakwimuCheck Pro entitlement is required.',
          'access-denied',
          response.status,
          payload,
        );
      }

      if (response.status === 404) {
        throw new ApiError(
          'Protected storage routes are unavailable. Start the backend with a configured database path.',
          'storage-unavailable',
          response.status,
          payload,
        );
      }

      const mappedCode: ApiErrorCode =
        serverDetail.code === 'preflight_failed'
          ? 'preflight-failed'
          : serverDetail.code === 'metadata_unavailable' || serverDetail.code === 'metadata_invalid'
            ? 'metadata-unavailable'
            : serverDetail.code === 'validation_failed'
              ? 'validation-failed'
              : 'http';

      throw new ApiError(
        serverDetail.message
          ? `The backend returned ${response.status}: ${serverDetail.message}`
          : `The backend returned status ${response.status}.`,
        mappedCode,
        response.status,
        payload,
      );
    }

    return payload as T;
  } catch (error) {
    if (isApiError(error)) {
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

function requireAccessKey(accessKey: string): string {
  const trimmedAccessKey = accessKey.trim();
  if (!trimmedAccessKey) {
    throw new ApiError(
      'Sign in before using authenticated backend routes.',
      'missing-access-key',
    );
  }
  return trimmedAccessKey;
}

function buildCsvFormData(file: UploadableCsvFile): FormData {
  const formData = new FormData();
  formData.append('file_name', file.name);

  if (file.webFile) {
    formData.append('file', file.webFile, file.name);
  } else {
    formData.append(
      'file',
      {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'text/csv',
      } as unknown as Blob,
    );
  }

  return formData;
}

export function describeApiError(error: unknown): string {
  if (isApiError(error)) {
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
  preflightCsv: async (accessKey: string, file: UploadableCsvFile) =>
    parsePreflightEnvelope(
      await request<unknown>('/validation-runs/preflight', {
        method: 'POST',
        accessKey,
        body: buildCsvFormData(file),
        timeoutMs: 30_000,
      }),
    ),
  submitCsvValidation: async (
    accessKey: string,
    file: UploadableCsvFile,
    surveyId: string,
    actor = 'authenticated_user',
  ) => {
    const formData = buildCsvFormData(file);
    formData.append('survey_id', surveyId.trim());
    formData.append('actor', actor.trim() || 'authenticated_user');
    return parseSubmissionEnvelope(
      await request<unknown>('/validation-runs', {
        method: 'POST',
        accessKey,
        body: formData,
        timeoutMs: VALIDATION_TIMEOUT_MS,
      }),
    );
  },
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
    csvPreflightEnabled: Boolean(runtimeStatus.data.csv_preflight_enabled),
    validationSubmissionEnabled: Boolean(runtimeStatus.data.validation_submission_enabled),
    authenticationEnabled: Boolean(runtimeStatus.data.authentication_enabled),
    shortLivedAccessTokensEnabled: Boolean(
      runtimeStatus.data.short_lived_access_tokens_enabled,
    ),
    roleBasedAuthorisationEnabled: Boolean(
      runtimeStatus.data.role_based_authorisation_enabled,
    ),
    serverRevenueCatVerificationEnabled: Boolean(
      runtimeStatus.data.server_revenuecat_verification_enabled,
    ),
    accessTokenTtlSeconds:
      typeof runtimeStatus.data.access_token_ttl_seconds === 'number'
        ? runtimeStatus.data.access_token_ttl_seconds
        : null,
    refreshTokenTtlSeconds:
      typeof runtimeStatus.data.refresh_token_ttl_seconds === 'number'
        ? runtimeStatus.data.refresh_token_ttl_seconds
        : null,
    uploadMaxFileSizeBytes:
      typeof runtimeStatus.data.upload_max_file_size_bytes === 'number'
        ? runtimeStatus.data.upload_max_file_size_bytes
        : null,
    uploadMaxRecords:
      typeof runtimeStatus.data.upload_max_records === 'number'
        ? runtimeStatus.data.upload_max_records
        : null,
    checkedAt: new Date().toISOString(),
  };
}

export async function checkProtectedAccess(accessKey: string): Promise<ProtectedAccessSnapshot> {
  const trimmedAccessKey = requireAccessKey(accessKey);

  const [validationRuns, issueRegister] = await Promise.all([
    api.validationRuns(trimmedAccessKey),
    api.issueRegister(trimmedAccessKey),
  ]);

  if (validationRuns.status !== 'ok' || issueRegister.status !== 'ok') {
    throw new ApiError(
      'The authenticated backend routes returned an incomplete response.',
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

export async function preflightCsvUpload(
  accessKey: string,
  file: UploadableCsvFile,
): Promise<CsvPreflightData> {
  const response = await api.preflightCsv(requireAccessKey(accessKey), file);
  if (response.status !== 'ok') {
    throw new ApiError(
      'The CSV preflight route returned an incomplete response.',
      'invalid-response',
      0,
      response,
    );
  }
  return response.data;
}

export async function submitCsvValidation(
  accessKey: string,
  file: UploadableCsvFile,
  surveyId: string,
): Promise<ValidationSubmissionData> {
  if (!surveyId.trim()) {
    throw new ApiError('Enter a survey identifier before validation.', 'preflight-failed');
  }

  const response = await api.submitCsvValidation(
    requireAccessKey(accessKey),
    file,
    surveyId,
  );
  if (response.status !== 'ok') {
    throw new ApiError(
      'The validation submission route returned an incomplete response.',
      'invalid-response',
      0,
      response,
    );
  }
  return response.data;
}
