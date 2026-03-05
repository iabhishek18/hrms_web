// ============================================
// Login Page — Enhanced with Email Autocomplete
// ============================================
// Provides email/password login form with:
//   - Email autocomplete/suggestions as user types
//   - Form validation using React Hook Form + Zod
//   - Error handling with user-friendly messages
//   - Loading state during authentication
//   - Demo credentials display for easy testing
//   - Link to registration page
//   - Dark theme matching the reference dashboard

import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import { login, clearError } from "@/store/slices/authSlice";
import { cn } from "@/utils/cn";
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUserCircle,
  HiOutlineShieldCheck,
} from "react-icons/hi2";

// ============================================
// Validation Schema
// ============================================

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ============================================
// Demo Credentials
// ============================================

const DEMO_CREDENTIALS = [
  {
    role: "Admin",
    email: "admin@hrms.com",
    password: "admin123",
    color: "text-primary-400",
    bg: "bg-primary-500/10",
    border: "border-primary-500/20",
    icon: HiOutlineShieldCheck,
  },
  {
    role: "HR",
    email: "hr@hrms.com",
    password: "hr123456",
    color: "text-accent-400",
    bg: "bg-accent-500/10",
    border: "border-accent-500/20",
    icon: HiOutlineUserCircle,
  },
  {
    role: "Employee",
    email: "john.doe@hrms.com",
    password: "employee123",
    color: "text-success-400",
    bg: "bg-success-500/10",
    border: "border-success-500/20",
    icon: HiOutlineUserCircle,
  },
];

// ============================================
// Known Emails for Autocomplete
// ============================================
// These are the seeded user emails from the database.
// In a production app, you could fetch these from an
// API endpoint like /api/auth/email-suggestions.

const KNOWN_EMAILS = [
  { email: "admin@hrms.com", role: "Admin", name: "Abhishek Mishra" },
  { email: "hr@hrms.com", role: "HR", name: "Priya Sharma" },
  { email: "john.doe@hrms.com", role: "Employee", name: "John Doe" },
  { email: "sarah.wilson@hrms.com", role: "Employee", name: "Sarah Wilson" },
  { email: "michael.chen@hrms.com", role: "Employee", name: "Michael Chen" },
  { email: "aisha.patel@hrms.com", role: "Employee", name: "Aisha Patel" },
  { email: "david.smith@hrms.com", role: "Employee", name: "David Smith" },
  { email: "emily.johnson@hrms.com", role: "Employee", name: "Emily Johnson" },
  { email: "raj.malhotra@hrms.com", role: "Employee", name: "Raj Malhotra" },
  { email: "maria.garcia@hrms.com", role: "Employee", name: "Maria Garcia" },
  { email: "tom.anderson@hrms.com", role: "Employee", name: "Tom Anderson" },
  { email: "neha.singh@hrms.com", role: "Employee", name: "Neha Singh" },
  { email: "james.brown@hrms.com", role: "Employee", name: "James Brown" },
  { email: "ananya.reddy@hrms.com", role: "Employee", name: "Ananya Reddy" },
  { email: "robert.taylor@hrms.com", role: "Employee", name: "Robert Taylor" },
  { email: "deepika.nair@hrms.com", role: "Employee", name: "Deepika Nair" },
  { email: "william.lee@hrms.com", role: "Employee", name: "William Lee" },
  { email: "kavita.joshi@hrms.com", role: "Employee", name: "Kavita Joshi" },
  {
    email: "chris.martinez@hrms.com",
    role: "Employee",
    name: "Chris Martinez",
  },
  { email: "sanjay.gupta@hrms.com", role: "Employee", name: "Sanjay Gupta" },
  { email: "lisa.white@hrms.com", role: "Employee", name: "Lisa White" },
  { email: "arjun.mehta@hrms.com", role: "Employee", name: "Arjun Mehta" },
  {
    email: "jennifer.davis@hrms.com",
    role: "Employee",
    name: "Jennifer Davis",
  },
  { email: "vikram.rao@hrms.com", role: "Employee", name: "Vikram Rao" },
  { email: "pooja.verma@hrms.com", role: "Employee", name: "Pooja Verma" },
];

