// ============================================
// Authentication API Service
// ============================================
// Provides typed API functions for all authentication
// endpoints. Used by the auth Redux slice and useAuth hook.

import { api } from './client';

// ============================================
// Types
// ============================================

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role?: 'ADMIN' | 'HR' | 'EMPLOYEE';
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UserEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  designation: string;
  department: {
    id: string;
    name: string;
    code?: string;
  } | null;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'HR' | 'EMPLOYEE';
  isActive?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
  employee?: UserEmployee | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseData {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RefreshResponseData {
  user: {
    id: string;
    email: string;
    role: string;
  };
  tokens: AuthTokens;
}

export interface VerifyResponseData {
  valid: boolean;
  user: {
    userId: string;
    email: string;
    role: string;
    employeeId?: string;
  };
}

// ============================================
// Auth API Functions
// ============================================

export const authApi = {
  /**
   * POST /api/auth/login
   * Authenticate a user with email and password.
   * Returns JWT access + refresh tokens and user profile.
   */
  login: (payload: LoginPayload) =>
    api.post<AuthResponseData>('/auth/login', payload),

  /**
   * POST /api/auth/register
   * Register a new user account with an associated employee profile.
   * Returns JWT access + refresh tokens and user profile.
   */
  register: (payload: RegisterPayload) =>
    api.post<AuthResponseData>('/auth/register', payload),

  /**
   * POST /api/auth/logout
   * Log out the current user by invalidating their refresh token.
   * Clears the refresh token cookie on the server side.
   */
  logout: () =>
    api.post<null>('/auth/logout'),

  /**
   * GET /api/auth/me
   * Retrieve the full profile of the currently authenticated user.
   * Includes employee record, department, manager, and leave balances.
   */
  me: () =>
    api.get<AuthUser>('/auth/me'),

  /**
   * POST /api/auth/refresh
   * Issue a new access/refresh token pair using a valid refresh token.
   * Implements token rotation for security.
   */
  refresh: (refreshToken: string) =>
    api.post<RefreshResponseData>('/auth/refresh', { refreshToken }),

  /**
   * GET /api/auth/verify
   * Verify that the current access token is valid.
   * Returns minimal user information (userId, email, role).
   */
  verify: () =>
    api.get<VerifyResponseData>('/auth/verify'),

  /**
   * POST /api/auth/change-password
   * Change the password for the currently authenticated user.
   * Requires the current password for verification.
   * Invalidates all existing refresh tokens (forces re-login).
   */
  changePassword: (payload: ChangePasswordPayload) =>
    api.post<null>('/auth/change-password', payload),
};

export default authApi;
