// Provides typed clients for persistent issue review, history and signed audit export.

import {
  ApiError,
  getApiConfiguration,
  type ServiceEnvelope,
} from '@/services/api';

const REVIEW_TIMEOUT_MS = 15_000;

export type ReviewAction =
  | 'accept_finding'
  | 'defer_finding'
  | 'reject_finding'
  | 'propose_correction';

export interface ReviewDecisionRequest {
  client_decision_id: string;
  issue_id: string;
  validation_run_id: string;
  action: ReviewAction;
  reviewer: string;
  decision_reason: string;
  proposed_value?: string;
  expected_previous_status?: string;
}

export interface ReviewDecisionRecord {
  decision_id: string;
  client_decision_id?: string;
  issue_id: string;
  validation_run_id: string;
  survey_id?: string;
  action: ReviewAction;
  review_status: string;
  decision_reason: string;
  reviewer: string;
  proposed_value?: string;
  previous_status: string;
  created_at: string;
}

export interface ReviewSubmissionData {
  count: number;
  created_count: number;
  idempotent_count: number;
  decisions: ReviewDecisionRecord[];
}

export interface ReviewHistorySummary {
  total: number;
  issues_reviewed: number;
  reviewers: number;
  by_action: Record<string, number>;
  by_status: Record<string, number>;
}

export interface ReviewHistoryData {
  count: number;
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
  decisions: ReviewDecisionRecord[];
  summary: ReviewHistorySummary;
  facets: {
    action: string[];
    review_status: string[];
    reviewer: string[];
  };
  filters: {
    validation_run_id: string;
    issue_id: string;
    action: string;
    review_status: string;
    reviewer: string;
  };
}

export interface ReviewAuditExportLinkData {
  validation_run_id: string;
  download_path: string;
  expires_at: number;
  expires_in_seconds: number;
  file_name: string;
  media_type: string;
  decision_count: number;
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

async function requestReview<T>(
  path: string,
  accessKey: string,
  options: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T> {
  const baseUrl = requireBaseUrl();
  const key = requireAccessKey(accessKey);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REVIEW_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': key,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
      const message = extractErrorMessage(payload);
      if (response.status === 403) {
        throw new ApiError(
          message ?? 'Protected backend access was denied. Check the session access key.',
          'access-denied',
          response.status,
          payload,
        );
      }
      if (response.status === 404) {
        throw new ApiError(
          message ?? 'The issue or validation run was not found.',
          'storage-unavailable',
          response.status,
          payload,
        );
      }
      throw new ApiError(
        message ?? `The backend returned status ${response.status}.`,
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
      throw new ApiError('The review service did not respond within 15 seconds.', 'timeout');
    }
    throw new ApiError('The live review service could not be reached.', 'network', 0, error);
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseSubmissionEnvelope(payload: unknown): ServiceEnvelope<ReviewSubmissionData> {
  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    !isRecord(payload.data) ||
    typeof payload.data.count !== 'number' ||
    typeof payload.data.created_count !== 'number' ||
    !Array.isArray(payload.data.decisions)
  ) {
    throw new ApiError(
      'The backend returned an unexpected review-submission response.',
      'invalid-response',
      0,
      payload,
    );
  }
  return payload as unknown as ServiceEnvelope<ReviewSubmissionData>;
}

function parseHistoryEnvelope(payload: unknown): ServiceEnvelope<ReviewHistoryData> {
  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    !isRecord(payload.data) ||
    typeof payload.data.total !== 'number' ||
    !Array.isArray(payload.data.decisions) ||
    !isRecord(payload.data.summary)
  ) {
    throw new ApiError(
      'The backend returned an unexpected review-history response.',
      'invalid-response',
      0,
      payload,
    );
  }
  return payload as unknown as ServiceEnvelope<ReviewHistoryData>;
}

function parseExportLinkEnvelope(payload: unknown): ServiceEnvelope<ReviewAuditExportLinkData> {
  if (
    !isRecord(payload) ||
    typeof payload.status !== 'string' ||
    !isRecord(payload.data) ||
    typeof payload.data.download_path !== 'string' ||
    typeof payload.data.expires_at !== 'number' ||
    typeof payload.data.file_name !== 'string'
  ) {
    throw new ApiError(
      'The backend returned an unexpected review-export response.',
      'invalid-response',
      0,
      payload,
    );
  }
  return payload as unknown as ServiceEnvelope<ReviewAuditExportLinkData>;
}

export async function submitReviewDecision(
  accessKey: string,
  decision: ReviewDecisionRequest,
): Promise<ReviewSubmissionData> {
  const envelope = parseSubmissionEnvelope(
    await requestReview<unknown>('/review-decisions', accessKey, {
      method: 'POST',
      body: [decision],
    }),
  );
  return envelope.data;
}

export async function getReviewHistory(
  accessKey: string,
  validationRunId: string,
  options: { issueId?: string; limit?: number; offset?: number } = {},
): Promise<ReviewHistoryData> {
  const query: Array<[string, string]> = [
    ['validation_run_id', validationRunId.trim()],
    ['limit', String(options.limit ?? 100)],
    ['offset', String(options.offset ?? 0)],
  ];
  if (options.issueId?.trim()) query.push(['issue_id', options.issueId.trim()]);
  const encoded = query
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  const envelope = parseHistoryEnvelope(
    await requestReview<unknown>(`/review-decisions?${encoded}`, accessKey),
  );
  return envelope.data;
}

export async function getReviewAuditExportLink(
  accessKey: string,
  validationRunId: string,
): Promise<ReviewAuditExportLinkData> {
  const runId = encodeURIComponent(validationRunId.trim());
  const envelope = parseExportLinkEnvelope(
    await requestReview<unknown>(
      `/review-decisions/export/link?validation_run_id=${runId}`,
      accessKey,
    ),
  );
  return envelope.data;
}

export function buildReviewAuditDownloadUrl(downloadPath: string): string {
  const baseUrl = requireBaseUrl();
  return `${baseUrl}${downloadPath.startsWith('/') ? downloadPath : `/${downloadPath}`}`;
}
