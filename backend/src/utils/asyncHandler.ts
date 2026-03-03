// ============================================
// Async Handler Utility
// ============================================
// Wraps async Express route handlers to automatically catch
// rejected promises and forward them to Express error-handling
// middleware. This eliminates the need for try/catch blocks
// in every async controller function.
//
// Usage:
//   router.get('/users', asyncHandler(async (req, res) => {
//     const users = await UserService.findAll();
//     res.json(users);
//   }));

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Type definition for an async request handler function.
 * Accepts standard Express request, response, and next parameters
 * and returns a Promise (or void).
 */
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void | Response>;

/**
 * Wraps an async route handler so that any thrown error or rejected
 * promise is automatically passed to `next()`, triggering the
 * Express global error handler.
 *
 * Without this wrapper, unhandled promise rejections in async handlers
 * would silently fail and leave the request hanging.
 *
 * @param fn - The async route handler function to wrap
 * @returns A standard Express RequestHandler that catches errors
 *
 * @example
 * ```ts
 * import { asyncHandler } from '../utils/asyncHandler';
 *
 * // Before (manual try/catch):
 * router.get('/employees', async (req, res, next) => {
 *   try {
 *     const employees = await employeeService.findAll();
 *     res.json(employees);
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 *
 * // After (with asyncHandler):
 * router.get('/employees', asyncHandler(async (req, res) => {
 *   const employees = await employeeService.findAll();
 *   res.json(employees);
 * }));
 * ```
 */
export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Execute the async function and catch any errors,
    // forwarding them to the Express error middleware
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
