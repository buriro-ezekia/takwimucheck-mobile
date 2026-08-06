// Provides typed clients for filtered validation results and short-lived report links.

import {
  ApiError,
  getApiConfiguration,
  type ProtectedIssueRecord,
  type ServiceEnvelope,
  type ValidationRunRecord,
} from '@/services/api';

const RESULTS_TIMEOUT_MS = 15_000;

export interface IssueSummary {
  total: number;
  open: number;
  errors: number;
  warnings: number;
  variables_affected: number;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  by_issue_type: Record<string, number>;
}

export interface ReportArtifact {
  artifact_key: string;
  label: string;
  file_name: string;
  media_type: string;
  size_bytes: number;
}

export interface ValidationRunDetailData {
  validation_run: ValidationRunRecord;
  issue_summary: IssueSummary;
  reports: ReportArtifact[];
}

export interface IssueFacets {
  severity: string[];
  status: string[];
  issue_type: string[];
  variable_name: string[];
}

export interface FilteredIssueData {
  count: number;
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
  issues: ProtectedIssueRecord[];
  summary: IssueSummary;
  facets: IssueFacets;
  filters: {
    validation_run_id: string;
    severity: string;
    status: string;
    issue_type: string;
    variable_name: string;
    q: string;
  };
}

export interface ResultFilters {
  severity?: string;
  status?: string;
  issueType?: string;
  variableName?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

export interface ReportLinkData {
  validation_run_id: string;
  artifact_key: string;
  download_path: string;
  expires_at: number;
  expires_in_seconds: number;
  label: string;
  file_name: string;
  media_type: string;
  size_bytes: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireBaseUrl(): string {
  const configuration = getApiConfiguration();
  if (!configuration.baseUrl) {
    throw new ApiError(
      'The backend URL is not configured. Add EXPO_PUBLIC_API_BASE_URL to .env.local.',
      'not-configured',
    );
  }
  return configuration.baseUrl;
}

function requireAccessKey(accessKey: string): string {
  const trimmed = accessKey.trim();
  if (!trimmed) {
    throw new ApiError(
      'Enter the protected-route access key for this app session.',
      'missing-access-key',
    );
  }
  return trimmed;
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) return payload.trim();
  if (!isRecord(payload)) return null;

  const detail = payload.detail;
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (isRecord(detail) && typeof detail.message === 'string' && detail.message.trim()) {
    return detail.message.trim();
  }
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim();
  }
  return null;
}

async function requestResult<T>(path: string, accessKey: string): Promise<T> {
  const baseUrl = requireBaseUrl();
  const key = requireAccessKey(accessKey);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RESULTS_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        Accept: 'application/json',
        'x-api-key': key,
      },
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
          payload,
        );
      }

      if (response.status === 404) {
        throw new ApiError(
          extractErrorMessage(payload) ?? 'The requested validation result was not found.',
          'storage-unavailable',
          response.status,
          payload,
        );
      }

      throw new ApiError(
        extractErrorMessage(payload) ?? `The backend returned status ${response.status}.`,
        'http',
        response.status,
        payload,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError || (error instanceof Error && error.name === 'ApiError')) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The results service did not respond within 15 seconds.', 'timeout');
    }
    throw new ApiError(
      'The validation results service could not be reached.',
      'network',
      0,
      error,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseDetailEnvelope(payload: unknown): ServiceEnvelope<ValidationRunDetailData> {
  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    !isRecord(payload.data) ||
    !isRecord(payload.data.validation_run) ||
    !isRecord(payload.data.issue_summary) ||
    !Array.isArray(payload.data.reports)
  ) {
    throw new ApiError(
      'The backend returned an unexpected validation-result response.',
      'invalid-response',
      0,
      payload,
    );
  }
  return payload as unknown as ServiceEnvelope<ValidationRunDetailData>;
}

function parseIssuesEnvelope(payload: unknown): ServiceEnvelope<FilteredIssueData> {
  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    !isRecord(payload.data) ||
    typeof payload.data.count !== 'number' ||
    typeof payload.data.total !== 'number' ||
    typeof payload.data.has_more !== 'boolean' ||
    !Array.isArray(payload.data.issues) ||
    !isRecord(payload.data.summary) ||
    !isRecord(payload.data.facets)
  ) {
    throw new ApiError(
      'The backend returned an unexpected filtered-issues response.',
      'invalid-response',
      0,
      payload,
    );
  }
  return payload as unknown as ServiceEnvelope<FilteredIssueData>;
}

function parseReportLinkEnvelope(payload: unknown): ServiceEnvelope<ReportLinkData> {
  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    !isRecord(payload.data) ||
    typeof payload.data.download_path !== 'string' ||
    typeof payload.data.expires_at !== 'number' ||
    typeof payload.data.file_name !== 'string'
  ) {
    throw new ApiError(
      'The backend returned an unexpected report-link response.',
      'invalid-response',
      0,
      payload,
    );
  }
  return payload as unknown as ServiceEnvelope<ReportLinkData>;
}

function encodeQuery(filters: ResultFilters): string {
  const entries: Array<[string, string]> = [];
  if (filters.severity) entries.push(['severity', filters.severity]);
  if (filters.status) entries.push(['status', filters.status]);
  if (filters.issueType) entries.push(['issue_type', filters.issueType]);
  if (filters.variableName) entries.push(['variable_name', filters.variableName]);
  if (filters.query) entries.push(['q', filters.query]);
  entries.push(['limit', String(filters.limit ?? 25)]);
  entries.push(['offset', String(filters.offset ?? 0)]);
  return entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
}

export async function getValidationRunDetail(
  accessKey: string,
  validationRunId: string,
): Promise<ValidationRunDetailData> {
  const runId = encodeURIComponent(validationRunId.trim());
  const envelope = parseDetailEnvelope(
    await requestResult<unknown>(`/validation-results/runs/${runId}`, accessKey),
  );
  return envelope.data;
}

export async function getFilteredValidationIssues(
  accessKey: string,
  validationRunId: string,
  filters: ResultFilters = {},
): Promise<FilteredIssueData> {
  const query = [
    `validation_run_id=${encodeURIComponent(validationRunId.trim())}`,
    encodeQuery(filters),
  ].join('&');
  const envelope = parseIssuesEnvelope(
    await requestResult<unknown>(`/validation-results/issues?${query}`, accessKey),
  );
  return envelope.data;
}

export async function getValidationReportLink(
  accessKey: string,
  validationRunId: string,
  artifactKey: string,
): Promise<ReportLinkData> {
  const runId = encodeURIComponent(validationRunId.trim());
  const artifact = encodeURIComponent(artifactKey.trim());
  const envelope = parseReportLinkEnvelope(
    await requestResult<unknown>(
      `/validation-results/runs/${runId}/reports/${artifact}/link`,
      accessKey,
    ),
  );
  return envelope.data;
}

export function buildReportDownloadUrl(downloadPath: string): string {
  const baseUrl = requireBaseUrl();
  return `${baseUrl}${downloadPath.startsWith('/') ? downloadPath : `/${downloadPath}`}`;
}
