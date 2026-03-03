// ============================================
// Register Page
// ============================================
// Provides a registration form with:
//   - Form validation using React Hook Form + Zod
//   - Password strength indicator
//   - Error handling with user-friendly messages
//   - Loading state during registration
//   - Link to login page
//   - Dark theme matching the reference dashboard

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppSelector, useAppDispatch } from '@/hooks/useRedux';
import { register as registerAction, clearError } from '@/store/slices/authSlice';
import { cn } from '@/utils/cn';
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineExclamationCircle,
  HiOutlineUser,
  HiOutlineUserPlus,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from 'react-icons/hi2';

// ============================================
// Validation Schema
// ============================================

const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be at most 50 characters'),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be at most 50 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================
// Password Strength Checker
// ============================================

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  bgColor: string;
  checks: {
    label: string;
    met: boolean;
  }[];
}

function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains a number', met: /[0-9]/.test(password) },
    { label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const score = checks.filter((c) => c.met).length;

  const levels: Record<number, { label: string; color: string; bgColor: string }> = {
    0: { label: 'Very Weak', color: 'text-danger-400', bgColor: 'bg-danger-500' },
    1: { label: 'Weak', color: 'text-danger-400', bgColor: 'bg-danger-500' },
    2: { label: 'Fair', color: 'text-warning-400', bgColor: 'bg-warning-500' },
    3: { label: 'Good', color: 'text-info-400', bgColor: 'bg-info-500' },
    4: { label: 'Strong', color: 'text-success-400', bgColor: 'bg-success-500' },
    5: { label: 'Very Strong', color: 'text-success-400', bgColor: 'bg-success-500' },
  };

  const level = levels[score] || levels[0];

  return {
    score,
    label: level.label,
    color: level.color,
    bgColor: level.bgColor,
    checks,
  };
}

