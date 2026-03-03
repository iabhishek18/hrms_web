// ============================================
// Axios API Client
// ============================================
// Centralized HTTP client configured with:
//   - Base URL from environment variables
//   - JWT token injection via request interceptors
//   - Automatic token refresh on 401 responses
//   - Standardized error handling
//   - Request/response logging in development

import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

// ============================================
// Types
// ============================================

/** Shape of the standardized API error response from the backend */
export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
  stack?: string;
}

/** Shape of the standardized API success response from the backend */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/** Union type for any API response */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Token pair returned by auth endpoints */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ============================================
// Constants
// ============================================

// Determine the API base URL:
// 1. Use VITE_API_URL from environment if set
// 2. Fall back to relative /api path (works with Vite proxy in dev and Nginx in prod)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Local storage keys for JWT tokens
const ACCESS_TOKEN_KEY = 'hrms_access_token';
const REFRESH_TOKEN_KEY = 'hrms_refresh_token';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;

// Queue of requests that arrived while a token refresh was in progress.
// Once the refresh completes, all queued requests are retried with the new token.
let failedRequestsQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

// ============================================
// Token Management Helpers
// ============================================

/**
 * Retrieves the stored access token from localStorage.
 */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Retrieves the stored refresh token from localStorage.
 */
export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Stores both access and refresh tokens in localStorage.
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    console.error('Failed to store tokens in localStorage:', error);
  }
}

/**
 * Removes both tokens from localStorage (used on logout).
 */
export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear tokens from localStorage:', error);
  }
}

/**
 * Checks whether the user has a stored access token.
 * Does NOT verify if the token is valid or expired.
 */
export function hasAccessToken(): boolean {
  return !!getAccessToken();
}

// ============================================
// Process the failed requests queue
// ============================================

/**
 * After a successful token refresh, resolves all queued requests
 * with the new access token so they can be retried.
 */
function processQueue(error: unknown, token: string | null = null): void {
  failedRequestsQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedRequestsQueue = [];
}

// ============================================
// Create Axios Instance
// ============================================

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Send cookies with requests (needed for refresh token cookie if used)
  withCredentials: true,
});

// ============================================
// Request Interceptor
// ============================================
// Attaches the JWT access token to every outgoing request
// as a Bearer token in the Authorization header.

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Retrieve the access token from localStorage
    const accessToken = getAccessToken();

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Log outgoing requests in development for debugging
    if (import.meta.env.DEV) {
      const method = (config.method || 'GET').toUpperCase();
      const url = `${config.baseURL || ''}${config.url || ''}`;
      console.debug(`🌐 [API] ${method} ${url}`);
    }

    return config;
  },
  (error: AxiosError): Promise<never> => {
    // Request setup failed (e.g., invalid config)
    console.error('Request interceptor error:', error.message);
    return Promise.reject(error);
  },
);

// ============================================
// Response Interceptor
// ============================================
// Handles:
// 1. Successful responses — passes them through
// 2. 401 Unauthorized — attempts token refresh and retries the request
// 3. Other errors — normalizes them into a consistent format

apiClient.interceptors.response.use(
  // ---- Success Handler ----
  (response: AxiosResponse): AxiosResponse => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      const method = (response.config.method || 'GET').toUpperCase();
      const url = response.config.url || '';
      const status = response.status;
      console.debug(`✅ [API] ${method} ${url} → ${status}`);
    }

    return response;
  },

  // ---- Error Handler ----
  async (error: AxiosError<ApiErrorResponse>): Promise<AxiosResponse> => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Log errors in development
    if (import.meta.env.DEV) {
      const method = (originalRequest?.method || 'GET').toUpperCase();
      const url = originalRequest?.url || '';
      const status = error.response?.status || 'NETWORK';
      const message = error.response?.data?.message || error.message;
      console.error(`❌ [API] ${method} ${url} → ${status}: ${message}`);
    }

    // ---- Handle 401 Unauthorized (Token Expired) ----
    // If the server returns 401 and we haven't already tried refreshing,
    // attempt to get a new access token using the refresh token.
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      // Don't try to refresh if we're already on the auth endpoints
      const isAuthEndpoint =
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/refresh');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      // Mark this request as retried to prevent infinite loops
      originalRequest._retry = true;

      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedRequestsQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err: unknown) => {
              reject(err);
            },
          });
        });
      }

      // Start the refresh process
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          // No refresh token available — force logout
          throw new Error('No refresh token available');
        }

        // Call the refresh endpoint to get new tokens
        // Use a fresh axios instance to avoid interceptor loops
        const refreshResponse = await axios.post<
          ApiSuccessResponse<{
            tokens: TokenPair;
            user: { id: string; email: string; role: string };
          }>
        >(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            withCredentials: true,
          },
        );

        const { tokens } = refreshResponse.data.data;

        // Store the new tokens
        setTokens(tokens.accessToken, tokens.refreshToken);

        // Update the Authorization header for the original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }

        // Process the queue of failed requests with the new token
        processQueue(null, tokens.accessToken);

        // Retry the original request with the new token
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Token refresh failed — clear tokens and redirect to login
        processQueue(refreshError, null);
        clearTokens();

        // Dispatch a custom event that the auth store can listen to
        // This decouples the API client from the Redux store
        window.dispatchEvent(
          new CustomEvent('auth:session-expired', {
            detail: {
              message:
                'Your session has expired. Please log in again.',
            },
          }),
        );

        // Redirect to login page
        // Using window.location instead of router to work outside React context
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.includes('/login')
        ) {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ---- Handle Network Errors ----
    if (!error.response) {
      const networkError: ApiErrorResponse = {
        success: false,
        message:
          'Network error. Please check your internet connection and try again.',
        code: 'NETWORK_ERROR',
      };
      return Promise.reject({
        ...error,
        response: { data: networkError, status: 0 },
      });
    }

    // ---- Handle Timeout Errors ----
    if (error.code === 'ECONNABORTED') {
      const timeoutError: ApiErrorResponse = {
        success: false,
        message:
          'Request timed out. The server is taking too long to respond. Please try again.',
        code: 'TIMEOUT',
      };
      return Promise.reject({
        ...error,
        response: { data: timeoutError, status: 408 },
      });
    }

    // ---- Handle Rate Limiting (429) ----
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const rateLimitError: ApiErrorResponse = {
        success: false,
        message: retryAfter
          ? `Too many requests. Please try again in ${retryAfter} seconds.`
          : 'Too many requests. Please slow down and try again later.',
        code: 'RATE_LIMITED',
      };
      return Promise.reject({
        ...error,
        response: { ...error.response, data: rateLimitError },
      });
    }

    // ---- Handle Server Errors (500+) ----
    if (error.response?.status && error.response.status >= 500) {
      const serverError: ApiErrorResponse = {
        success: false,
        message:
          error.response.data?.message ||
          'An unexpected server error occurred. Please try again later.',
        code: error.response.data?.code || 'SERVER_ERROR',
      };
      return Promise.reject({
        ...error,
        response: { ...error.response, data: serverError },
      });
    }

    // ---- Pass through all other errors as-is ----
    return Promise.reject(error);
  },
);

