// ============================================
// Auth Redux Slice
// ============================================
// Manages authentication state including user info,
// tokens, loading states, and error messages.
// Uses Redux Toolkit's createSlice and createAsyncThunk
// for clean async action handling.

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

import { authApi } from "@/api/auth";

// ============================================
// Types
// ============================================

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
  } | null;
}

export interface AuthUser {
  id: string;
  email: string;
  role: "ADMIN" | "HR" | "EMPLOYEE";
  employee?: UserEmployee | null;
  isActive?: boolean;
  lastLogin?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean; // Whether we've checked for existing auth on app load
  error: string | null;
  registerSuccess: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role?: "ADMIN" | "HR" | "EMPLOYEE";
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

// ============================================
// Local Storage Keys
// ============================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: "hrms_access_token",
  REFRESH_TOKEN: "hrms_refresh_token",
  USER: "hrms_user",
} as const;

// ============================================
// Local Storage Helpers
// ============================================

/**
 * Patch admin user name — overrides the database name for admin@hrms.com
 * so that "Rajesh Kumar" (or any stale DB value) is corrected to
 * "Abhishek Mishra" on the client side without requiring a DB reseed.
 */
function patchAdminName(user: AuthUser): AuthUser {
  if (
    user.email === "admin@hrms.com" &&
    user.employee &&
    (user.employee.firstName !== "Abhishek" ||
      user.employee.lastName !== "Mishra")
  ) {
    return {
      ...user,
      employee: {
        ...user.employee,
        firstName: "Abhishek",
        lastName: "Mishra",
      },
    };
  }
  return user;
}

function saveAuthToStorage(user: AuthUser, tokens: AuthTokens): void {
  try {
    const patchedUser = patchAdminName(user);
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(patchedUser));
  } catch (error) {
    console.error("Failed to save auth data to localStorage:", error);
  }
}

function clearAuthFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error("Failed to clear auth data from localStorage:", error);
  }
}

function loadAuthFromStorage(): {
  user: AuthUser | null;
  tokens: AuthTokens | null;
} {
  try {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const userJson = localStorage.getItem(STORAGE_KEYS.USER);

    if (!accessToken || !refreshToken || !userJson) {
      return { user: null, tokens: null };
    }

    const user = patchAdminName(JSON.parse(userJson) as AuthUser);
    const tokens: AuthTokens = { accessToken, refreshToken };

    return { user, tokens };
  } catch (error) {
    console.error("Failed to load auth data from localStorage:", error);
    clearAuthFromStorage();
    return { user: null, tokens: null };
  }
}

// ============================================
// Async Thunks
// ============================================

/**
 * Login — authenticates a user with email/password credentials.
 * On success, stores tokens in localStorage and updates Redux state.
 */
export const login = createAsyncThunk<
  AuthResponse,
  LoginCredentials,
  { rejectValue: string }
>("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await authApi.login(credentials);
    const { user: rawUser, tokens } = response.data.data;

    // Patch admin name and persist auth data to localStorage
    const user = patchAdminName(rawUser);
    saveAuthToStorage(user, tokens);

    return { user, tokens };
  } catch (error: any) {
    // Extract a user-friendly error message from the API response
    const message =
      error.response?.data?.message ||
      error.message ||
      "Login failed. Please check your credentials and try again.";
    return rejectWithValue(message);
  }
});

/**
 * Register — creates a new user account and logs them in.
 * On success, stores tokens in localStorage and updates Redux state.
 */
export const register = createAsyncThunk<
  AuthResponse,
  RegisterCredentials,
  { rejectValue: string }
>("auth/register", async (credentials, { rejectWithValue }) => {
  try {
    const response = await authApi.register(credentials);
    const { user: rawUser, tokens } = response.data.data;

    // Patch admin name and persist auth data to localStorage
    const user = patchAdminName(rawUser);
    saveAuthToStorage(user, tokens);

    return { user, tokens };
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Registration failed. Please try again.";
    return rejectWithValue(message);
  }
});

/**
 * Logout — invalidates the refresh token on the server
 * and clears all auth data from the client.
 */
export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      // Attempt to invalidate the refresh token on the server
      await authApi.logout();
    } catch (error: any) {
      // Even if the server call fails, we still want to clear local auth state
      console.warn(
        "Logout API call failed (clearing local state anyway):",
        error.message,
      );
    } finally {
      // Always clear local storage regardless of server response
      clearAuthFromStorage();
    }
  },
);

/**
 * fetchCurrentUser — retrieves the full profile of the currently
 * authenticated user. Called on app initialization to verify
 * that the stored token is still valid.
 */
export const fetchCurrentUser = createAsyncThunk<
  AuthUser,
  void,
  { rejectValue: string }
>("auth/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const response = await authApi.me();
    const user = patchAdminName(response.data.data);

    // Update the user data in localStorage
    const storedTokens = {
      accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || "",
      refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || "",
    };

    if (storedTokens.accessToken) {
      saveAuthToStorage(user, storedTokens);
    }

    return user;
  } catch (error: any) {
    // If fetching the user fails, clear auth state
    clearAuthFromStorage();
    const message =
      error.response?.data?.message ||
      error.message ||
      "Session expired. Please log in again.";
    return rejectWithValue(message);
  }
});

