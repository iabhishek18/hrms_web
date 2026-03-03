// ============================================
// API Response Helper
// ============================================
// Standardized response format for all API endpoints.
// Ensures consistent JSON structure across the application.
//
// Success Response: { success: true, message, data, meta? }
// Error Response:   { success: false, message, errors?, stack? }

/**
 * Pagination metadata included in list responses.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Standard shape for all successful API responses.
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

/**
 * Standard shape for all error API responses.
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]> | string[];
  stack?: string;
}

/**
 * Union type representing any API response.
 */
export type ApiResponseType<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * ApiResponse — static helper class for building standardized JSON responses.
 *
 * @example
 *   // In a controller:
 *   res.status(200).json(ApiResponse.success('Employees fetched', employees));
 *   res.status(404).json(ApiResponse.error('Employee not found'));
 *   res.status(200).json(ApiResponse.paginated('Employees fetched', employees, meta));
 */
export class ApiResponse {
  /**
   * Build a successful response payload.
   *
   * @param message - Human-readable success message
   * @param data    - The response payload (object, array, etc.)
   * @param meta    - Optional pagination metadata
   */
  static success<T = unknown>(
    message: string,
    data: T,
    meta?: PaginationMeta,
  ): ApiSuccessResponse<T> {
    const response: ApiSuccessResponse<T> = {
      success: true,
      message,
      data,
    };

    if (meta) {
      response.meta = meta;
    }

    return response;
  }

  /**
   * Build an error response payload.
   *
   * @param message - Human-readable error message
   * @param errors  - Optional field-level validation errors or error list
   * @param stack   - Optional stack trace (only included in development)
   */
  static error(
    message: string,
    errors?: Record<string, string[]> | string[],
    stack?: string,
  ): ApiErrorResponse {
    const response: ApiErrorResponse = {
      success: false,
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    // Only include stack traces in non-production environments
    if (stack && process.env.NODE_ENV !== 'production') {
      response.stack = stack;
    }

    return response;
  }

  /**
   * Build a paginated success response.
   * Convenience wrapper around `success()` that computes pagination metadata.
   *
   * @param message - Human-readable success message
   * @param data    - Array of items for the current page
   * @param total   - Total number of items across all pages
   * @param page    - Current page number (1-based)
   * @param limit   - Number of items per page
   */
  static paginated<T = unknown>(
    message: string,
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): ApiSuccessResponse<T[]> {
    const totalPages = Math.ceil(total / limit);

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return ApiResponse.success<T[]>(message, data, meta);
  }

  /**
   * Build a success response with no data (e.g., for DELETE operations).
   *
   * @param message - Human-readable success message
   */
  static noContent(message: string = 'Operation completed successfully'): ApiSuccessResponse<null> {
    return ApiResponse.success<null>(message, null);
  }

  /**
   * Build a created response (typically for POST operations).
   *
   * @param message - Human-readable success message
   * @param data    - The newly created resource
   */
  static created<T = unknown>(
    message: string = 'Resource created successfully',
    data: T,
  ): ApiSuccessResponse<T> {
    return ApiResponse.success<T>(message, data);
  }
}

export default ApiResponse;
