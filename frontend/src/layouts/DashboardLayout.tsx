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

import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { CommandPalette } from "@/components/common/CommandPalette";
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

// ============================================
// Footer Modal Content
// ============================================

const FOOTER_MODAL_CONTENT: Record<
  string,
  { title: string; content: React.ReactNode }
> = {
  privacy: {
    title: "Privacy Policy",
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <p className="text-gray-500 dark:text-dark-400 text-xs">
          Last updated: January 2025
        </p>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            1. Information We Collect
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            HRMSLite collects personal information necessary for human resource
            management, including but not limited to: employee names, contact
            details, employment records, attendance data, leave records, and
            performance evaluations. This data is provided by your
            organization's administrators.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            2. How We Use Your Information
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            We use collected information to provide HR management services,
            process attendance and leave management, generate reports, and
            improve our platform. We do not sell or share your personal data
            with third parties for marketing purposes.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            3. Data Security
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            We implement industry-standard security measures including
            encryption (TLS/SSL), secure authentication (JWT tokens), and
            regular security audits to protect your data. Access to personal
            information is restricted to authorized personnel only.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            4. Data Retention
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            Employee data is retained for the duration of employment and in
            accordance with applicable labor laws. Upon account deletion or
            termination, personal data is removed within 90 days, except where
            legally required to be retained.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            5. Your Rights
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            You have the right to access, correct, or request deletion of your
            personal data. Contact your organization's HR administrator or our
            support team to exercise these rights.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            6. Contact
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            For privacy-related inquiries, please contact us at{" "}
            <span className="text-primary-600 dark:text-primary-400">
              privacy@hrmslite.com
            </span>
            .
          </p>
        </section>
      </div>
    ),
  },
  terms: {
    title: "Terms of Service",
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <p className="text-gray-500 dark:text-dark-400 text-xs">
          Effective: January 2025
        </p>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            1. Acceptance of Terms
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            By accessing and using HRMSLite, you agree to be bound by these
            Terms of Service. If you do not agree to these terms, please do not
            use the platform.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            2. Service Description
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            HRMSLite is a web-based Human Resource Management System that
            provides employee management, attendance tracking, leave management,
            department organization, and reporting features.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            3. User Accounts
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            You are responsible for maintaining the confidentiality of your
            login credentials. You must not share your account with others.
            Notify your administrator immediately if you suspect unauthorized
            access to your account.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            4. Acceptable Use
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            You agree to use HRMSLite only for lawful purposes related to human
            resource management. You must not attempt to gain unauthorized
            access, disrupt the service, or use the platform for any purpose
            other than its intended HR functions.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            5. Data Accuracy
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            Users and administrators are responsible for ensuring the accuracy
            of information entered into the system. HRMSLite is not liable for
            decisions made based on incorrect data input.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            6. Limitation of Liability
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            HRMSLite is provided "as is" without warranties of any kind. We
            shall not be liable for any indirect, incidental, or consequential
            damages arising from your use of the platform.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            7. Changes to Terms
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            We reserve the right to modify these terms at any time. Continued
            use of the platform after changes constitutes acceptance of the
            updated terms.
          </p>
        </section>
      </div>
    ),
  },
  support: {
    title: "Support & Help Center",
    content: (
      <div className="space-y-5 text-sm leading-relaxed">
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Need Help?
          </h3>
          <p className="text-gray-600 dark:text-dark-300">
            Our support team is here to assist you with any questions or issues
            you may encounter while using HRMSLite.
          </p>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            Contact Us
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-dark-700 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/10">
                <svg
                  className="h-4 w-4 text-primary-600 dark:text-primary-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-xs">
                  Email Support
                </p>
                <p className="text-primary-600 dark:text-primary-400 text-xs">
                  support@hrmslite.com
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-dark-700 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-500/10">
                <svg
                  className="h-4 w-4 text-success-600 dark:text-success-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-xs">
                  Phone Support
                </p>
                <p className="text-gray-600 dark:text-dark-300 text-xs">
                  +1 (555) 123-4567
                </p>
                <p className="text-gray-400 dark:text-dark-500 text-2xs">
                  Mon–Fri, 9 AM – 6 PM IST
                </p>
              </div>
            </div>
          </div>
        </section>
        <section>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            FAQs
          </h3>
          <div className="space-y-3">
            <details className="group rounded-lg border border-gray-200 dark:border-dark-700">
              <summary className="flex cursor-pointer items-center justify-between p-3 text-xs font-medium text-gray-900 dark:text-white">
                How do I reset my password?
                <svg
                  className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </summary>
              <p className="px-3 pb-3 text-xs text-gray-600 dark:text-dark-300">
                Navigate to your Profile page, select the Security tab, and use
                the Change Password form. If you've forgotten your password, use
                the "Forgot Password" link on the login page.
              </p>
            </details>
            <details className="group rounded-lg border border-gray-200 dark:border-dark-700">
              <summary className="flex cursor-pointer items-center justify-between p-3 text-xs font-medium text-gray-900 dark:text-white">
                How do I apply for leave?
                <svg
                  className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </summary>
              <p className="px-3 pb-3 text-xs text-gray-600 dark:text-dark-300">
                Go to the Leave Management page from the sidebar, click "Apply
                for Leave", fill in the required details including leave type,
                dates, and reason, then submit your request for approval.
              </p>
            </details>
            <details className="group rounded-lg border border-gray-200 dark:border-dark-700">
              <summary className="flex cursor-pointer items-center justify-between p-3 text-xs font-medium text-gray-900 dark:text-white">
                How do I mark attendance?
                <svg
                  className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </summary>
              <p className="px-3 pb-3 text-xs text-gray-600 dark:text-dark-300">
                Navigate to the Attendance page from the sidebar. If you're an
                admin or HR, you can mark attendance for all employees.
                Individual employees can check in/out from their dashboard.
              </p>
            </details>
            <details className="group rounded-lg border border-gray-200 dark:border-dark-700">
              <summary className="flex cursor-pointer items-center justify-between p-3 text-xs font-medium text-gray-900 dark:text-white">
                Who can I contact for technical issues?
                <svg
                  className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </summary>
              <p className="px-3 pb-3 text-xs text-gray-600 dark:text-dark-300">
                For technical issues, email us at support@hrmslite.com or call
                our support line during business hours. Please include your
                employee ID and a description of the issue for faster
                resolution.
              </p>
            </details>
          </div>
        </section>
      </div>
    ),
  },
};