// ============================================
// Convenience Methods
// ============================================

/**
 * Type-safe GET request helper.
 *
 * @example
 *   const response = await api.get<Employee[]>('/employees');
 *   const employees = response.data.data;
 */
export const api = {
  get: <T = unknown>(url: string, params?: Record<string, unknown>) =>
    apiClient.get<ApiSuccessResponse<T>>(url, { params }),

  post: <T = unknown>(url: string, data?: unknown) =>
    apiClient.post<ApiSuccessResponse<T>>(url, data),

  put: <T = unknown>(url: string, data?: unknown) =>
    apiClient.put<ApiSuccessResponse<T>>(url, data),

  patch: <T = unknown>(url: string, data?: unknown) =>
    apiClient.patch<ApiSuccessResponse<T>>(url, data),

  delete: <T = unknown>(url: string) =>
    apiClient.delete<ApiSuccessResponse<T>>(url),

  /**
   * Upload a file using multipart/form-data.
   * Automatically sets the correct Content-Type header.
   */
  upload: <T = unknown>(
    url: string,
    formData: FormData,
    onProgress?: (percent: number) => void,
  ) =>
    apiClient.post<ApiSuccessResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(percent);
        }
      },
    }),
};

// ============================================
// Error Extraction Helper
// ============================================

/**
 * Extracts a human-readable error message from an Axios error.
 * Falls back to a generic message if the error structure is unexpected.
 *
 * @param error - The caught error (can be AxiosError or unknown)
 * @returns A user-friendly error message string
 *
 * @example
 *   try {
 *     await api.post('/employees', data);
 *   } catch (error) {
 *     const message = getErrorMessage(error);
 *     toast.error(message);
 *   }
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    // Try to extract the message from the backend response
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }

    // Check for specific HTTP status codes
    switch (axiosError.response?.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'You are not authorized. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'A conflict occurred. The resource may already exist.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'An internal server error occurred. Please try again later.';
      case 502:
        return 'The server is temporarily unavailable. Please try again later.';
      case 503:
        return 'The service is currently undergoing maintenance.';
      default:
        break;
    }

    // Network error (no response received)
    if (axiosError.code === 'ERR_NETWORK') {
      return 'Network error. Please check your internet connection.';
    }

    // Timeout
    if (axiosError.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }

    // Fallback to the Axios error message
    return axiosError.message || 'An unexpected error occurred.';
  }

  // Handle non-Axios errors
  if (error instanceof Error) {
    return error.message;
  }

  // Absolute fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Extracts field-level validation errors from an Axios error response.
 * Returns null if no validation errors are present.
 *
 * @param error - The caught error
 * @returns An array of field-level errors, or null
 *
 * @example
 *   try {
 *     await api.post('/employees', data);
 *   } catch (error) {
 *     const fieldErrors = getValidationErrors(error);
 *     if (fieldErrors) {
 *       fieldErrors.forEach(({ field, message }) => {
 *         form.setError(field, { message });
 *       });
 *     }
 *   }
 */
export function getValidationErrors(
  error: unknown,
): Array<{ field: string; message: string }> | null {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (
      axiosError.response?.status === 422 &&
      axiosError.response?.data?.errors
    ) {
      return axiosError.response.data.errors as Array<{
        field: string;
        message: string;
      }>;
    }
  }

  return null;
}

// ============================================
// Export the configured Axios instance as default
// ============================================

export default apiClient;
