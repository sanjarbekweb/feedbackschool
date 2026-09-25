import {
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
} from '@psychology/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function requestEnvelope<T, TMeta = never>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T, TMeta>> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Includes HTTP-only session cookies
  });

  const data: ApiResponse<T, TMeta> = await response.json().catch(() => ({
    success: false,
    error: {
      code: 'PARSE_ERROR',
      message: 'Server javobini o‘qib bo‘lmadi.',
    },
  }));

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || `So‘rov bajarilmadi (${response.status}).`,
      data.error?.details,
      response.status,
    );
  }

  return data;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await requestEnvelope<T>(endpoint, options);
  return response.data as T;
}

export async function paginatedApiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<PaginatedResponse<T>> {
  const response = await requestEnvelope<T[], PaginationMeta>(endpoint, options);

  if (!Array.isArray(response.data) || !response.meta) {
    throw new ApiError(
      'INVALID_PAGINATION_RESPONSE',
      'Ro‘yxatni yuklab bo‘lmadi.',
    );
  }

  return {
    data: response.data,
    meta: response.meta,
  };
}
