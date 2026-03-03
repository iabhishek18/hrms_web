// ============================================
// Forgot Password Page
// ============================================
// Provides a password reset form where users can:
//   - Enter their email address
//   - Set a new password
//   - Confirm the new password
// On success, redirects to the login page with a success message.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
    confirmNewPassword: z
      .string()
      .min(1, "Please confirm your new password"),
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
        "Password has been reset successfully! Redirecting to login..."
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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/10">
          <HiOutlineKey className="h-7 w-7 text-primary-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Reset Password
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-dark-400">
          Enter your email and set a new password
        </p>
      </div>

      {/* ---- Success Alert ---- */}
      {successMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-success-500/20 bg-success-500/10 px-4 py-3.5 animate-fade-in-down">
          <HiOutlineCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-success-400" />
          <div>
            <p className="text-sm font-medium text-success-400">Success!</p>
            <p className="mt-0.5 text-xs text-success-400/80">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* ---- Error Alert ---- */}
      {errorMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-danger-500/20 bg-danger-500/10 px-4 py-3.5 animate-fade-in-down">
          <HiOutlineExclamationCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-400" />
          <div>
            <p className="text-sm font-medium text-danger-400">
              Reset Failed
            </p>
            <p className="mt-0.5 text-xs text-danger-400/80">
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
                    : "text-gray-400 dark:text-dark-500"
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
                "w-full rounded-xl border bg-dark-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder-dark-500 outline-none transition-all",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                errors.email
                  ? "border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20"
                  : "border-gray-300 dark:border-dark-700 hover:border-gray-300 dark:border-dark-600"
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
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200"
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
                    : "text-gray-400 dark:text-dark-500"
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
                "w-full rounded-xl border bg-dark-800/50 py-3 pl-10 pr-11 text-sm text-white placeholder-dark-500 outline-none transition-all",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                errors.newPassword
                  ? "border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20"
                  : "border-gray-300 dark:border-dark-700 hover:border-gray-300 dark:border-dark-600"
              )}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 dark:text-dark-500 transition-colors hover:text-gray-600 dark:hover:text-dark-300"
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
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200"
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
                    : "text-gray-400 dark:text-dark-500"
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
                "w-full rounded-xl border bg-dark-800/50 py-3 pl-10 pr-11 text-sm text-white placeholder-dark-500 outline-none transition-all",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                errors.confirmNewPassword
                  ? "border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20"
                  : "border-gray-300 dark:border-dark-700 hover:border-gray-300 dark:border-dark-600"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 dark:text-dark-500 transition-colors hover:text-gray-600 dark:hover:text-dark-300"
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
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white transition-all",
            "bg-primary-600 hover:bg-primary-500 active:bg-primary-700",
            "focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-dark-900",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "shadow-lg shadow-primary-600/20 hover:shadow-primary-500/30"
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
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-400 transition-colors hover:text-primary-300"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
