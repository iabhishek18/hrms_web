// ============================================
// Auth Layout
// ============================================
// Layout wrapper for authentication pages (Login, Register).
// Provides a centered card design with a branded sidebar
// panel on larger screens, similar to modern SaaS login pages.
//
// Structure (large screens):
//   ┌──────────────────┬─────────────────────┐
//   │                  │                     │
//   │  Brand Panel     │   Auth Form Card    │
//   │  (gradient bg)   │   (centered)        │
//   │                  │                     │
//   └──────────────────┴─────────────────────┘
//
// Structure (small screens):
//   ┌───────────────────────────────────────┐
//   │         Auth Form Card               │
//   │         (full-width, centered)        │
//   └───────────────────────────────────────┘

import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/hooks/useRedux";
import { selectResolvedTheme } from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";

// ============================================
// Auth Layout Component
// ============================================

export function AuthLayout() {
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isDark = resolvedTheme === "dark";

  // ---- Redirect to Dashboard if Already Authenticated ----
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isInitialized, navigate]);

  return (
    <div
      className={cn(
        "flex min-h-[100dvh] w-full",
        isDark ? "bg-dark-950" : "bg-gray-100",
      )}
    >
      {/* ---- Left Brand Panel (visible on lg+ screens) ---- */}
      <div className="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-dark-900 to-primary-950" />

        {/* Decorative pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Floating decorative circles */}
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-primary-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-accent-600/10 blur-3xl" />
        <div className="absolute left-1/4 top-1/3 h-40 w-40 rounded-full bg-primary-500/5 blur-2xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center px-12 text-center">
          {/* Logo */}
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-600 shadow-xl shadow-primary-600/30">
            <span className="text-3xl font-bold text-white">HR</span>
          </div>

          {/* Title */}
          <h1 className="mb-3 text-4xl font-bold text-white">HRMSLite</h1>
          <p className="mb-10 max-w-sm text-lg text-primary-200/70">
            Modern Human Resource Management System for growing teams
          </p>

          {/* Feature highlights */}
          <div className="flex flex-col gap-4 text-left">
            {[
              {
                icon: "👥",
                title: "Employee Management",
                desc: "Manage your entire workforce in one place",
              },
              {
                icon: "📊",
                title: "Analytics Dashboard",
                desc: "Real-time insights and performance metrics",
              },
              {
                icon: "🏖️",
                title: "Leave & Attendance",
                desc: "Streamlined leave requests and time tracking",
              },
              {
                icon: "🔐",
                title: "Role-Based Access",
                desc: "Secure access control for Admin, HR & Employees",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3.5 rounded-xl bg-white/5 px-5 py-3.5 backdrop-blur-sm"
              >
                <span className="mt-0.5 text-xl">{feature.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-primary-200/60">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom attribution */}
          <p className="mt-12 text-xs text-primary-200/30">
            © {new Date().getFullYear()} HRMSLite. Built with React, TypeScript
            & Tailwind CSS.
          </p>
        </div>
      </div>

      {/* ---- Right Auth Form Panel ---- */}
      <div
        className={cn(
          "relative flex w-full flex-col items-center justify-between px-4 py-6 sm:px-8 sm:py-8 lg:w-1/2 lg:justify-center",
          "min-h-[100dvh] lg:min-h-0",
          isDark
            ? "bg-dark-950"
            : "bg-gradient-to-br from-gray-50 via-white to-gray-100",
        )}
      >
        {/* Subtle decorative elements for light mode */}
        {!isDark && (
          <>
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary-100/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-accent-100/30 blur-3xl" />
          </>
        )}

        {/* Spacer for top on mobile (pushes content down slightly) */}
        <div className="flex-shrink-0 lg:hidden" aria-hidden="true" />

        {/* Mobile logo (shown only on small screens) */}
        <div className="relative z-10 mb-6 sm:mb-8 flex flex-col items-center lg:hidden">
          <div className="mb-3 sm:mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-600/30">
            <span className="text-lg sm:text-xl font-bold text-white">HR</span>
          </div>
          <h1
            className={cn(
              "text-xl sm:text-2xl font-bold",
              isDark ? "text-white" : "text-gray-900",
            )}
          >
            HRMSLite
          </h1>
          <p
            className={cn(
              "mt-1 text-xs sm:text-sm",
              isDark ? "text-dark-400" : "text-gray-500",
            )}
          >
            Human Resource Management System
          </p>
        </div>

        {/* Auth form container */}
        <div
          className={cn(
            "relative z-10 w-full max-w-md rounded-2xl p-5 sm:p-6 md:p-8",
            isDark
              ? "bg-transparent"
              : "bg-white/80 shadow-xl shadow-gray-200/50 ring-1 ring-gray-200/60 backdrop-blur-sm",
          )}
        >
          {/*
            Outlet renders the matched child route component.
            Login and Register page components are rendered here.
          */}
          <Outlet />
        </div>

        {/* Footer — always visible, never cropped */}
        <div className="relative z-10 mt-6 sm:mt-8 pb-2 flex-shrink-0 text-center w-full">
          <p
            className={cn(
              "text-2xs sm:text-xs leading-relaxed",
              isDark ? "text-dark-500" : "text-gray-400",
            )}
          >
            Protected by enterprise-grade security · JWT Authentication
          </p>
          <p
            className={cn(
              "mt-1.5 text-2xs",
              isDark ? "text-dark-600" : "text-gray-300",
            )}
          >
            © {new Date().getFullYear()} HRMSLite. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
