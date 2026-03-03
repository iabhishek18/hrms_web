// ============================================
// Redux Store Configuration
// ============================================
// Configures the Redux Toolkit store with all application slices,
// middleware, and type definitions for the HRMS frontend.

import { configureStore, combineReducers } from "@reduxjs/toolkit";

import authReducer from "./slices/authSlice";
import dashboardReducer from "./slices/dashboardSlice";
import employeeReducer from "./slices/employeeSlice";
import leaveReducer from "./slices/leaveSlice";
import attendanceReducer from "./slices/attendanceSlice";
import departmentReducer from "./slices/departmentSlice";
import settingsReducer from "./slices/settingsSlice";
import uiReducer from "./slices/uiSlice";

// ============================================
// Root Reducer
// ============================================
// Combines all feature slices into a single root reducer.
// Each slice manages its own portion of the state tree.

const rootReducer = combineReducers({
  // Authentication state (user info, tokens, login status)
  auth: authReducer,

  // Dashboard state (stats, charts, top performers, etc.)
  dashboard: dashboardReducer,

  // Employee management state (list, selected employee, filters)
  employees: employeeReducer,

  // Leave management state (requests, balances, filters)
  leaves: leaveReducer,

  // Attendance state (records, today's status, summaries)
  attendance: attendanceReducer,

  // Department management state (list, selected, CRUD)
  departments: departmentReducer,

  // System settings state (key-value pairs, grouped by category)
  settings: settingsReducer,

  // UI state (sidebar collapsed, theme, modals, loading states)
  ui: uiReducer,
});

// ============================================
// Store Configuration
// ============================================

export const store = configureStore({
  reducer: rootReducer,

  // Middleware configuration
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable serializable check for Date objects in state
      // Prisma returns Date objects that Redux Toolkit flags as non-serializable
      serializableCheck: {
        ignoredActions: [
          "auth/loginFulfilled",
          "auth/registerFulfilled",
          "dashboard/fetchDashboardFulfilled",
          "employees/fetchEmployeesFulfilled",
          "leaves/fetchLeavesFulfilled",
          "attendance/fetchAttendanceFulfilled",
          "departments/fetchDepartmentsFulfilled",
          "settings/fetchSettingsFulfilled",
        ],
        ignoredPaths: [
          "auth.user.lastLogin",
          "auth.user.employee.joiningDate",
          "employees.list",
          "leaves.list",
          "attendance.list",
          "dashboard.data",
          "departments.list",
          "settings.list",
        ],
      },
      // Enable immutability checks in development
      immutableCheck: import.meta.env.MODE !== "production",
    }),

  // Enable Redux DevTools only in development
  devTools: import.meta.env.MODE !== "production",
});

// ============================================
// Type Definitions
// ============================================

/**
 * RootState — The complete shape of the Redux store.
 * Use this type when selecting state in components:
 *
 *   const user = useSelector((state: RootState) => state.auth.user);
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * AppDispatch — The typed dispatch function.
 * Use this type when dispatching actions with thunks:
 *
 *   const dispatch = useDispatch<AppDispatch>();
 *   dispatch(fetchEmployees({ page: 1, limit: 10 }));
 */
export type AppDispatch = typeof store.dispatch;

/**
 * AppStore — The store type itself.
 * Rarely used directly, but available for advanced use cases
 * like store enhancers or middleware that needs the store type.
 */
export type AppStore = typeof store;

export default store;