/**
 * refreshTokens — uses the stored refresh token to obtain
 * a new access/refresh token pair. Called automatically when
 * an API request returns 401.
 */
export const refreshTokens = createAsyncThunk<
  AuthTokens,
  void,
  { rejectValue: string }
>("auth/refreshTokens", async (_, { rejectWithValue }) => {
  try {
    const currentRefreshToken = localStorage.getItem(
      STORAGE_KEYS.REFRESH_TOKEN,
    );

    if (!currentRefreshToken) {
      return rejectWithValue("No refresh token available");
    }

    const response = await authApi.refresh(currentRefreshToken);
    const { tokens, user: rawUser } = response.data.data;

    // Patch admin name and update stored tokens and user data
    const user = patchAdminName(rawUser as AuthUser);
    saveAuthToStorage(user, tokens);

    return tokens;
  } catch (error: any) {
    clearAuthFromStorage();
    const message =
      error.response?.data?.message || "Session expired. Please log in again.";
    return rejectWithValue(message);
  }
});

/**
 * changePassword — changes the password for the current user.
 * After success, clears auth state since all tokens are invalidated.
 */
export const changePassword = createAsyncThunk<
  void,
  { currentPassword: string; newPassword: string; confirmNewPassword: string },
  { rejectValue: string }
>("auth/changePassword", async (data, { rejectWithValue }) => {
  try {
    await authApi.changePassword(data);
    // After password change, tokens are invalidated — user must re-login
    clearAuthFromStorage();
    return;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to change password.";
    return rejectWithValue(message);
  }
});

/**
 * initializeAuth — checks for existing auth data in localStorage
 * on app startup. If tokens exist, verifies them by fetching the
 * current user profile. This runs once when the app loads.
 */
export const initializeAuth = createAsyncThunk<
  { user: AuthUser; tokens: AuthTokens } | null,
  void,
  { rejectValue: string }
>("auth/initialize", async (_, { dispatch, rejectWithValue }) => {
  try {
    const { user, tokens } = loadAuthFromStorage();

    if (!user || !tokens || !tokens.accessToken) {
      // No stored auth data — user is not authenticated
      return null;
    }

    // Verify the stored token is still valid by fetching the current user
    try {
      const response = await authApi.me();
      const freshUser = patchAdminName(response.data.data as AuthUser);

      // Update localStorage with fresh user data
      saveAuthToStorage(freshUser, tokens);

      return { user: freshUser, tokens };
    } catch (error: any) {
      // If the access token is expired, try refreshing
      if (error.response?.status === 401 && tokens.refreshToken) {
        try {
          const refreshResponse = await authApi.refresh(tokens.refreshToken);
          const { tokens: newTokens, user: rawRefreshedUser } =
            refreshResponse.data.data;

          const refreshedUser = patchAdminName(rawRefreshedUser as AuthUser);
          saveAuthToStorage(refreshedUser, newTokens);

          return { user: refreshedUser, tokens: newTokens };
        } catch (refreshError) {
          // Refresh also failed — clear everything
          clearAuthFromStorage();
          return null;
        }
      }

      // Non-401 error — clear auth state
      clearAuthFromStorage();
      return null;
    }
  } catch (error: any) {
    clearAuthFromStorage();
    return null;
  }
});

// ============================================
// Initial State
// ============================================

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  registerSuccess: false,
};

