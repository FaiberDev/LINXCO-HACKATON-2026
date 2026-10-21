export class ApiError extends Error {
  status: number;
  data: unknown;
  isNetworkError: boolean;

  constructor(message: string, status = 0, data: unknown = null, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

export const API_BASE_URL = '/api';
export const DEFAULT_TIMEOUT_MS = 10000;

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const mergedHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: mergedHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    let data: unknown = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { raw: text } : null;
    }

    if (!response.ok) {
      const errorMessage =
        (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string')
          ? (data as { error: string }).error
          : `HTTP error ${response.status}: ${response.statusText}`;

      throw new ApiError(errorMessage, response.status, data, false);
    }

    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    const isAbort = (error as Error)?.name === 'AbortError';
    const message = isAbort
      ? `Solicitud cancelada por tiempo de espera (${timeoutMs}ms)`
      : (error as Error)?.message || 'Error de conexión con el servidor';

    throw new ApiError(message, 0, null, true);
  }
}
