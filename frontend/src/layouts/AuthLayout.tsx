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

// ============================================
// Auth Layout Component
// ============================================

export function AuthLayout() {
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isInitialized = useAppSelector((state) => state.auth.isInitialized);

  // ---- Redirect to Dashboard if Already Authenticated ----
  // If the user navigates to /login or /register while already
  // logged in, redirect them to the dashboard instead.
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isInitialized, navigate]);

  return (
    <div className="flex min-h-screen w-full bg-gray-50 dark:bg-dark-950">
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
      <div className="flex w-full flex-col items-center justify-center px-4 py-8 sm:px-8 lg:w-1/2">
        {/* Mobile logo (shown only on small screens) */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-600 shadow-lg shadow-primary-600/30">
            <span className="text-xl font-bold text-white">HR</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            HRMSLite
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
            Human Resource Management System
          </p>
        </div>

        {/* Auth form container */}
        <div className="w-full max-w-md">
          {/*
            Outlet renders the matched child route component.
            Login and Register page components are rendered here.
          */}
          <Outlet />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 dark:text-dark-500">
            Protected by enterprise-grade security · JWT Authentication
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
