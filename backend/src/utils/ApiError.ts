// ============================================
// API Error & Response Utilities
// ============================================
// Provides standardized error handling, API response formatting,
// and an async handler wrapper to eliminate try-catch boilerplate
// in Express route handlers.

import { Request, Response, NextFunction, RequestHandler } from 'express';

// ============================================
// Custom API Error Class
// ============================================

/**
 * Custom error class for API errors.
 * Extends the built-in Error class with HTTP status codes,
 * error codes, and structured error details.
 *
 * Usage:
 *   throw new ApiError(404, 'Employee not found');
 *   throw new ApiError(422, 'Validation failed', 'VALIDATION_ERROR', errors);
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly errors: Record<string, string>[] | null;

  constructor(
    statusCode: number,
    message: string,
    code: string = 'ERROR',
    errors: Record<string, string>[] | null = null,
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.errors = errors;

    // Maintains proper stack trace for where the error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly (required for extending built-in classes in TS)
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  // ---- Factory methods for common HTTP errors ----

  /** 400 Bad Request */
  static badRequest(message: string = 'Bad request', errors?: Record<string, string>[]) {
    return new ApiError(400, message, 'BAD_REQUEST', errors ?? null);
  }

  /** 401 Unauthorized */
  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  /** 403 Forbidden */
  static forbidden(message: string = 'Forbidden - insufficient permissions') {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  /** 404 Not Found */
  static notFound(message: string = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  /** 409 Conflict (e.g., duplicate entry) */
  static conflict(message: string = 'Resource already exists') {
    return new ApiError(409, message, 'CONFLICT');
  }

  /** 422 Unprocessable Entity (validation errors) */
  static validation(message: string = 'Validation failed', errors?: Record<string, string>[]) {
    return new ApiError(422, message, 'VALIDATION_ERROR', errors ?? null);
  }

  /** 429 Too Many Requests */
  static tooManyRequests(message: string = 'Too many requests, please try again later') {
    return new ApiError(429, message, 'TOO_MANY_REQUESTS');
  }

  /** 500 Internal Server Error */
  static internal(message: string = 'Internal server error') {
    return new ApiError(500, message, 'INTERNAL_ERROR', null, false);
  }
}

// ============================================
// Standardized API Response Helper
// ============================================

/**
 * Provides a consistent JSON response format across all API endpoints.
 *
 * Success response format:
 * {
 *   success: true,
 *   message: "...",
 *   data: { ... },
 *   meta: { page, limit, total, totalPages }  // optional, for paginated responses
 * }
 *
 * Error response format:
 * {
 *   success: false,
 *   message: "...",
 *   code: "ERROR_CODE",
 *   errors: [{ field: "...", message: "..." }]  // optional, for validation errors
 * }
 */
export class ApiResponse {
  /**
   * Send a success response.
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200,
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send a success response with pagination metadata.
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    message: string = 'Success',
  ): Response {
    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return res.status(200).json({
      success: true,
      message,
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPrevPage: pagination.page > 1,
      },
    });
  }

  /**
   * Send a created (201) response.
   */
  static created<T>(res: Response, data: T, message: string = 'Created successfully'): Response {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send a no-content (204) response (e.g., after successful delete).
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send an error response from an ApiError.
   */
  static error(res: Response, error: ApiError): Response {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      ...(error.errors && { errors: error.errors }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }

  /**
   * Send a generic error response with a status code and message.
   */
  static fail(
    res: Response,
    statusCode: number,
    message: string,
    code: string = 'ERROR',
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      code,
    });
  }
}

// ============================================
// Async Handler Wrapper
// ============================================

/**
 * Wraps an async Express route handler so that any thrown errors
 * (including rejected promises) are automatically passed to the
 * Express error-handling middleware via next(error).
 *
 * This eliminates the need for try-catch blocks in every controller:
 *
 * Before:
 *   router.get('/employees', async (req, res, next) => {
 *     try {
 *       const employees = await getEmployees();
 *       res.json(employees);
 *     } catch (error) {
 *       next(error);
 *     }
 *   });
 *
 * After:
 *   router.get('/employees', asyncHandler(async (req, res) => {
 *     const employees = await getEmployees();
 *     res.json(employees);
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================
// Pagination Helper
// ============================================

/**
 * Extracts and validates pagination parameters from the request query string.
 * Returns normalized page, limit, skip, and sortBy/sortOrder values.
 *
 * Usage:
 *   const { page, limit, skip, sortBy, sortOrder } = parsePagination(req.query);
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function parsePagination(
  query: Record<string, any>,
  defaults: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    maxLimit?: number;
  } = {},
): PaginationParams {
  const {
    page: defaultPage = 1,
    limit: defaultLimit = 10,
    sortBy: defaultSortBy = 'createdAt',
    sortOrder: defaultSortOrder = 'desc',
    maxLimit = 100,
  } = defaults;

  // Parse page number (minimum 1)
  let page = parseInt(query.page as string, 10);
  if (isNaN(page) || page < 1) {
    page = defaultPage;
  }

  // Parse limit (minimum 1, capped at maxLimit)
  let limit = parseInt(query.limit as string, 10);
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  }
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  // Calculate skip offset for database query
  const skip = (page - 1) * limit;

  // Parse sort field and order
  const sortBy = (query.sortBy as string) || defaultSortBy;
  const rawOrder = (query.sortOrder as string)?.toLowerCase();
  const sortOrder: 'asc' | 'desc' = rawOrder === 'asc' || rawOrder === 'desc' ? rawOrder : defaultSortOrder;

  return { page, limit, skip, sortBy, sortOrder };
}

// ============================================
// Search / Filter Helper
// ============================================

/**
 * Builds a Prisma-compatible "where" filter for text search across
 * multiple fields using case-insensitive "contains" matching.
 *
 * Usage:
 *   const searchFilter = buildSearchFilter(req.query.search, ['firstName', 'lastName', 'email']);
 *   const employees = await prisma.employee.findMany({ where: { ...searchFilter } });
 */
export function buildSearchFilter(
  searchTerm: string | undefined | null,
  fields: string[],
): Record<string, any> {
  if (!searchTerm || searchTerm.trim() === '') {
    return {};
  }

  const trimmed = searchTerm.trim();

  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: trimmed,
        mode: 'insensitive',
      },
    })),
  };
}

export default ApiError;
