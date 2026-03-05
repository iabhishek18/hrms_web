// ============================================
// Forgot Password Page
// ============================================
// Provides a password reset form where users can:
//   - Enter their email address
//   - Set a new password
//   - Confirm the new password
// On success, redirects to the login page with a success message.
// Supports proper light/dark theme.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppSelector } from "@/hooks/useRedux";
import { selectResolvedTheme } from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";
import { authApi } from "@/api/auth";
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
  HiOutlineArrowLeft,
  HiOutlineKey,
} from "react-icons/hi2";

// ============================================
// Validation Schema
// ============================================

const forgotPasswordSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    newPassword: z
      .string()
      .min(1, "New password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ============================================
// Forgot Password Page Component
// ============================================

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isDark = resolvedTheme === "dark";

  // Local state
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ---- React Hook Form Setup ----
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  // ---- Form Submit Handler ----
  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await authApi.resetPassword({
        email: data.email.trim().toLowerCase(),
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmNewPassword,
      });

      setSuccessMessage(
        "Password has been reset successfully! Redirecting to login...",
      );

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to reset password. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* ---- Header ---- */}
      <div className="mb-8 text-center">
        <div
          className={cn(
            "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl",
            isDark ? "bg-primary-500/10" : "bg-primary-50",
          )}
        >
          <HiOutlineKey
            className={cn(
              "h-7 w-7",
              isDark ? "text-primary-400" : "text-primary-600",
            )}
          />
        </div>
        <h2
          className={cn(
            "text-2xl font-bold sm:text-3xl",
            isDark ? "text-white" : "text-gray-900",
          )}
        >
          Reset Password
        </h2>
        <p
          className={cn(
            "mt-2 text-sm",
            isDark ? "text-dark-400" : "text-gray-500",
          )}
        >
          Enter your email and set a new password
        </p>
      </div>

      {/* ---- Success Alert ---- */}
      {successMessage && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3 rounded-xl border px-4 py-3.5 animate-fade-in-down",
            isDark
              ? "border-success-500/20 bg-success-500/10"
              : "border-success-200 bg-success-50",
          )}
        >
          <HiOutlineCheckCircle
            className={cn(
              "mt-0.5 h-5 w-5 flex-shrink-0",
              isDark ? "text-success-400" : "text-success-500",
            )}
          />
          <div>
            <p
              className={cn(
                "text-sm font-medium",
                isDark ? "text-success-400" : "text-success-700",
              )}
            >
              Success!
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs",
                isDark ? "text-success-400/80" : "text-success-600",
              )}
            >
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* ---- Error Alert ---- */}
      {errorMessage && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3 rounded-xl border px-4 py-3.5 animate-fade-in-down",
            isDark
              ? "border-danger-500/20 bg-danger-500/10"
              : "border-danger-200 bg-danger-50",
          )}
        >
          <HiOutlineExclamationCircle
            className={cn(
              "mt-0.5 h-5 w-5 flex-shrink-0",
              isDark ? "text-danger-400" : "text-danger-500",
            )}
          />
          <div>
            <p
              className={cn(
                "text-sm font-medium",
                isDark ? "text-danger-400" : "text-danger-700",
              )}
            >
              Reset Failed
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs",
                isDark ? "text-danger-400/80" : "text-danger-600",
              )}
            >
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* ---- Reset Password Form ---- */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* ---- Email Field ---- */}
        <div>
          <label
            htmlFor="email"
            className={cn(
              "mb-1.5 block text-sm font-medium",
              isDark ? "text-dark-200" : "text-gray-700",
            )}
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
                    : isDark
                      ? "text-dark-500"
                      : "text-gray-400",
                )}
              />
            </div>
            <input
              {...register("email")}
              type="email"
              id="email"
              autoComplete="email"
              placeholder="Enter your registered email"
              disabled={isLoading || !!successMessage}
              className={cn(
                "w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-all",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isDark
                  ? "bg-dark-800/50 text-white placeholder-dark-500 border-dark-700 hover:border-dark-600"
                  : "bg-white text-gray-900 placeholder-gray-400 border-gray-300 hover:border-gray-400",
                errors.email &&
                  "border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20",
              )}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-danger-400">
              <HiOutlineExclamationCircle className="h-3.5 w-3.5" />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* ---- New Password Field ---- */}
        <div>
          <label
            htmlFor="newPassword"
            className={cn(
              "mb-1.5 block text-sm font-medium",
              isDark ? "text-dark-200" : "text-gray-700",
            )}
          >
            New Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <HiOutlineLockClosed
                className={cn(
                  "h-4.5 w-4.5 transition-colors",
                  errors.newPassword
                    ? "text-danger-400"
                    : isDark
                      ? "text-dark-500"
                      : "text-gray-400",
                )}
              />
            </div>
            <input
              {...register("newPassword")}
              type={showNewPassword ? "text" : "password"}
              id="newPassword"
              autoComplete="new-password"
              placeholder="Enter new password"
              disabled={isLoading || !!successMessage}
              className={cn(
                "w-full rounded-xl border py-3 pl-10 pr-11 text-sm outline-none transition-all",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isDark
                  ? "bg-dark-800/50 text-white placeholder-dark-500 border-dark-700 hover:border-dark-600"
                  : "bg-white text-gray-900 placeholder-gray-400 border-gray-300 hover:border-gray-400",
                errors.newPassword &&
                  "border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20",
              )}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className={cn(
                "absolute inset-y-0 right-0 flex items-center pr-3.5 transition-colors",
                isDark
                  ? "text-dark-500 hover:text-dark-300"
                  : "text-gray-400 hover:text-gray-600",
              )}
              tabIndex={-1}
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? (
                <HiOutlineEyeSlash className="h-4.5 w-4.5" />
              ) : (
                <HiOutlineEye className="h-4.5 w-4.5" />
              )}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-danger-400">
              <HiOutlineExclamationCircle className="h-3.5 w-3.5" />
              {errors.newPassword.message}
            </p>
          )}
        </div>

        {/* ---- Confirm New Password Field ---- */}
        <div>
          <label
            htmlFor="confirmNewPassword"
            className={cn(
              "mb-1.5 block text-sm font-medium",
              isDark ? "text-dark-200" : "text-gray-700",
            )}
          >
            Confirm New Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <HiOutlineLockClosed
                className={cn(
                  "h-4.5 w-4.5 transition-colors",
                  errors.confirmNewPassword
                    ? "text-danger-400"
                    : isDark
                      ? "text-dark-500"
                      : "text-gray-400",
                )}
              />
            </div>
            <input
              {...register("confirmNewPassword")}
              type={showConfirmPassword ? "text" : "password"}
              id="confirmNewPassword"
              autoComplete="new-password"
              placeholder="Confirm new password"
              disabled={isLoading || !!successMessage}
              className={cn(
                "w-full rounded-xl border py-3 pl-10 pr-11 text-sm outline-none transition-all",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isDark
                  ? "bg-dark-800/50 text-white placeholder-dark-500 border-dark-700 hover:border-dark-600"
                  : "bg-white text-gray-900 placeholder-gray-400 border-gray-300 hover:border-gray-400",
                errors.confirmNewPassword &&
                  "border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20",
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={cn(
                "absolute inset-y-0 right-0 flex items-center pr-3.5 transition-colors",
                isDark
                  ? "text-dark-500 hover:text-dark-300"
                  : "text-gray-400 hover:text-gray-600",
              )}
              tabIndex={-1}
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? (
                <HiOutlineEyeSlash className="h-4.5 w-4.5" />
              ) : (
                <HiOutlineEye className="h-4.5 w-4.5" />
              )}
            </button>
          </div>
          {errors.confirmNewPassword && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-danger-400">
              <HiOutlineExclamationCircle className="h-3.5 w-3.5" />
              {errors.confirmNewPassword.message}
            </p>
          )}
        </div>

        {/* ---- Submit Button ---- */}
        <button
          type="submit"
          disabled={isLoading || !!successMessage}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all",
            "bg-primary-600 hover:bg-primary-500 active:bg-primary-700",
            "focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2",
            isDark ? "focus:ring-offset-dark-900" : "focus:ring-offset-white",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "shadow-lg shadow-primary-600/20 hover:shadow-primary-500/30",
          )}
        >
          {isLoading ? (
            <>
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
              <span>Resetting password...</span>
            </>
          ) : (
            <>
              <HiOutlineKey className="h-4.5 w-4.5" />
              <span>Reset Password</span>
            </>
          )}
        </button>
      </form>

      {/* ---- Back to Login Link ---- */}
      <div className="mt-8 text-center">
        <Link
          to="/login"
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-semibold transition-colors",
            isDark
              ? "text-primary-400 hover:text-primary-300"
              : "text-primary-600 hover:text-primary-500",
          )}
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
