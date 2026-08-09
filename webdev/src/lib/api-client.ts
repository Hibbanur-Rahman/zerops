import { API_URL } from './config';

export class ApiError extends Error {
  status: number;
  errorCode?: string;
  details?: unknown;

  constructor(message: string, status: number, errorCode?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

interface ApiFailure {
  success: false;
  message: string;
  errorCode: string;
  details?: unknown;
}

async function requestEnvelope<T>(path: string, options: RequestInit = {}): Promise<ApiSuccess<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const failure = body as ApiFailure | undefined;
    throw new ApiError(
      failure?.message ?? `Request failed with status ${res.status}`,
      res.status,
      failure?.errorCode,
      failure?.details,
    );
  }

  return body as ApiSuccess<T>;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return (await requestEnvelope<T>(path, options)).data;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

async function requestPaginated<T>(path: string): Promise<PaginatedResult<T>> {
  const envelope = await requestEnvelope<T[]>(path, { method: 'GET' });
  const pagination = (envelope.meta?.pagination as PaginatedResult<T>['pagination']) ?? {
    total: envelope.data.length,
    page: 1,
    limit: envelope.data.length,
    totalPages: 1,
  };
  return { data: envelope.data, pagination };
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  getPaginated: <T>(path: string) => requestPaginated<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
