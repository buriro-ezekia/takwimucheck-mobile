// Provides the typed HTTP foundation for the future TakwimuCheck backend integration.

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : null;

export interface ApiConfiguration {
  configured: boolean;
  baseUrl: string | null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      'The backend URL is not configured. Add EXPO_PUBLIC_API_BASE_URL to your local .env file.',
      0,
    );
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
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
    throw new ApiError(`API request failed with status ${response.status}.`, response.status, payload);
  }

  return payload as T;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  listProjects: () => request<unknown[]>('/v1/projects'),
  getProject: (projectId: string) => request<unknown>(`/v1/projects/${projectId}`),
  createValidationRun: (projectId: string) =>
    request<unknown>(`/v1/projects/${projectId}/validation-runs`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  listIssues: (projectId: string) =>
    request<unknown[]>(`/v1/projects/${projectId}/issues`),
};
