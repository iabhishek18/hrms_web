// ============================================
// Authentication Routes
// ============================================
// Defines all routes related to authentication:
// register, login, logout, refresh token, change password,
// get current user profile, and token verification.
//
// Each route applies appropriate middleware:
//   - validate()    → Validates request body/params with Zod schemas
//   - authenticate  → Verifies JWT access token
//   - asyncHandler  → Catches async errors and forwards to error middleware

import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../utils/validators';

const router = Router();

// ============================================
// Public Routes (No authentication required)
// ============================================

/**
 * POST /api/auth/register
 *
 * Register a new user account with an associated employee profile.
 * Validates: email, password (strong), confirmPassword, firstName, lastName, role?
 */
router.post(
  '/register',
  validate(registerSchema, 'body'),
  asyncHandler(AuthController.register),
);

/**
 * POST /api/auth/login
 *
 * Authenticate a user with email and password.
 * Returns JWT access + refresh tokens and user profile.
 * Validates: email, password
 */
router.post(
  '/login',
  validate(loginSchema, 'body'),
  asyncHandler(AuthController.login),
);

/**
 * POST /api/auth/refresh
 *
 * Issue a new access/refresh token pair using a valid refresh token.
 * The refresh token can be provided in the request body or as an HTTP-only cookie.
 * Implements token rotation for security.
 */
router.post(
  '/refresh',
  asyncHandler(AuthController.refresh),
);

// ============================================
// Protected Routes (Authentication required)
// ============================================

/**
 * POST /api/auth/logout
 *
 * Log out the current user by invalidating their refresh token.
 * The access token will remain valid until it naturally expires.
 * Clears the refresh token cookie.
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(AuthController.logout),
);

/**
 * GET /api/auth/me
 *
 * Retrieve the full profile of the currently authenticated user.
 * Includes employee record, department, manager, and leave balances.
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(AuthController.me),
);

/**
 * GET /api/auth/verify
 *
 * Verify that the current access token is valid.
 * Returns minimal user information (userId, email, role).
 * Useful for the frontend to check auth state on page load.
 */
router.get(
  '/verify',
  authenticate,
  asyncHandler(AuthController.verify),
);

/**
 * POST /api/auth/change-password
 *
 * Change the password for the currently authenticated user.
 * Requires the current password for verification.
 * Invalidates all existing refresh tokens (forces re-login on other devices).
 * Validates: currentPassword, newPassword (strong), confirmNewPassword
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema, 'body'),
  asyncHandler(AuthController.changePassword),
);

export default router;
