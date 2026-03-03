// ============================================
// Authentication Service
// ============================================
// Handles all authentication-related business logic including
// user registration, login, token refresh, password changes,
// and logout. This service layer sits between the controller
// and the database, keeping business rules separate from
// HTTP concerns.

import prisma from '../config/database';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { hashPassword, comparePassword } from '../utils/password';
import {
  generateTokenPair,
  verifyRefreshToken,
  TokenPair,
  TokenPayload,
} from '../utils/jwt';
import { generateEmployeeId } from '../utils/helpers';
import { Role } from '@prisma/client';

// ============================================
// Types
// ============================================

/** Input data for user registration */
export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
}

/** Input data for user login */
export interface LoginInput {
  email: string;
  password: string;
}

/** Response returned after successful authentication */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: Role;
    employee?: {
      id: string;
      employeeId: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
      designation: string;
      department: { id: string; name: string } | null;
    } | null;
  };
  tokens: TokenPair;
}

/** Response for token refresh */
export interface RefreshResponse {
  tokens: TokenPair;
  user: {
    id: string;
    email: string;
    role: Role;
  };
}

// ============================================
// Auth Service Class
// ============================================

export class AuthService {
  // ------------------------------------------
  // Register a new user
  // ------------------------------------------

  /**
   * Registers a new user account and creates an associated employee record.
   *
   * Steps:
   * 1. Check if the email is already registered
   * 2. Hash the password with bcrypt
   * 3. Generate a unique employee ID (EMP-0001, EMP-0002, ...)
   * 4. Create the User and Employee records in a transaction
   * 5. Generate JWT access + refresh tokens
   * 6. Store the refresh token hash in the database
   * 7. Return the user info and tokens
   *
   * @param input - Registration data (email, password, firstName, lastName, role?)
   * @returns AuthResponse with user data and JWT tokens
   * @throws ApiError 409 if the email is already registered
   */
  static async register(input: RegisterInput): Promise<AuthResponse> {
    const { email, password, firstName, lastName, role = 'EMPLOYEE' } = input;

    // 1. Check for existing user with the same email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw ApiError.conflict(
        'An account with this email address already exists. Please use a different email or log in.',
      );
    }

    // Also check employee emails to prevent duplicates
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingEmployee) {
      throw ApiError.conflict(
        'An employee with this email address already exists in the system.',
      );
    }

    // 2. Hash the password
    const hashedPassword = await hashPassword(password);

    // 3. Generate the next sequential employee ID
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { employeeId: 'desc' },
      select: { employeeId: true },
    });
    const newEmployeeId = generateEmployeeId(lastEmployee?.employeeId ?? null);

    // 4. Create User + Employee in a database transaction
    //    This ensures both records are created or neither is (atomicity)
    const result = await prisma.$transaction(async (tx) => {
      // Create the user account
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: role as Role,
          isActive: true,
        },
      });

      // Create the associated employee record
      const employee = await tx.employee.create({
        data: {
          employeeId: newEmployeeId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          designation: role === 'ADMIN' ? 'System Administrator' : role === 'HR' ? 'HR Manager' : 'Employee',
          joiningDate: new Date(),
          status: 'ACTIVE',
          userId: user.id,
        },
        include: {
          department: {
            select: { id: true, name: true },
          },
        },
      });

      // Create default leave balances for the new employee (current year)
      const currentYear = new Date().getFullYear();
      const defaultLeaveBalances = [
        { leaveType: 'CASUAL' as const, totalLeaves: 12 },
        { leaveType: 'SICK' as const, totalLeaves: 10 },
        { leaveType: 'EARNED' as const, totalLeaves: 15 },
      ];

      await tx.leaveBalance.createMany({
        data: defaultLeaveBalances.map((lb) => ({
          employeeId: employee.id,
          leaveType: lb.leaveType,
          totalLeaves: lb.totalLeaves,
          usedLeaves: 0,
          year: currentYear,
        })),
      });

      return { user, employee };
    });

    // 5. Generate JWT tokens
    const tokenPayload: TokenPayload = {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
    };
    const tokens = generateTokenPair(tokenPayload);

    // 6. Store the refresh token in the database
    //    We store it directly here; in a more secure setup you'd hash it
    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLogin: new Date(),
      },
    });

    // 7. Log the registration in the audit log
    await prisma.auditLog.create({
      data: {
        action: 'REGISTER',
        entity: 'User',
        entityId: result.user.id,
        details: JSON.stringify({
          email: result.user.email,
          role: result.user.role,
          employeeId: result.employee.employeeId,
        }),
        userId: result.user.id,
        userEmail: result.user.email,
      },
    });

    // 8. Return the response (exclude sensitive data like password)
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        employee: {
          id: result.employee.id,
          employeeId: result.employee.employeeId,
          firstName: result.employee.firstName,
          lastName: result.employee.lastName,
          avatar: result.employee.avatar,
          designation: result.employee.designation,
          department: result.employee.department,
        },
      },
      tokens,
    };
  }

  // ------------------------------------------
  // Login
  // ------------------------------------------

  /**
   * Authenticates a user with email and password.
   *
   * Steps:
   * 1. Find the user by email
   * 2. Verify the password against the stored hash
   * 3. Check if the account is active
   * 4. Generate new JWT tokens
   * 5. Update the stored refresh token and last login timestamp
   * 6. Return user info and tokens
   *
   * @param input - Login credentials (email, password)
   * @returns AuthResponse with user data and JWT tokens
   * @throws ApiError 401 if credentials are invalid or account is inactive
   */
  static async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    // 1. Find the user by email (include employee data for the response)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        employee: {
          include: {
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Use a generic error message for both "user not found" and "wrong password"
    // to prevent email enumeration attacks
    if (!user) {
      throw ApiError.unauthorized(
        'Invalid email or password. Please check your credentials and try again.',
      );
    }

    // 2. Verify the password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw ApiError.unauthorized(
        'Invalid email or password. Please check your credentials and try again.',
      );
    }

    // 3. Check if the account is active
    if (!user.isActive) {
      throw ApiError.unauthorized(
        'Your account has been deactivated. Please contact your administrator.',
      );
    }

    // 4. Generate new JWT tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const tokens = generateTokenPair(tokenPayload);

    // 5. Update refresh token and last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        lastLogin: new Date(),
      },
    });

    // 6. Log the login event
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        details: JSON.stringify({ email: user.email, role: user.role }),
        userId: user.id,
        userEmail: user.email,
      },
    });

    // 7. Build and return the response
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: user.employee
          ? {
              id: user.employee.id,
              employeeId: user.employee.employeeId,
              firstName: user.employee.firstName,
              lastName: user.employee.lastName,
              avatar: user.employee.avatar,
              designation: user.employee.designation,
              department: user.employee.department,
            }
          : null,
      },
      tokens,
    };
  }

  // ------------------------------------------
  // Refresh Token
  // ------------------------------------------

  /**
   * Issues a new access/refresh token pair using a valid refresh token.
   *
   * This implements token rotation: the old refresh token is invalidated
   * and replaced with a new one. If someone tries to use a stolen refresh
   * token after rotation, it will no longer be valid.
   *
   * Steps:
   * 1. Verify the refresh token's signature and expiry
   * 2. Find the user and compare against their stored refresh token
   * 3. Generate a new token pair
   * 4. Store the new refresh token in the database
   * 5. Return the new tokens
   *
   * @param refreshToken - The current refresh token string
   * @returns RefreshResponse with new tokens and basic user info
   * @throws ApiError 401 if the refresh token is invalid, expired, or revoked
   */
  static async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    // 1. Verify the refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized(
          'Your refresh token has expired. Please log in again.',
        );
      }
      throw ApiError.unauthorized(
        'Invalid refresh token. Please log in again.',
      );
    }

    // 2. Find the user and verify the stored refresh token matches
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        refreshToken: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('User not found. Please log in again.');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized(
        'Your account has been deactivated. Please contact an administrator.',
      );
    }

    // Compare the provided refresh token with the one stored in the database.
    // This ensures that if a token is compromised and rotated, the old one
    // can no longer be used (token rotation security).
    if (user.refreshToken !== refreshToken) {
      // Potential token theft detected — invalidate all tokens for this user
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      });

      throw ApiError.unauthorized(
        'Refresh token has been revoked. For security, please log in again.',
      );
    }

    // 3. Generate a new token pair
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const newTokens = generateTokenPair(tokenPayload);

    // 4. Store the new refresh token (invalidates the old one)
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newTokens.refreshToken },
    });

    // 5. Return new tokens and user info
    return {
      tokens: newTokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  // ------------------------------------------
  // Logout
  // ------------------------------------------

  /**
   * Logs out a user by clearing their stored refresh token.
   * This prevents the refresh token from being used to get new access tokens.
   *
   * Note: The current access token will remain valid until it expires.
   * For immediate invalidation, you'd need a token blacklist (e.g., Redis).
   *
   * @param userId - The ID of the user to log out
   */
  static async logout(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    // Log the logout event
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'LOGOUT',
        entity: 'User',
        entityId: userId,
        details: JSON.stringify({ email: user?.email }),
        userId,
        userEmail: user?.email,
      },
    });
  }

  // ------------------------------------------
  // Get Current User (me)
  // ------------------------------------------

  /**
   * Retrieves the full profile of the currently authenticated user.
   * Used by the "me" / "profile" endpoint.
   *
   * @param userId - The authenticated user's ID
   * @returns The user object with their employee data and department
   * @throws ApiError 404 if the user is not found
   */
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        employee: {
          include: {
            department: {
              select: { id: true, name: true, code: true },
            },
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
              },
            },
            leaveBalances: {
              where: { year: new Date().getFullYear() },
              select: {
                leaveType: true,
                totalLeaves: true,
                usedLeaves: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User account not found.');
    }

    return user;
  }

  // ------------------------------------------
  // Change Password
  // ------------------------------------------

  /**
   * Changes the password for a given user.
   *
   * Steps:
   * 1. Verify the current password is correct
   * 2. Hash the new password
   * 3. Update the password in the database
   * 4. Invalidate the refresh token (force re-login on other devices)
   *
   * @param userId - The user's ID
   * @param currentPassword - The current password for verification
   * @param newPassword - The new password to set
   * @throws ApiError 401 if the current password is incorrect
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // 1. Fetch the user's current password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    });

    if (!user) {
      throw ApiError.notFound('User account not found.');
    }

    // 2. Verify the current password
    const isCurrentValid = await comparePassword(currentPassword, user.password);

    if (!isCurrentValid) {
      throw ApiError.unauthorized(
        'Current password is incorrect. Please try again.',
      );
    }

    // 3. Hash the new password
    const hashedNewPassword = await hashPassword(newPassword);

    // 4. Update password and invalidate refresh token
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        refreshToken: null, // Force re-login on all devices
      },
    });

    // 5. Log the password change
    await prisma.auditLog.create({
      data: {
        action: 'CHANGE_PASSWORD',
        entity: 'User',
        entityId: userId,
        details: JSON.stringify({ email: user.email }),
        userId,
        userEmail: user.email,
      },
    });
  }

  // ------------------------------------------
  // Verify Token (utility)
  // ------------------------------------------

  /**
   * Verifies that a user account associated with a token payload
   * is still valid and active. Used internally by middlewares.
   *
   * @param userId - The user ID from the token
   * @returns Basic user info if valid
   * @throws ApiError 401 if the user doesn't exist or is inactive
   */
  static async verifyUserFromToken(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        employee: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists.');
    }

    if (!user.isActive) {
      throw ApiError.unauthorized('User account has been deactivated.');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
    };
  }
}

export default AuthService;
