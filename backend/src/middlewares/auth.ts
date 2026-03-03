// ============================================
// Authentication & Authorization Middleware
// ============================================
// Provides middleware functions for:
// 1. JWT token verification (authenticate)
// 2. Role-based access control (authorize)
// 3. Optional authentication (optionalAuth)
//
// These middleware functions are applied to routes
// that require authentication or specific role permissions.

import { Request, Response, NextFunction } from 'express';

import { ApiError } from '../utils/ApiError';
import { verifyAccessToken, extractBearerToken, DecodedToken } from '../utils/jwt';
import prisma from '../config/database';

// ============================================
// Extend Express Request type to include user info
// ============================================

/**
 * Authenticated user information attached to the request
 * after successful JWT verification.
 */
export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  employeeId?: string;
}

// Augment the Express Request interface globally
declare global {
  namespace Express {
    interface Request {
      /** The authenticated user, populated by the `authenticate` middleware */
      user?: AuthUser;
    }
  }
}

// ============================================
// Authentication Middleware
// ============================================

/**
 * Middleware that verifies the JWT access token from the Authorization header.
 *
 * It extracts the Bearer token, verifies its signature and expiry,
 * then checks if the associated user exists and is active in the database.
 * On success, it attaches the user info to `req.user`.
 *
 * Usage:
 *   router.get('/protected', authenticate, (req, res) => {
 *     console.log(req.user); // { userId, email, role, employeeId? }
 *   });
 *
 * @throws ApiError 401 if token is missing, invalid, expired, or user is inactive
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Extract the Bearer token from the Authorization header
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw ApiError.unauthorized(
        'Authentication required. Please provide a valid Bearer token in the Authorization header.',
      );
    }

    // 2. Verify the token's signature and expiration
    let decoded: DecodedToken;
    try {
      decoded = verifyAccessToken(token);
    } catch (err: any) {
      // Provide specific messages for common JWT errors
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Your session has expired. Please log in again.');
      }
      if (err.name === 'JsonWebTokenError') {
        throw ApiError.unauthorized('Invalid authentication token. Please log in again.');
      }
      if (err.name === 'NotBeforeError') {
        throw ApiError.unauthorized('Token is not yet active. Please try again later.');
      }
      throw ApiError.unauthorized('Authentication failed. Please log in again.');
    }

    // 3. Verify the user still exists and is active in the database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        employee: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.unauthorized('User account not found. It may have been deleted.');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized(
        'Your account has been deactivated. Please contact an administrator.',
      );
    }

    // 4. Attach the verified user information to the request object
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
    };

    next();
  } catch (error) {
    next(error);
  }
}

// ============================================
// Optional Authentication Middleware
// ============================================

/**
 * Similar to `authenticate`, but does NOT throw an error if no token
 * is provided. If a valid token IS present, `req.user` will be populated.
 * If not, the request proceeds without authentication.
 *
 * Useful for endpoints that behave differently for authenticated vs.
 * unauthenticated users (e.g., public pages that show extra info when logged in).
 *
 * Usage:
 *   router.get('/public-page', optionalAuth, (req, res) => {
 *     if (req.user) { // authenticated
 *     } else { // anonymous
 *     }
 *   });
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    // No token provided — proceed without authentication
    if (!token) {
      return next();
    }

    // Try to verify the token; if it fails, just proceed unauthenticated
    try {
      const decoded = verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          employee: {
            select: {
              id: true,
            },
          },
        },
      });

      if (user && user.isActive) {
        req.user = {
          userId: user.id,
          email: user.email,
          role: user.role,
          employeeId: user.employee?.id,
        };
      }
    } catch {
      // Token is invalid or expired — proceed as unauthenticated
    }

    next();
  } catch (error) {
    next(error);
  }
}

// ============================================
// Role-Based Authorization Middleware
// ============================================

/**
 * Factory function that returns a middleware restricting access
 * to users with one of the specified roles.
 *
 * Must be used AFTER the `authenticate` middleware so that
 * `req.user` is already populated.
 *
 * Usage:
 *   // Only admins can access this route:
 *   router.delete('/users/:id', authenticate, authorize('ADMIN'), deleteUser);
 *
 *   // Admins and HR can access this route:
 *   router.post('/employees', authenticate, authorize('ADMIN', 'HR'), createEmployee);
 *
 * @param allowedRoles - One or more role strings that are permitted access
 * @returns Express middleware function
 * @throws ApiError 401 if not authenticated, 403 if role is not permitted
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Ensure the user is authenticated first
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication is required to access this resource.'));
    }

    // Check if the user's role is in the allowed list
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return next(
        ApiError.forbidden(
          `Access denied. This action requires one of the following roles: ${allowedRoles.join(', ')}. Your role: ${userRole}.`,
        ),
      );
    }

    // Role is authorized — proceed to the next middleware/handler
    next();
  };
}

// ============================================
// Self-or-Admin Authorization Middleware
// ============================================

/**
 * Middleware that allows a user to access a resource if they are:
 * 1. An Admin or HR (can access any resource), OR
 * 2. The owner of the resource (their own data)
 *
 * This is useful for profile-related routes where employees
 * can view/edit their own data, but admins/HR can access anyone's.
 *
 * The resource owner is determined by comparing `req.params.id`
 * (or a custom param) to the authenticated user's ID or employee ID.
 *
 * Usage:
 *   router.get('/employees/:id', authenticate, selfOrAdmin('id'), getEmployee);
 *
 * @param paramName - The route parameter name containing the resource owner's ID (default: 'id')
 * @param privilegedRoles - Roles that can access any resource (default: ['ADMIN', 'HR'])
 * @returns Express middleware function
 */
export function selfOrAdmin(paramName: string = 'id', privilegedRoles: string[] = ['ADMIN', 'HR']) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Must be authenticated
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication is required to access this resource.'));
    }

    const resourceId = req.params[paramName];
    const { userId, employeeId, role } = req.user;

    // Privileged roles (Admin, HR) can access any resource
    if (privilegedRoles.includes(role)) {
      return next();
    }

    // Check if the authenticated user is the resource owner
    // Compare against both userId and employeeId for flexibility
    if (resourceId === userId || resourceId === employeeId) {
      return next();
    }

    // Not the owner and not a privileged role
    return next(
      ApiError.forbidden(
        'You can only access your own data. Contact an administrator for broader access.',
      ),
    );
  };
}

// ============================================
// Convenience Middleware Combos
// ============================================

/** Restrict to Admin role only */
export const adminOnly = authorize('ADMIN');

/** Restrict to Admin and HR roles */
export const adminOrHR = authorize('ADMIN', 'HR');

/** Restrict to any authenticated user (alias for authenticate) */
export const requireAuth = authenticate;

export default {
  authenticate,
  optionalAuth,
  authorize,
  selfOrAdmin,
  adminOnly,
  adminOrHR,
  requireAuth,
};