// ============================================
// Footer Modal Component
// ============================================

function FooterModal({
  modalKey,
  onClose,
  isDark,
}: {
  modalKey: string | null;
  onClose: () => void;
  isDark: boolean;
}) {
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (modalKey) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimating(true);
        });
      });
      return undefined;
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [modalKey]);

  useEffect(() => {
    if (modalKey) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [modalKey]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (modalKey) {
      document.addEventListener("keydown", handleEsc);
      return () => document.removeEventListener("keydown", handleEsc);
    }
    return undefined;
  }, [modalKey, onClose]);

  if (!visible || !modalKey) return null;

  const content = FOOTER_MODAL_CONTENT[modalKey];
  if (!content) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[90] flex items-center justify-center p-4 transition-all duration-200",
        animating ? "opacity-100" : "opacity-0",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={content.title}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-200",
          isDark ? "bg-black/60" : "bg-black/40",
          animating ? "backdrop-blur-sm" : "",
        )}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-xl border shadow-2xl transition-all duration-200 flex flex-col",
          isDark ? "border-dark-700 bg-dark-900" : "border-gray-200 bg-white",
          animating
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-95 opacity-0",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between border-b px-5 py-4 flex-shrink-0",
            isDark ? "border-dark-700" : "border-gray-200",
          )}
        >
          <h2
            className={cn(
              "text-base font-semibold",
              isDark ? "text-white" : "text-gray-900",
            )}
          >
            {content.title}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              isDark
                ? "text-dark-400 hover:bg-dark-700 hover:text-dark-200"
                : "text-gray-400 hover:bg-gray-100 hover:text-gray-600",
            )}
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {content.content}
        </div>

        {/* Footer */}
        <div
          className={cn(
            "flex items-center justify-end border-t px-5 py-3 flex-shrink-0",
            isDark ? "border-dark-700" : "border-gray-200",
          )}
        >
          <button
            onClick={onClose}
            className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
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

  // Footer modal state
  const [footerModal, setFooterModal] = useState<string | null>(null);
  const handleOpenFooterModal = useCallback((key: string) => {
    setFooterModal(key);
  }, []);
  const handleCloseFooterModal = useCallback(() => {
    setFooterModal(null);
  }, []);

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

      {/* ---- Command Palette / Search Modal ---- */}
      <CommandPalette />

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
          {/* Inner flex column so footer is always pushed to the bottom */}
          <div className="flex flex-col" style={{ minHeight: "100%" }}>
            {/* Content padding wrapper — responsive padding via CSS variables */}
            <div
              className="mx-auto w-full max-w-[1600px] flex-1"
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

            {/* ---- Footer ---- */}
            <footer
              className={cn(
                "w-full border-t mt-auto flex-shrink-0",
                isDark
                  ? "border-dark-800 bg-dark-950/80"
                  : "border-gray-200 bg-white/60 backdrop-blur-sm",
              )}
            >
              <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 md:px-8">
                {/* Main footer content */}
                <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-4">
                  {/* Left: Brand & Copyright */}
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md",
                          "bg-primary-600",
                        )}
                      >
                        <span className="text-2xs font-bold text-white">
                          HR
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isDark ? "text-dark-200" : "text-gray-700",
                        )}
                      >
                        HRMSLite
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-xs",
                        isDark ? "text-dark-500" : "text-gray-400",
                      )}
                    >
                      © {new Date().getFullYear()} HRMSLite. All rights
                      reserved.
                    </span>
                  </div>

                  {/* Center: Links (visible on sm+) */}
                  <div className="hidden sm:flex sm:items-center sm:gap-4 md:gap-6">
                    {[
                      { label: "Privacy Policy", key: "privacy" },
                      { label: "Terms of Service", key: "terms" },
                      { label: "Support", key: "support" },
                    ].map((link) => (
                      <button
                        key={link.label}
                        onClick={() => handleOpenFooterModal(link.key)}
                        className={cn(
                          "text-xs font-medium transition-colors cursor-pointer",
                          isDark
                            ? "text-dark-400 hover:text-dark-200"
                            : "text-gray-500 hover:text-gray-700",
                        )}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>

                  {/* Right: Version & status */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span
                          className={cn(
                            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                            "bg-success-400",
                          )}
                        />
                        <span
                          className={cn(
                            "relative inline-flex h-2 w-2 rounded-full",
                            "bg-success-500",
                          )}
                        />
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          isDark ? "text-dark-400" : "text-gray-500",
                        )}
                      >
                        System Online
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-2xs font-medium rounded-full px-2 py-0.5",
                        isDark
                          ? "bg-dark-800 text-dark-400"
                          : "bg-gray-100 text-gray-500",
                      )}
                    >
                      v1.0.0
                    </span>
                  </div>
                </div>

                {/* Mobile links row */}
                <div
                  className={cn(
                    "flex items-center justify-center gap-4 border-t pb-4 pt-3 sm:hidden",
                    isDark ? "border-dark-800" : "border-gray-100",
                  )}
                >
                  {[
                    { label: "Privacy", key: "privacy" },
                    { label: "Terms", key: "terms" },
                    { label: "Support", key: "support" },
                  ].map((link) => (
                    <button
                      key={link.label}
                      onClick={() => handleOpenFooterModal(link.key)}
                      className={cn(
                        "text-xs font-medium transition-colors cursor-pointer",
                        isDark
                          ? "text-dark-400 hover:text-dark-200"
                          : "text-gray-500 hover:text-gray-700",
                      )}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>
            </footer>

            {/* Bottom safe area spacer for mobile devices with home indicator */}
            <div
              className="w-full sm:hidden flex-shrink-0"
              style={{ height: "var(--safe-area-bottom, 0px)" }}
              aria-hidden="true"
            />
          </div>
          {/* End inner flex column */}
        </main>
      </div>

      {/* Footer Modal */}
      <FooterModal
        modalKey={footerModal}
        onClose={handleCloseFooterModal}
        isDark={isDark}
      />
    </div>
  );
}

export default DashboardLayout;