// ============================================
// Register Page Component
// ============================================

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Auth state from Redux
  const { isAuthenticated, isLoading, error: authError } = useAppSelector(
    (state) => state.auth,
  );

  // Local state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordChecks, setShowPasswordChecks] = useState(false);

  // ---- React Hook Form Setup ----
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Watch password for strength indicator
  const watchedPassword = watch('password', '');
  const passwordStrength = getPasswordStrength(watchedPassword);

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
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // ---- Form Submit Handler ----
  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearErrors();
      await dispatch(
        registerAction({
          email: data.email.trim().toLowerCase(),
          password: data.password,
          confirmPassword: data.confirmPassword,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          role: 'EMPLOYEE',
        }),
      ).unwrap();

      // On success, the useEffect above will redirect to dashboard
    } catch (err: any) {
      const message =
        typeof err === 'string'
          ? err
          : err?.message || 'Registration failed. Please try again.';
      setError('root', { message });
    }
  };

  // ---- Computed error message ----
  const errorMessage = errors.root?.message || authError || null;

  return (
    <div className="animate-fade-in">
      {/* ---- Header ---- */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Create an account
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-dark-400">
          Join HRMSLite to manage your team effectively
        </p>
      </div>

      {/* ---- Error Alert ---- */}
      {errorMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-danger-500/20 bg-danger-500/10 px-4 py-3.5 animate-fade-in-down">
          <HiOutlineExclamationCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-400" />
          <div>
            <p className="text-sm font-medium text-danger-400">
              Registration Failed
            </p>
            <p className="mt-0.5 text-xs text-danger-400/80">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ---- Registration Form ---- */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* ---- Name Fields (side by side) ---- */}
        <div className="grid grid-cols-2 gap-3">
          {/* First Name */}
          <div>
            <label
              htmlFor="firstName"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200"
            >
              First Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <HiOutlineUser
                  className={cn(
                    'h-4 w-4 transition-colors',
                    errors.firstName ? 'text-danger-400' : 'text-gray-400 dark:text-dark-500',
                  )}
                />
              </div>
              <input
                {...register('firstName')}
                type="text"
                id="firstName"
                autoComplete="given-name"
                placeholder="John"
                disabled={isLoading}
                className={cn(
                  'w-full rounded-xl border bg-dark-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder-dark-500 outline-none transition-all',
                  'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  errors.firstName
                    ? 'border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20'
                    : 'border-gray-300 dark:border-dark-700 hover:border-gray-300 dark:border-dark-600',
                )}
              />
            </div>
            {errors.firstName && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-danger-400">
                <HiOutlineExclamationCircle className="h-3.5 w-3.5" />
                {errors.firstName.message}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label
              htmlFor="lastName"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200"
            >
              Last Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <HiOutlineUser
                  className={cn(
                    'h-4 w-4 transition-colors',
                    errors.lastName ? 'text-danger-400' : 'text-gray-400 dark:text-dark-500',
                  )}
                />
              </div>
              <input
                {...register('lastName')}
                type="text"
                id="lastName"
                autoComplete="family-name"
                placeholder="Doe"
                disabled={isLoading}
                className={cn(
                  'w-full rounded-xl border bg-dark-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder-dark-500 outline-none transition-all',
                  'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  errors.lastName
                    ? 'border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20'
                    : 'border-gray-300 dark:border-dark-700 hover:border-gray-300 dark:border-dark-600',
                )}
              />
            </div>
            {errors.lastName && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-danger-400">
                <HiOutlineExclamationCircle className="h-3.5 w-3.5" />
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

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
                  'h-4 w-4 transition-colors',
                  errors.email ? 'text-danger-400' : 'text-gray-400 dark:text-dark-500',
                )}
              />
            </div>
            <input
              {...register('email')}
              type="email"
              id="email"
              autoComplete="email"
              placeholder="john.doe@example.com"
              disabled={isLoading}
              className={cn(
                'w-full rounded-xl border bg-dark-800/50 py-3 pl-10 pr-4 text-sm text-white placeholder-dark-500 outline-none transition-all',
                'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.email
                  ? 'border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20'
                  : 'border-gray-300 dark:border-dark-700 hover:border-gray-300 dark:border-dark-600',
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

        {/* ---- Password Field ---- */}
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200"
          >
            Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <HiOutlineLockClosed
                className={cn(
                  'h-4 w-4 transition-colors',
                  errors.password ? 'text-danger-400' : 'text-gray-400 dark:text-dark-500',
                )}
              />
            </div>
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              placeholder="Create a strong password"
              disabled={isLoading}
              onFocus={() => setShowPasswordChecks(true)}
              onBlur={() => {
                if (!watchedPassword) setShowPasswordChecks(false);
              }}
              className={cn(
                'w-full rounded-xl border bg-dark-800/50 py-3 pl-10 pr-11 text-sm text-white placeholder-dark-500 outline-none transition-all',
                'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.password
                  ? 'border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20'
                  : 'border-gray-300 dark:border-dark-700 hover:border-gray-300 dark:border-dark-600',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 dark:text-dark-500 transition-colors hover:text-gray-600 dark:text-dark-300"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <HiOutlineEyeSlash className="h-4 w-4" />
              ) : (
                <HiOutlineEye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-danger-400">
              <HiOutlineExclamationCircle className="h-3.5 w-3.5" />
              {errors.password.message}
            </p>
          )}

          {/* Password Strength Indicator */}
          {(showPasswordChecks || watchedPassword) && watchedPassword.length > 0 && (
            <div className="mt-3 space-y-2 animate-fade-in-down">
              {/* Strength bar */}
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-all duration-300',
                        level <= passwordStrength.score
                          ? passwordStrength.bgColor
                          : 'bg-gray-200 dark:bg-dark-700',
                      )}
                    />
                  ))}
                </div>
                <span
                  className={cn(
                    'text-2xs font-medium',
                    passwordStrength.color,
                  )}
                >
                  {passwordStrength.label}
                </span>
              </div>

              {/* Password requirements checklist */}
              <div className="grid grid-cols-1 gap-1">
                {passwordStrength.checks.map((check) => (
                  <div
                    key={check.label}
                    className="flex items-center gap-1.5"
                  >
                    {check.met ? (
                      <HiOutlineCheckCircle className="h-3.5 w-3.5 text-success-400" />
                    ) : (
                      <HiOutlineXCircle className="h-3.5 w-3.5 text-gray-300 dark:text-dark-600" />
                    )}
                    <span
                      className={cn(
                        'text-2xs',
                        check.met ? 'text-success-400' : 'text-gray-400 dark:text-dark-500',
                      )}
                    >
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---- Confirm Password Field ---- */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200"
          >
            Confirm Password
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <HiOutlineLockClosed
                className={cn(
                  'h-4 w-4 transition-colors',
                  errors.confirmPassword ? 'text-danger-400' : 'text-gray-400 dark:text-dark-500',
                )}
              />
            </div>
            <input
              {...register('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              disabled={isLoading}
              className={cn(
                'w-full rounded-xl border bg-dark-800/50 py-3 pl-10 pr-11 text-sm text-white placeholder-dark-500 outline-none transition-all',
                'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
                'disabled:cursor-not-allowed disabled:opacity-50',
                errors.confirmPassword
                  ? 'border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/20'
                  : 'border-gray-300 dark:border-dark-700 hover:border-gray-300 dark:border-dark-600',
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 dark:text-dark-500 transition-colors hover:text-gray-600 dark:text-dark-300"
              tabIndex={-1}
              aria-label={
                showConfirmPassword ? 'Hide password' : 'Show password'
              }
            >
              {showConfirmPassword ? (
                <HiOutlineEyeSlash className="h-4 w-4" />
              ) : (
                <HiOutlineEye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-danger-400">
              <HiOutlineExclamationCircle className="h-3.5 w-3.5" />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* ---- Terms and Conditions ---- */}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="terms"
            className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-dark-600 bg-dark-800 text-primary-600 focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-0"
          />
          <label htmlFor="terms" className="text-xs text-gray-500 dark:text-dark-400 leading-relaxed">
            I agree to the{' '}
            <button type="button" className="font-medium text-primary-400 hover:text-primary-300">
              Terms of Service
            </button>{' '}
            and{' '}
            <button type="button" className="font-medium text-primary-400 hover:text-primary-300">
              Privacy Policy
            </button>
          </label>
        </div>

        {/* ---- Submit Button ---- */}
        <button
          type="submit"
          disabled={isLoading || isSubmitting}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white transition-all',
            'bg-primary-600 hover:bg-primary-500 active:bg-primary-700',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-dark-900',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'shadow-lg shadow-primary-600/20 hover:shadow-primary-500/30',
          )}
        >
          {isLoading || isSubmitting ? (
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
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <HiOutlineUserPlus className="h-4 w-4" />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      {/* ---- Login Link ---- */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 dark:text-dark-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary-400 transition-colors hover:text-primary-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