// ============================================
// Login Page Component
// ============================================

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Auth state from Redux
  const {
    isAuthenticated,
    isLoading,
    error: authError,
  } = useAppSelector((state) => state.auth);

  // Local state
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  // Email autocomplete state
  const [emailSuggestions, setEmailSuggestions] = useState<typeof KNOWN_EMAILS>(
    [],
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // Get the redirect path from location state (if user was redirected from a protected route)
  const from = (location.state as { from?: string })?.from || "/dashboard";

  // ---- React Hook Form Setup ----
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // ---- Clear auth errors on mount and unmount ----
  useEffect(() => {
    dispatch(clearError());
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // ---- Redirect if already authenticated ----
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // ---- Email autocomplete handler ----
  const handleEmailChange = useCallback((value: string) => {
    if (value.length >= 1) {
      const query = value.toLowerCase();
      const matches = KNOWN_EMAILS.filter(
        (item) =>
          item.email.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query),
      ).slice(0, 6);
      setEmailSuggestions(matches);
      setShowSuggestions(matches.length > 0);
      setSelectedSuggestionIndex(-1);
    } else {
      setEmailSuggestions([]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  }, []);

  const handleSelectSuggestion = useCallback(
    (email: string) => {
      setValue("email", email);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      clearErrors("email");
      dispatch(clearError());
      // Auto-fill password for known demo accounts
      const cred = DEMO_CREDENTIALS.find((c) => c.email === email);
      if (cred) {
        setValue("password", cred.password);
        clearErrors("password");
      }
      // Focus password field
      const pwdInput = document.getElementById("password");
      if (pwdInput) pwdInput.focus();
    },
    [setValue, clearErrors, dispatch],
  );

  const handleEmailKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || emailSuggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < emailSuggestions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : emailSuggestions.length - 1,
        );
      } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        handleSelectSuggestion(emailSuggestions[selectedSuggestionIndex].email);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    },
    [
      showSuggestions,
      emailSuggestions,
      selectedSuggestionIndex,
      handleSelectSuggestion,
    ],
  );

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    if (showSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSuggestions]);

  // ---- Form Submit Handler ----
  const onSubmit = async (data: LoginFormData) => {
    try {
      clearErrors();
      const result = await dispatch(
        login({
          email: data.email.trim().toLowerCase(),
          password: data.password,
        }),
      ).unwrap();

      // On success, the useEffect above will redirect
      if (result) {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      // The error is already stored in Redux state by the rejected action.
      // Optionally set a form-level error for immediate display:
      const message =
        typeof err === "string"
          ? err
          : err?.message || "Login failed. Please check your credentials.";
      setError("root", { message });
    }
  };

  // ---- Fill Demo Credentials ----
  const handleFillCredentials = (email: string, password: string) => {
    setValue("email", email);
    setValue("password", password);
    clearErrors();
    dispatch(clearError());
  };

  // ---- Computed error message ----
  const errorMessage = errors.root?.message || authError || null;

  return (
    <div className="animate-fade-in">
      {/* ---- Header ---- */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-dark-400">
          Sign in to your HRMSLite account to continue
        </p>
      </div>

      {/* ---- Error Alert ---- */}
      {errorMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-danger-500/20 bg-danger-500/10 px-4 py-3.5 animate-fade-in-down">
          <HiOutlineExclamationCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-400" />
          <div>
            <p className="text-sm font-medium text-danger-400">
              Authentication Failed
            </p>
            <p className="mt-0.5 text-xs text-danger-400/80">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ---- Login Form ---- */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* ---- Email Field with Autocomplete ---- */}
        <div ref={suggestionsRef}>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200"
          >
            Email Address
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <HiOutlineEnvelope
                className={cn(
                  "h-4.5 w-4.5 transition-colors",
                  errors.email
                    ? "text-danger-400"
                    : "text-gray-400 dark:text-dark-500",
                )}
              />
            </div>
            <input
              {...register("email", {
                onChange: (e) => handleEmailChange(e.target.value),
              })}
              ref={(e) => {
                register("email").ref(e);
                emailInputRef.current = e;
              }}
              type="email"
              id="email"
              autoComplete="off"
              placeholder="Start typing to see suggestions..."
              disabled={isLoading}
              onFocus={(e) => handleEmailChange(e.target.value)}
              onKeyDown={handleEmailKeyDown}
              className={cn(
                "w-full rounded-xl border bg-dark-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder-dark-500 outline-none transition-all",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                errors.email
                  ? "border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20"
                  : "border-gray-300 dark:border-dark-700 hover:border-gray-300 dark:border-dark-600",
              )}
            />

            {/* ---- Email Suggestions Dropdown ---- */}
            {showSuggestions && emailSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-dark-600/80 bg-dark-800 shadow-lg shadow-black/30 animate-fade-in-down backdrop-blur-sm">
                <div className="px-3 py-2 border-b border-dark-700/50">
                  <p className="text-2xs font-medium text-dark-400">
                    Suggestions · {emailSuggestions.length} match
                    {emailSuggestions.length !== 1 ? "es" : ""}
                  </p>
                </div>
                <div className="max-h-52 overflow-y-auto scrollbar-thin py-1">
                  {emailSuggestions.map((suggestion, index) => {
                    const roleColor =
                      suggestion.role === "Admin"
                        ? "text-primary-400 bg-primary-500/10"
                        : suggestion.role === "HR"
                          ? "text-accent-400 bg-accent-500/10"
                          : "text-success-400 bg-success-500/10";

                    return (
                      <button
                        key={suggestion.email}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion.email)}
                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-all duration-150",
                          index === selectedSuggestionIndex
                            ? "bg-primary-500/10"
                            : "hover:bg-dark-700/50",
                        )}
                      >
                        {/* Avatar / initial */}
                        <div
                          className={cn(
                            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            roleColor,
                          )}
                        >
                          {suggestion.name.charAt(0)}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-dark-100">
                            {suggestion.name}
                          </p>
                          <p className="truncate text-2xs text-dark-400">
                            {suggestion.email}
                          </p>
                        </div>

                        {/* Role badge */}
                        <span
                          className={cn(
                            "flex-shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold",
                            roleColor,
                          )}
                        >
                          {suggestion.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-dark-700/50 px-3 py-1.5">
                  <p className="text-2xs text-dark-500">
                    <kbd className="rounded border border-dark-600 bg-dark-700 px-1 py-0.5 text-2xs font-mono">
                      ↑↓
                    </kbd>{" "}
                    navigate ·{" "}
                    <kbd className="rounded border border-dark-600 bg-dark-700 px-1 py-0.5 text-2xs font-mono">
                      Enter
                    </kbd>{" "}
                    select ·{" "}
                    <kbd className="rounded border border-dark-600 bg-dark-700 px-1 py-0.5 text-2xs font-mono">
                      Esc
                    </kbd>{" "}
                    close
                  </p>
                </div>
              </div>
            )}
          </div>
          {errors.email && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-danger-400">
              <HiOutlineExclamationCircle className="h-3.5 w-3.5" />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* ---- Password Field ---- */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700 dark:text-dark-200"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary-400 transition-colors hover:text-primary-300"
              tabIndex={-1}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <HiOutlineLockClosed
                className={cn(
                  "h-4.5 w-4.5 transition-colors",
                  errors.password
                    ? "text-danger-400"
                    : "text-gray-400 dark:text-dark-500",
                )}
              />
            </div>
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={isLoading}
              className={cn(
                "w-full rounded-xl border bg-dark-800/50 py-3 pl-10 pr-11 text-sm text-white placeholder-dark-500 outline-none transition-all",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                errors.password
                  ? "border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20"
                  : "border-gray-300 dark:border-dark-700 hover:border-gray-300 dark:border-dark-600",
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 dark:text-dark-500 transition-colors hover:text-gray-600 dark:text-dark-300"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <HiOutlineEyeSlash className="h-4.5 w-4.5" />
              ) : (
                <HiOutlineEye className="h-4.5 w-4.5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-danger-400">
              <HiOutlineExclamationCircle className="h-3.5 w-3.5" />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* ---- Remember Me ---- */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="remember"
            className="h-4 w-4 rounded border-gray-300 dark:border-dark-600 bg-dark-800 text-primary-600 focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-0"
          />
          <label
            htmlFor="remember"
            className="ml-2 text-sm text-gray-500 dark:text-dark-400"
          >
            Remember me for 30 days
          </label>
        </div>

        {/* ---- Submit Button ---- */}
        <button
          type="submit"
          disabled={isLoading || isSubmitting}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white transition-all",
            "bg-primary-600 hover:bg-primary-500 active:bg-primary-700",
            "focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-dark-900",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "shadow-lg shadow-primary-600/20 hover:shadow-primary-500/30",
          )}
        >
          {isLoading || isSubmitting ? (
            <>
              {/* Spinner */}
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <HiOutlineArrowRightOnRectangle className="h-4.5 w-4.5" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      {/* ---- Demo Credentials Section ---- */}
      <div className="mt-8">
        <button
          type="button"
          onClick={() => setShowDemoCredentials(!showDemoCredentials)}
          className="flex w-full items-center justify-center gap-2 text-xs text-gray-500 dark:text-dark-400 transition-colors hover:text-gray-600 dark:text-dark-300"
        >
          <HiOutlineInformationCircle className="h-4 w-4" />
          <span>
            {showDemoCredentials
              ? "Hide demo credentials"
              : "Show demo credentials"}
          </span>
        </button>

        {showDemoCredentials && (
          <div className="mt-3 space-y-2 animate-fade-in-down">
            <p className="text-center text-2xs text-gray-400 dark:text-dark-500">
              Click a credential below to auto-fill the login form
            </p>
            {DEMO_CREDENTIALS.map((cred) => {
              const Icon = cred.icon;
              return (
                <button
                  key={cred.role}
                  type="button"
                  onClick={() =>
                    handleFillCredentials(cred.email, cred.password)
                  }
                  className={cn(
                    "group flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all duration-200 hover:scale-[1.01] hover:shadow-md",
                    cred.bg,
                    cred.border,
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110",
                        cred.bg,
                        cred.color,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className={cn("text-xs font-semibold", cred.color)}>
                        {cred.role}
                      </p>
                      <p className="text-2xs text-gray-400 dark:text-dark-500">
                        {cred.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xs text-gray-400 dark:text-dark-500">
                      Password
                    </p>
                    <p className={cn("text-xs font-mono", cred.color)}>
                      {cred.password}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Register Link ---- */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 dark:text-dark-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-primary-400 transition-colors hover:text-primary-300"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
