// ============================================
// Custom Authentication Hook
// ============================================
// Provides a convenient interface for authentication operations
// throughout the React application. Wraps Redux auth state
// and dispatches auth actions.

import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./useRedux";
import {
  login as loginAsync,
  register as registerAsync,
  logout as logoutAsync,
  fetchCurrentUser,
  refreshTokens as refreshTokenAsync,
  clearError,
  setTokens,
} from "@/store/slices/authSlice";
import type { LoginCredentials, RegisterData } from "@/types";

// ============================================
// Storage Keys — MUST match authSlice.ts and api/client.ts
// ============================================
const STORAGE_KEYS = {
  ACCESS_TOKEN: "hrms_access_token",
  REFRESH_TOKEN: "hrms_refresh_token",
} as const;

/**
 * Custom hook that provides authentication state and actions.
 *
 * Usage:
 * ```tsx
 * const { user, isAuthenticated, isLoading, login, logout, register } = useAuth();
 *
 * // Login
 * await login({ email: 'admin@hrms.com', password: 'admin123' });
 *
 * // Check auth state
 * if (isAuthenticated) {
 *   console.log('Welcome', user?.employee?.firstName);
 * }
 *
 * // Logout
 * await logout();
 * ```
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Select auth state from Redux store
  const { user, tokens, isAuthenticated, isLoading, error, isInitialized } =
    useAppSelector((state) => state.auth);

  /**
   * Log in with email and password.
   * On success, stores tokens and redirects to dashboard.
   * On failure, the error is stored in Redux state.
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const result = await dispatch(loginAsync(credentials)).unwrap();
        // Store tokens in localStorage for persistence across page reloads
        if (result.tokens) {
          localStorage.setItem(
            STORAGE_KEYS.ACCESS_TOKEN,
            result.tokens.accessToken,
          );
          localStorage.setItem(
            STORAGE_KEYS.REFRESH_TOKEN,
            result.tokens.refreshToken,
          );
        }
        navigate("/dashboard", { replace: true });
        return result;
      } catch (err) {
        // Error is already stored in Redux state by the rejected action
        throw err;
      }
    },
    [dispatch, navigate],
  );

  /**
   * Register a new user account.
   * On success, stores tokens and redirects to dashboard.
   */
  const register = useCallback(
    async (data: RegisterData) => {
      try {
        const result = await dispatch(registerAsync(data)).unwrap();
        if (result.tokens) {
          localStorage.setItem(
            STORAGE_KEYS.ACCESS_TOKEN,
            result.tokens.accessToken,
          );
          localStorage.setItem(
            STORAGE_KEYS.REFRESH_TOKEN,
            result.tokens.refreshToken,
          );
        }
        navigate("/dashboard", { replace: true });
        return result;
      } catch (err) {
        throw err;
      }
    },
    [dispatch, navigate],
  );

  /**
   * Log out the current user.
   * Clears tokens from localStorage and redirects to login page.
   */
  const logout = useCallback(async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
    } catch {
      // Even if the API call fails, we still want to clear local state
    } finally {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      navigate("/login", { replace: true });
    }
  }, [dispatch, navigate]);

  /**
   * Fetch the current user's profile from the API.
   * Useful for refreshing user data after profile updates.
   */
  const refreshUser = useCallback(async () => {
    try {
      const result = await dispatch(fetchCurrentUser()).unwrap();
      return result;
    } catch {
      // If fetching user fails (e.g., token expired), log out
      await logout();
      return null;
    }
  }, [dispatch, logout]);

  /**
   * Attempt to refresh the access token using the stored refresh token.
   * Called automatically when an API request returns 401.
   */
  const refreshToken = useCallback(async () => {
    try {
      const result = await dispatch(refreshTokenAsync()).unwrap();

      if (result) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, result.refreshToken);
      }

      return result;
    } catch {
      await logout();
      return null;
    }
  }, [dispatch, logout]);

  /**
   * Initialize auth state from localStorage on app startup.
   * Checks if there's a stored token and validates it.
   */
  const initializeAuth = useCallback(async () => {
    const storedAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    if (!storedAccessToken) {
      return false;
    }

    // Set the stored credentials in Redux state
    dispatch(
      setTokens({
        accessToken: storedAccessToken,
        refreshToken: storedRefreshToken || "",
      }),
    );

    // Validate the token by fetching the current user
    try {
      await dispatch(fetchCurrentUser()).unwrap();
      return true;
    } catch {
      // Token is invalid or expired — try refreshing
      if (storedRefreshToken) {
        try {
          const refreshResult = await dispatch(refreshTokenAsync()).unwrap();

          if (refreshResult) {
            localStorage.setItem(
              STORAGE_KEYS.ACCESS_TOKEN,
              refreshResult.accessToken,
            );
            localStorage.setItem(
              STORAGE_KEYS.REFRESH_TOKEN,
              refreshResult.refreshToken,
            );
          }

          // Try fetching the user again with the new token
          await dispatch(fetchCurrentUser()).unwrap();
          return true;
        } catch {
          // Refresh also failed — clear everything
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          return false;
        }
      }

      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      return false;
    }
  }, [dispatch]);

  /**
   * Clear any authentication error from Redux state.
   * Useful when navigating away from the login page or
   * dismissing error notifications.
   */
  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // ---- Computed / derived values ----

  /** Check if the user has a specific role */
  const hasRole = useCallback(
    (role: string | string[]): boolean => {
      if (!user) return false;
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(user.role);
    },
    [user],
  );

  /** Check if the user is an admin */
  const isAdmin = useMemo(() => hasRole("ADMIN"), [hasRole]);

  /** Check if the user is HR */
  const isHR = useMemo(() => hasRole("HR"), [hasRole]);

  /** Check if the user is an admin or HR */
  const isAdminOrHR = useMemo(() => hasRole(["ADMIN", "HR"]), [hasRole]);

  /** Check if the user is a regular employee */
  const isEmployee = useMemo(() => hasRole("EMPLOYEE"), [hasRole]);

  /** Get the user's full name */
  const fullName = useMemo(() => {
    if (!user?.employee) return user?.email || "";
    return `${user.employee.firstName} ${user.employee.lastName}`.trim();
  }, [user]);

  /** Get the user's initials for avatar display */
  const initials = useMemo(() => {
    if (!user?.employee) {
      return user?.email?.charAt(0)?.toUpperCase() || "?";
    }
    const first = user.employee.firstName?.charAt(0) || "";
    const last = user.employee.lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase() || "?";
  }, [user]);

  /** Get the user's avatar URL or null */
  const avatarUrl = useMemo(() => {
    return user?.employee?.avatar || null;
  }, [user]);

  /** Get the user's employee ID (e.g., EMP-0001) */
  const employeeId = useMemo(() => {
    return user?.employee?.employeeId || null;
  }, [user]);

  /** Get the user's department name */
  const departmentName = useMemo(() => {
    return user?.employee?.department?.name || "Unassigned";
  }, [user]);

  /** Get the stored access token */
  const accessToken = useMemo(() => {
    return (
      tokens?.accessToken ||
      localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ||
      null
    );
  }, [tokens]);

  return {
    // State
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    isInitialized,

    // Actions
    login,
    register,
    logout,
    refreshUser,
    refreshToken,
    initializeAuth,
    clearAuthError,

    // Computed / Derived
    hasRole,
    isAdmin,
    isHR,
    isAdminOrHR,
    isEmployee,
    fullName,
    initials,
    avatarUrl,
    employeeId,
    departmentName,
    accessToken,
  };
}

export default useAuth;
