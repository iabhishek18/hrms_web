// ============================================
// Global Error Handling Middleware
// ============================================
// Catches all errors thrown in route handlers and middlewares,
// normalizes them into a consistent JSON response format,
// and logs the error details for debugging.
//
// This middleware MUST be registered LAST in the Express
// middleware chain (after all routes) to catch errors from
// every handler.

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from 'jsonwebtoken';

import { ApiError } from '../utils/ApiError';

// ============================================
// Types
// ============================================

interface ErrorResponseBody {
  success: false;
  message: string;
  code: string;
  errors?: Record<string, string>[] | { field: string; message: string }[];
  stack?: string;
}

// ============================================
// Error Normalizers
// ============================================

/**
 * Converts a ZodError (validation library) into an ApiError
 * with structured field-level error details.
 */
function handleZodError(err: ZodError): ApiError {
  const errors = err.errors.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return new ApiError(
    422,
    'Validation failed. Please check your input.',
    'VALIDATION_ERROR',
    errors as Record<string, string>[],
  );
}

/**
 * Converts Prisma-specific errors into user-friendly ApiErrors.
 * Prisma throws typed errors for constraint violations, record-not-found, etc.
 */
function handlePrismaError(
  err: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
): ApiError {
  // Known request errors have an error code (e.g., P2002, P2025)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      // Unique constraint violation
      case 'P2002': {
        const target = (err.meta?.target as string[]) || ['field'];
        const fields = Array.isArray(target) ? target.join(', ') : String(target);
        return new ApiError(
          409,
          `A record with this ${fields} already exists.`,
          'DUPLICATE_ENTRY',
        );
      }

      // Record not found (for update/delete operations)
      case 'P2025': {
        const modelName = (err.meta?.modelName as string) || 'Record';
        return new ApiError(
          404,
          `${modelName} not found.`,
          'NOT_FOUND',
        );
      }

      // Foreign key constraint violation
      case 'P2003': {
        const fieldName = (err.meta?.field_name as string) || 'relation';
        return new ApiError(
          400,
          `Invalid reference: the related ${fieldName} does not exist.`,
          'FOREIGN_KEY_ERROR',
        );
      }

      // Required field missing
      case 'P2011': {
        const constraint = (err.meta?.constraint as string) || 'field';
        return new ApiError(
          400,
          `Required field is missing: ${constraint}.`,
          'MISSING_FIELD',
        );
      }

      // Value too long for column type
      case 'P2000': {
        return new ApiError(
          400,
          'The provided value is too long for the database column.',
          'VALUE_TOO_LONG',
        );
      }

      // Invalid value for field type
      case 'P2006': {
        return new ApiError(
          400,
          'Invalid value provided for one of the fields.',
          'INVALID_VALUE',
        );
      }

      // Inconsistent column data
      case 'P2023': {
        return new ApiError(
          400,
          'Inconsistent data: the provided ID format is invalid.',
          'INVALID_ID_FORMAT',
        );
      }

      default:
        return new ApiError(
          500,
          `Database error (${err.code}). Please try again later.`,
          'DATABASE_ERROR',
          null,
          false,
        );
    }
  }

  // Prisma validation errors (e.g., wrong field types in queries)
  if (err instanceof Prisma.PrismaClientValidationError) {
    return new ApiError(
      400,
      'Invalid query parameters. Please check your request data.',
      'QUERY_VALIDATION_ERROR',
    );
  }

  return ApiError.internal('An unexpected database error occurred.');
}

/**
 * Converts JWT-related errors into user-friendly ApiErrors.
 */
function handleJwtError(
  err: JsonWebTokenError | TokenExpiredError | NotBeforeError,
): ApiError {
  if (err instanceof TokenExpiredError) {
    return new ApiError(
      401,
      'Your session has expired. Please log in again.',
      'TOKEN_EXPIRED',
    );
  }

  if (err instanceof NotBeforeError) {
    return new ApiError(
      401,
      'Token is not yet valid. Please try again later.',
      'TOKEN_NOT_ACTIVE',
    );
  }

  // Generic JWT error (invalid signature, malformed token, etc.)
  return new ApiError(
    401,
    'Invalid authentication token. Please log in again.',
    'INVALID_TOKEN',
  );
}

/**
 * Handles SyntaxError from malformed JSON in request body.
 * Express's built-in JSON parser throws this when the body is not valid JSON.
 */
function handleSyntaxError(err: SyntaxError & { status?: number }): ApiError {
  return new ApiError(
    400,
    'Malformed JSON in request body. Please check your request format.',
    'INVALID_JSON',
  );
}

/**
 * Handles PayloadTooLargeError from Express body-parser
 * when the request body exceeds the configured size limit.
 */
function handlePayloadTooLarge(): ApiError {
  return new ApiError(
    413,
    'Request payload is too large. Please reduce the size of your request.',
    'PAYLOAD_TOO_LARGE',
  );
}

// ============================================
// Main Error Handler Middleware
// ============================================

