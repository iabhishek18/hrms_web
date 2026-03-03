// ============================================
// App Component — Root Route Configuration
// ============================================
// Defines all application routes using React Router v6.
// Pages are lazy-loaded with React.lazy() for code splitting,
// which reduces the initial bundle size by loading page
// components only when they are navigated to.
//
// Route Structure:
//   /login          → Login page (public)
//   /register       → Register page (public)
//   /dashboard      → Dashboard (protected)
//   /employees      → Employee list (protected)
//   /employees/:id  → Employee detail (protected)
//   /departments    → Department list (protected)
//   /leave          → Leave management (protected)
//   /attendance     → Attendance management (protected)
//   /reports        → Reports & analytics (protected)
//   /documents      → Document management (protected)
//   /profile        → User profile (protected)
//   /settings       → System settings (protected, admin)
//   *               → 404 Not Found

import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { AuthLayout } from "@/layouts/AuthLayout";

// ============================================
// Lazy-loaded Page Components
// ============================================
// React.lazy enables code splitting — each page is loaded
// as a separate JavaScript chunk only when the user navigates
// to that route. This significantly improves initial load time.

// Auth pages
const LoginPage = React.lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = React.lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = React.lazy(
  () => import("@/pages/auth/ForgotPasswordPage"),
);

// Dashboard
const DashboardPage = React.lazy(
  () => import("@/pages/dashboard/DashboardPage"),
);

// Employees
const EmployeeListPage = React.lazy(
  () => import("@/pages/employees/EmployeeListPage"),
);
const EmployeeDetailPage = React.lazy(
  () => import("@/pages/employees/EmployeeDetailPage"),
);

// Departments
const DepartmentListPage = React.lazy(
  () => import("@/pages/departments/DepartmentListPage"),
);

// Leave
const LeaveListPage = React.lazy(() => import("@/pages/leave/LeavePage"));

// Attendance
const AttendanceListPage = React.lazy(
  () => import("@/pages/attendance/AttendanceListPage"),
);

// Profile
const ProfilePage = React.lazy(() => import("@/pages/profile/ProfilePage"));

// Settings
const SettingsPage = React.lazy(() => import("@/pages/settings/SettingsPage"));

// ============================================
// Loading Fallback Component
// ============================================
// Shown while a lazy-loaded page component is being fetched.
// Uses a subtle loading indicator that matches the dark theme.

function PageLoader() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200 dark:border-dark-700" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary-500" />
        </div>
        {/* Loading text */}
        <p className="text-sm text-gray-500 dark:text-dark-400">
          Loading page…
        </p>
      </div>
    </div>
  );
}

// ============================================
// 404 Not Found Page
// ============================================
// Inline component for routes that don't match any defined path.

function NotFoundPage() {
  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-4">
      {/* Large 404 text */}
      <div className="text-center">
        <h1 className="text-7xl font-bold text-gray-300 dark:text-dark-700">
          404
        </h1>
        <h2 className="mt-2 text-xl font-semibold text-gray-700 dark:text-dark-300">
          Page Not Found
        </h2>
        <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-dark-500">
          The page you're looking for doesn't exist or has been moved. Please
          check the URL or navigate back to the dashboard.
        </p>
      </div>

      {/* Navigation buttons */}
      <div className="mt-4 flex items-center gap-3">
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          </svg>
          Go to Dashboard
        </a>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700 dark:hover:text-dark-100"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          Go Back
        </button>
      </div>
    </div>
  );
}

// ============================================
// App Component
// ============================================

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ============================================ */}
        {/* Public Routes (Auth Layout)                  */}
        {/* ============================================ */}
        {/* These routes use the AuthLayout which provides */}
        {/* a branded split-screen layout for login/register. */}
        {/* If the user is already authenticated, they are */}
        {/* redirected to the dashboard by the AuthLayout. */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* ============================================ */}
        {/* Protected Routes (Dashboard Layout)          */}
        {/* ============================================ */}
        {/* These routes use the DashboardLayout which provides */}
        {/* the sidebar, navbar, and auth protection. If the */}
        {/* user is not authenticated, they are redirected */}
        {/* to the login page by the DashboardLayout. */}
        <Route element={<DashboardLayout />}>
          {/* Dashboard — main overview page */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Employee Management */}
          <Route path="/employees" element={<EmployeeListPage />} />
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />

          {/* Department Management */}
          <Route path="/departments" element={<DepartmentListPage />} />

          {/* Leave Management */}
          <Route path="/leave" element={<LeaveListPage />} />

          {/* Attendance Management */}
          <Route path="/attendance" element={<AttendanceListPage />} />

          {/* User Profile */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* System Settings (Admin only — enforced in the page component) */}
          <Route path="/settings" element={<SettingsPage />} />

          {/* 404 inside dashboard layout */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* ============================================ */}
        {/* Root Redirect                                */}
        {/* ============================================ */}
        {/* Redirect the root URL to the dashboard. */}
        {/* If not authenticated, DashboardLayout will */}
        {/* redirect to /login automatically. */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ============================================ */}
        {/* Catch-all 404 (outside layouts)              */}
        {/* ============================================ */}
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-950">
              <NotFoundPage />
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
