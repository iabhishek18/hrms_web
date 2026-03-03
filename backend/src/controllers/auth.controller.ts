// ============================================
// Authentication Controller
// ============================================
// Handles HTTP request/response for authentication endpoints.
// Delegates business logic to AuthService and formats responses
// using the standardized ApiResponse helper.

import { Request, Response } from 'express';

import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

// ============================================
// Auth Controller
// ============================================

export class AuthController {
  // ------------------------------------------
  // POST /api/auth/register
  // ------------------------------------------

  /**
   * Registers a new user account and creates an associated employee record.
   *
   * Request Body:
   *   - email: string (required)
   *   - password: string (required, min 8 chars, mixed case + digit)
   *   - confirmPassword: string (required, must match password)
   *   - firstName: string (required)
   *   - lastName: string (required)
   *   - role: 'ADMIN' | 'HR' | 'EMPLOYEE' (optional, default: 'EMPLOYEE')
   *
   * Response: 201 Created
   *   - user: { id, email, role, employee: { ... } }
   *   - tokens: { accessToken, refreshToken }
   */
  static async register(req: Request, res: Response): Promise<void> {
    const { email, password, firstName, lastName, role } = req.body;

    const result = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
      role,
    });

    // Set refresh token as an HTTP-only cookie for security
    AuthController.setRefreshTokenCookie(res, result.tokens.refreshToken);

    res.status(201).json(
      ApiResponse.success('Registration successful. Welcome to HRMS!', {
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
      }),
    );
  }

  // ------------------------------------------
  // POST /api/auth/login
  // ------------------------------------------

  /**
   * Authenticates a user with email and password credentials.
   *
   * Request Body:
   *   - email: string (required)
   *   - password: string (required)
   *
   * Response: 200 OK
   *   - user: { id, email, role, employee: { ... } }
   *   - tokens: { accessToken, refreshToken }
   */
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    const result = await AuthService.login({ email, password });

    // Set refresh token as an HTTP-only cookie
    AuthController.setRefreshTokenCookie(res, result.tokens.refreshToken);

    res.status(200).json(
      ApiResponse.success('Login successful.', {
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
      }),
    );
  }

  // ------------------------------------------
  // POST /api/auth/logout
  // ------------------------------------------

  /**
   * Logs out the currently authenticated user by invalidating
   * their refresh token. The access token will remain valid until
   * it naturally expires.
   *
   * Requires: Authentication (Bearer token)
   *
   * Response: 200 OK
   */
  static async logout(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;

    if (!userId) {
      throw ApiError.unauthorized('You must be logged in to log out.');
    }

    await AuthService.logout(userId);

    // Clear the refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
    });

    res.status(200).json(
      ApiResponse.success('Logged out successfully.', null),
    );
  }

  // ------------------------------------------
  // GET /api/auth/me
  // ------------------------------------------

  /**
   * Returns the full profile of the currently authenticated user,
   * including their employee record, department, manager, and
   * leave balances.
   *
   * Requires: Authentication (Bearer token)
   *
   * Response: 200 OK
   *   - user: { id, email, role, employee: { ... }, lastLogin, ... }
   */
  static async me(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;

    if (!userId) {
      throw ApiError.unauthorized('Authentication required.');
    }

    const user = await AuthService.getCurrentUser(userId);

    res.status(200).json(
      ApiResponse.success('Current user retrieved successfully.', user),
    );
  }

  // ------------------------------------------
  // POST /api/auth/refresh
  // ------------------------------------------

  /**
   * Issues a new access/refresh token pair using a valid refresh token.
   * Implements token rotation: the old refresh token is invalidated
   * and a new one is issued.
   *
   * The refresh token can be provided via:
   *   1. Request body: { refreshToken: "..." }
   *   2. HTTP-only cookie: "refreshToken"
   *
   * Response: 200 OK
   *   - tokens: { accessToken, refreshToken }
   *   - user: { id, email, role }
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    // Try to get the refresh token from body first, then from cookies
    const refreshToken =
      req.body.refreshToken ||
      req.cookies?.refreshToken;

    if (!refreshToken) {
      throw ApiError.unauthorized(
        'Refresh token is required. Please provide it in the request body or as a cookie.',
      );
    }

    const result = await AuthService.refreshToken(refreshToken);

    // Set the new refresh token as a cookie
    AuthController.setRefreshTokenCookie(res, result.tokens.refreshToken);

    res.status(200).json(
      ApiResponse.success('Tokens refreshed successfully.', {
        user: result.user,
        tokens: {
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
      }),
    );
  }

  // ------------------------------------------
  // POST /api/auth/change-password
  // ------------------------------------------

  /**
   * Changes the password for the currently authenticated user.
   *
   * Requires: Authentication (Bearer token)
   *
   * Request Body:
   *   - currentPassword: string (required)
   *   - newPassword: string (required, min 8 chars, mixed case + digit)
   *   - confirmNewPassword: string (required, must match newPassword)
   *
   * Response: 200 OK
   *
   * Side Effects:
   *   - The refresh token is invalidated (user must re-login on other devices)
   *   - The refresh token cookie is cleared
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;

    if (!userId) {
      throw ApiError.unauthorized('Authentication required.');
    }

    const { currentPassword, newPassword } = req.body;

    await AuthService.changePassword(userId, currentPassword, newPassword);

    // Clear the refresh token cookie since all sessions are invalidated
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
    });

    res.status(200).json(
      ApiResponse.success(
        'Password changed successfully. Please log in again with your new password.',
        null,
      ),
    );
  }

  // ------------------------------------------
  // GET /api/auth/verify
  // ------------------------------------------

  /**
   * Verifies that the current access token is valid.
   * Returns minimal user information if the token is valid.
   *
   * Requires: Authentication (Bearer token)
   *
   * Response: 200 OK
   *   - valid: true
   *   - user: { userId, email, role }
   */
  static async verify(req: Request, res: Response): Promise<void> {
    // If we reach this point, the authenticate middleware has already
    // verified the token and populated req.user
    if (!req.user) {
      throw ApiError.unauthorized('Invalid token.');
    }

    res.status(200).json(
      ApiResponse.success('Token is valid.', {
        valid: true,
        user: {
          userId: req.user.userId,
          email: req.user.email,
          role: req.user.role,
          employeeId: req.user.employeeId,
        },
      }),
    );
  }

  // ------------------------------------------
  // Private Helpers
  // ------------------------------------------

  /**
   * Sets the refresh token as a secure HTTP-only cookie.
   *
   * Security considerations:
   * - httpOnly: true    → Prevents JavaScript access (XSS protection)
   * - secure: true      → Only sent over HTTPS in production
   * - sameSite: strict  → Prevents CSRF by not sending cookie on cross-site requests
   * - path: /api/auth   → Cookie only sent to auth endpoints (reduces exposure)
   * - maxAge: 30 days   → Matches the refresh token expiry
   *
   * @param res - Express response object
   * @param token - The refresh token string to set
   */
  private static setRefreshTokenCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/auth',
      maxAge: thirtyDaysInMs,
    });
  }
}

export default AuthController;