// ============================================
// Auth Slice
// ============================================

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /**
     * Clears any error message in the auth state.
     * Called when the user navigates away from the login/register page
     * or dismisses an error notification.
     */
    clearError(state) {
      state.error = null;
    },

    /**
     * Resets the register success flag.
     * Called after showing the success message to the user.
     */
    clearRegisterSuccess(state) {
      state.registerSuccess = false;
    },

    /**
     * Manually sets the user data (e.g., after profile update).
     */
    setUser(state, action: PayloadAction<AuthUser>) {
      const patched = patchAdminName(action.payload);
      state.user = patched;
      // Also update localStorage
      if (state.tokens) {
        saveAuthToStorage(patched, state.tokens);
      }
    },

    /**
     * Manually sets new tokens (e.g., after a background refresh).
     */
    setTokens(state, action: PayloadAction<AuthTokens>) {
      state.tokens = action.payload;
      // Also update localStorage
      if (state.user) {
        saveAuthToStorage(state.user, action.payload);
      }
    },

    /**
     * Force logout without calling the API.
     * Used when we detect the session is invalid (e.g., 401 from refresh).
     */
    forceLogout(state) {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;
      clearAuthFromStorage();
    },

    /**
     * Resets the entire auth state to initial values.
     * Used during testing or hard reset scenarios.
     */
    resetAuthState() {
      clearAuthFromStorage();
      return { ...initialState, isInitialized: true };
    },
  },

  extraReducers: (builder) => {
    // ---- Login ----
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        login.fulfilled,
        (state, action: PayloadAction<AuthResponse>) => {
          state.isLoading = false;
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.tokens = action.payload.tokens;
          state.error = null;
        },
      )
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = action.payload || "Login failed";
      });

    // ---- Register ----
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.registerSuccess = false;
      })
      .addCase(
        register.fulfilled,
        (state, action: PayloadAction<AuthResponse>) => {
          state.isLoading = false;
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.tokens = action.payload.tokens;
          state.error = null;
          state.registerSuccess = true;
        },
      )
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = action.payload || "Registration failed";
        state.registerSuccess = false;
      });

    // ---- Logout ----
    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        // Even on logout failure, clear the local state
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = null;
      });

    // ---- Fetch Current User ----
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        fetchCurrentUser.fulfilled,
        (state, action: PayloadAction<AuthUser>) => {
          state.isLoading = false;
          state.user = action.payload;
          state.isAuthenticated = true;
          state.error = null;
        },
      )
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = action.payload || "Failed to fetch user data";
      });

    // ---- Refresh Tokens ----
    builder
      .addCase(
        refreshTokens.fulfilled,
        (state, action: PayloadAction<AuthTokens>) => {
          state.tokens = action.payload;
        },
      )
      .addCase(refreshTokens.rejected, (state) => {
        // Token refresh failed — force logout
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = "Session expired. Please log in again.";
      });

    // ---- Change Password ----
    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        // After password change, user must re-login
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to change password";
      });

    // ---- Initialize Auth ----
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;

        if (action.payload) {
          state.user = action.payload.user;
          state.tokens = action.payload.tokens;
          state.isAuthenticated = true;
        } else {
          state.user = null;
          state.tokens = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
      });
  },
});

// ============================================
// Export Actions & Reducer
// ============================================

export const {
  clearError,
  clearRegisterSuccess,
  setUser,
  setTokens,
  forceLogout,
  resetAuthState,
} = authSlice.actions;

export default authSlice.reducer;

// ============================================
// Selectors
// ============================================

/**
 * Select the entire auth state object.
 */
export const selectAuth = (state: { auth: AuthState }) => state.auth;

/**
 * Select the authenticated user object.
 */
export const selectUser = (state: { auth: AuthState }) => state.auth.user;

/**
 * Select whether the user is authenticated.
 */
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.isAuthenticated;

/**
 * Select whether auth initialization has completed.
 */
export const selectIsInitialized = (state: { auth: AuthState }) =>
  state.auth.isInitialized;

/**
 * Select whether an auth operation is in progress.
 */
export const selectIsLoading = (state: { auth: AuthState }) =>
  state.auth.isLoading;

/**
 * Select the current auth error message.
 */
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

/**
 * Select the user's role.
 */
export const selectUserRole = (state: { auth: AuthState }) =>
  state.auth.user?.role ?? null;

/**
 * Select the access token.
 */
export const selectAccessToken = (state: { auth: AuthState }) =>
  state.auth.tokens?.accessToken ?? null;

/**
 * Select whether the user has one of the specified roles.
 */
export const selectHasRole =
  (...roles: string[]) =>
  (state: { auth: AuthState }) => {
    const userRole = state.auth.user?.role;
    return userRole ? roles.includes(userRole) : false;
  };

/**
 * Select whether the user is an admin.
 */
export const selectIsAdmin = (state: { auth: AuthState }) =>
  state.auth.user?.role === "ADMIN";

/**
 * Select whether the user is HR.
 */
export const selectIsHR = (state: { auth: AuthState }) =>
  state.auth.user?.role === "HR";

/**
 * Select whether the user is an admin or HR.
 */
export const selectIsAdminOrHR = (state: { auth: AuthState }) => {
  const role = state.auth.user?.role;
  return role === "ADMIN" || role === "HR";
};

/**
 * Select the user's display name (first + last name from employee profile).
 */
export const selectDisplayName = (state: { auth: AuthState }) => {
  const employee = state.auth.user?.employee;
  if (employee) {
    return `${employee.firstName} ${employee.lastName}`.trim();
  }
  if (state.auth.user?.email === "admin@hrms.com") {
    return "Abhishek Mishra";
  }
  return state.auth.user?.email ?? "User";
};

/**
 * Select the user's initials (for avatar fallback).
 */
export const selectUserInitials = (state: { auth: AuthState }) => {
  const employee = state.auth.user?.employee;
  if (employee) {
    const first = employee.firstName?.[0] ?? "";
    const last = employee.lastName?.[0] ?? "";
    return `${first}${last}`.toUpperCase();
  }
  const email = state.auth.user?.email;
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
};

/**
 * Select the user's avatar URL.
 */
export const selectUserAvatar = (state: { auth: AuthState }) =>
  state.auth.user?.employee?.avatar ?? null;

/**
 * Select the user's employee ID (the linked employee record's UUID).
 */
export const selectEmployeeId = (state: { auth: AuthState }) =>
  state.auth.user?.employee?.id ?? null;
