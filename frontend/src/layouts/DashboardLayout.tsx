// ============================================
// Dashboard Layout — Enhanced Responsive Design
// ============================================
// Main layout wrapper for all authenticated pages.
// Provides the sidebar, top navbar, and a scrollable
// main content area. Handles auth initialization,
// route protection, and responsive behavior.
//
// Responsive Features:
//   - Mobile: Full-width content, hamburger sidebar
//   - Tablet: Collapsible sidebar with overlay
//   - Desktop: Persistent sidebar with adjustable width
//   - Safe area insets for notched devices
//   - Smooth layout transitions
//   - Skip-to-content accessibility link
//
// Structure:
//   ┌──────────┬─────────────────────────────┐
//   │          │  Navbar                      │
//   │          ├─────────────────────────────┤
//   │ Sidebar  │                             │
//   │          │  Main Content (scrollable)  │
//   │          │                             │
//   └──────────┴─────────────────────────────┘

import { useEffect, useState, useCallback, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { selectSidebarCollapsed } from "@/store/slices/uiSlice";
import { setPageTitle } from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";

// ============================================
// Auth imports
// ============================================
// We use the auth slice directly rather than the useAuth hook
// to avoid circular dependency issues with the navigate hook.
import {
  initializeAuth,
  logout as logoutThunk,
} from "@/store/slices/authSlice";

// ============================================
// Page title mapping
// ============================================
// Maps route paths to page titles for the navbar breadcrumb
// and document <title> tag.

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard" },
  "/employees": { title: "Employees", subtitle: "Employee Management" },
  "/departments": { title: "Departments", subtitle: "Department Management" },
  "/leave": { title: "Leave", subtitle: "Leave Management" },
  "/attendance": { title: "Attendance", subtitle: "Attendance Management" },
  "/reports": { title: "Reports", subtitle: "Analytics & Reports" },
  "/documents": { title: "Documents", subtitle: "Document Management" },
  "/profile": { title: "Profile", subtitle: "My Profile" },
  "/settings": { title: "Settings", subtitle: "System Settings" },
};

// ============================================
// Loading Spinner Component
// ============================================
// Shown while the auth state is being initialized
// (checking localStorage for existing tokens and
// validating them with the backend).

function AuthLoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 dark:bg-dark-900 px-4">
      <div className="flex flex-col items-center gap-4">
        {/* Animated logo */}
        <div className="relative">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-600/30">
            <span className="text-lg sm:text-xl font-bold text-white">HR</span>
          </div>
          {/* Spinning ring around the logo */}
          <div className="absolute -inset-2 animate-spin-slow rounded-xl border-2 border-transparent border-t-primary-400" />
        </div>

        {/* Loading text */}
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-dark-200">
            Loading HRMSLite...
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-500">
            Verifying your session
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-500 animation-delay-100" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-500 animation-delay-300" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-500 animation-delay-500" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Dashboard Layout Component
// ============================================

export function DashboardLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const mainContentRef = useRef<HTMLElement>(null);

  // Auth state from Redux
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  // UI state
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);
  const resolvedTheme = useAppSelector((state) => state.ui.resolvedTheme);
  const isDark = resolvedTheme === "dark";

  // Local state for tracking auth initialization
  const [authChecked, setAuthChecked] = useState(false);

  // ---- Initialize Auth on Mount ----
  // Check localStorage for existing tokens and validate them.
  // If valid, the user is automatically logged in.
  // If invalid or missing, redirect to the login page.
  useEffect(() => {
    async function checkAuth() {
      try {
        await dispatch(initializeAuth()).unwrap();
      } catch {
        // initializeAuth failed — user is not authenticated
        // The rejected handler in the slice sets isInitialized = true
      } finally {
        setAuthChecked(true);
      }
    }

    if (!isInitialized && !authChecked) {
      checkAuth();
    } else {
      setAuthChecked(true);
    }
  }, [dispatch, isInitialized, authChecked]);

  // ---- Redirect to Login if Not Authenticated ----
  // Wait until auth initialization is complete before redirecting.
  useEffect(() => {
    if (authChecked && isInitialized && !isAuthenticated) {
      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [
    authChecked,
    isInitialized,
    isAuthenticated,
    navigate,
    location.pathname,
  ]);

  // ---- Update Page Title Based on Route ----
  useEffect(() => {
    // Find the matching page title config
    // Try exact match first, then prefix match for nested routes
    const exactMatch = PAGE_TITLES[location.pathname];

    if (exactMatch) {
      dispatch(setPageTitle(exactMatch));
    } else {
      // Try prefix matching (e.g., /employees/123 -> /employees)
      const matchingKey = Object.keys(PAGE_TITLES).find((key) =>
        location.pathname.startsWith(key),
      );

      if (matchingKey) {
        dispatch(setPageTitle(PAGE_TITLES[matchingKey]));
      } else {
        // Default title
        dispatch(setPageTitle({ title: "HRMSLite" }));
      }
    }
  }, [location.pathname, dispatch]);

  // ---- Scroll to top on route change ----
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.pathname]);

  // ---- Logout Handler ----
  // Called from the Navbar user dropdown menu.
  const handleLogout = useCallback(async () => {
    try {
      await dispatch(logoutThunk()).unwrap();
    } catch {
      // Even if the API call fails, the slice clears local state
    }
    navigate("/login", { replace: true });
  }, [dispatch, navigate]);

  // ---- Skip to main content handler ----
  const handleSkipToContent = useCallback(() => {
    mainContentRef.current?.focus();
    mainContentRef.current?.scrollTo({ top: 0 });
  }, []);

  // ---- Show loading screen while checking auth ----
  if (!authChecked || !isInitialized || isLoading) {
    return <AuthLoadingScreen />;
  }

  // ---- Don't render layout if not authenticated ----
  // (The useEffect above will redirect to login)
  if (!isAuthenticated) {
    return <AuthLoadingScreen />;
  }

  // ---- Render the Dashboard Layout ----
  return (
    <div
      className={cn(
        "flex h-screen w-screen overflow-hidden",
        isDark ? "bg-dark-950 text-dark-100" : "bg-gray-50 text-gray-900",
      )}
    >
      {/* ---- Skip to Content Link (Accessibility) ---- */}
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          handleSkipToContent();
        }}
        className="skip-link"
      >
        Skip to main content
      </a>

      {/* ---- Sidebar ---- */}
      <Sidebar />

      {/* ---- Main Content Area ---- */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* ---- Top Navbar ---- */}
        <Navbar onLogout={handleLogout} />

        {/* ---- Scrollable Content ---- */}
        <main
          ref={mainContentRef}
          id="main-content"
          tabIndex={-1}
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin focus:outline-none",
            isDark ? "bg-dark-950" : "bg-gray-50",
          )}
        >
          {/* Content padding wrapper — responsive padding via CSS variables */}
          <div
            className="mx-auto w-full max-w-[1600px]"
            style={{
              padding: "var(--page-padding-y) var(--page-padding-x)",
            }}
          >
            {/*
              Outlet renders the matched child route component.
              All page components (Dashboard, Employees, Leave, etc.)
              are rendered inside this Outlet.
            */}
            <Outlet />
          </div>

          {/* Bottom safe area spacer for mobile devices with home indicator */}
          <div
            className="w-full sm:hidden"
            style={{ height: "var(--safe-area-bottom, 0px)" }}
            aria-hidden="true"
          />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