/**
 * Global error handling middleware for Express.
 *
 * This function:
 * 1. Identifies the error type (ApiError, ZodError, Prisma, JWT, etc.)
 * 2. Normalizes it into an ApiError with proper status code and message
 * 3. Logs the error (with stack trace in development)
 * 4. Sends a standardized JSON error response to the client
 *
 * IMPORTANT: This middleware must have 4 parameters (err, req, res, next)
 * for Express to recognize it as an error handler.
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ------------------------------------------
  // Step 1: Normalize the error into an ApiError
  // ------------------------------------------
  let apiError: ApiError;

  if (err instanceof ApiError) {
    // Already an ApiError — use as-is
    apiError = err;
  } else if (err instanceof ZodError) {
    // Zod validation error
    apiError = handleZodError(err);
  } else if (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError
  ) {
    // Prisma database error
    apiError = handlePrismaError(err);
  } else if (
    err instanceof JsonWebTokenError ||
    err instanceof TokenExpiredError ||
    err instanceof NotBeforeError
  ) {
    // JWT authentication error
    apiError = handleJwtError(err);
  } else if (err instanceof SyntaxError && 'body' in err) {
    // Malformed JSON in request body
    apiError = handleSyntaxError(err);
  } else if (err.name === 'PayloadTooLargeError' || (err as any).type === 'entity.too.large') {
    // Request body too large
    apiError = handlePayloadTooLarge();
  } else if (err.name === 'MulterError') {
    // File upload error from Multer
    apiError = new ApiError(
      400,
      `File upload error: ${err.message}`,
      'FILE_UPLOAD_ERROR',
    );
  } else {
    // Unknown / unexpected error — treat as 500
    apiError = new ApiError(
      500,
      'An unexpected error occurred. Please try again later.',
      'INTERNAL_ERROR',
      null,
      false, // Not operational — this is a programming bug
    );
  }

  // ------------------------------------------
  // Step 2: Log the error
  // ------------------------------------------
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logPrefix = `[ERROR ${apiError.statusCode}]`;
  const logDetails = {
    method: req.method,
    url: req.originalUrl,
    code: apiError.code,
    message: apiError.message,
    ip: req.ip,
    userId: (req as any).user?.userId || 'anonymous',
  };

  if (apiError.statusCode >= 500) {
    // Server errors — always log with full stack
    console.error(logPrefix, logDetails);
    console.error(err.stack || err);
  } else if (isDevelopment) {
    // Client errors — only log in development
    console.warn(logPrefix, logDetails);
    if (apiError.statusCode !== 404) {
      console.warn(err.stack || err);
    }
  }

  // ------------------------------------------
  // Step 3: Build and send the response
  // ------------------------------------------
  const responseBody: ErrorResponseBody = {
    success: false,
    message: apiError.message,
    code: apiError.code,
  };

  // Include field-level errors for validation failures
  if (apiError.errors) {
    responseBody.errors = apiError.errors;
  }

  // Include stack trace only in development (never in production)
  if (isDevelopment && err.stack) {
    responseBody.stack = err.stack;
  }

  res.status(apiError.statusCode).json(responseBody);
}

// ============================================
// 404 Not Found Handler
// ============================================

/**
 * Catches requests to undefined routes and returns a 404 response.
 * Register this AFTER all valid routes but BEFORE the error handler.
 *
 * Usage:
 *   app.use(notFoundHandler);
 *   app.use(globalErrorHandler);
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const error = new ApiError(
    404,
    `Route not found: ${req.method} ${req.originalUrl}`,
    'ROUTE_NOT_FOUND',
  );
  next(error);
}

// ============================================
// Unhandled Rejection & Uncaught Exception Handlers
// ============================================

/**
 * Registers process-level error handlers to catch unhandled promise
 * rejections and uncaught exceptions. These should be called once
 * during server startup.
 *
 * In production, these handlers log the error and gracefully shut
 * down the server to prevent running in an undefined state.
 *
 * Usage:
 *   import { registerProcessErrorHandlers } from './middlewares/errorHandler';
 *   registerProcessErrorHandlers(server);
 */
export function registerProcessErrorHandlers(
  server?: { close: (callback: () => void) => void },
): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('🚨 UNHANDLED PROMISE REJECTION:');
    console.error(reason);

    if (process.env.NODE_ENV === 'production' && server) {
      console.error('Shutting down server due to unhandled rejection...');
      server.close(() => {
        process.exit(1);
      });
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('🚨 UNCAUGHT EXCEPTION:');
    console.error(error);

    if (process.env.NODE_ENV === 'production') {
      console.error('Shutting down server due to uncaught exception...');
      if (server) {
        server.close(() => {
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    }
  });

  // Graceful shutdown on SIGTERM (e.g., Docker stop, Kubernetes pod termination)
  process.on('SIGTERM', () => {
    console.info('📡 SIGTERM received. Performing graceful shutdown...');
    if (server) {
      server.close(() => {
        console.info('Server closed. Process terminating.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  // Graceful shutdown on SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    console.info('\n📡 SIGINT received. Performing graceful shutdown...');
    if (server) {
      server.close(() => {
        console.info('Server closed. Process terminating.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}

export default globalErrorHandler;
