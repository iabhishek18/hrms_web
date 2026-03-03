// ============================================
// Button UI Component
// ============================================
// A versatile, reusable button component with:
//   - Multiple variants (primary, secondary, success, danger, warning, ghost, outline, link)
//   - Multiple sizes (xs, sm, md, lg, xl)
//   - Loading state with spinner
//   - Icon support (left and right icons)
//   - Full width option
//   - Disabled state
//   - Polymorphic: can render as <button> or <a>
//   - Dark theme compatible

import React, { forwardRef } from "react";
import { cn } from "@/utils/cn";

// ============================================
// Types
// ============================================

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "ghost"
  | "outline"
  | "link";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Show a loading spinner and disable interactions */
  isLoading?: boolean;
  /** Text to display while loading (replaces children) */
  loadingText?: string;
  /** Icon element to render on the left side */
  leftIcon?: React.ReactNode;
  /** Icon element to render on the right side */
  rightIcon?: React.ReactNode;
  /** Make the button take the full width of its container */
  fullWidth?: boolean;
  /** Render as an icon-only button (square aspect ratio) */
  iconOnly?: boolean;
  /** Render as a link (<a> tag) instead of <button> */
  as?: "button" | "a";
  /** href for when rendered as an <a> tag */
  href?: string;
  /** target for when rendered as an <a> tag */
  target?: string;
  /** rel for when rendered as an <a> tag */
  rel?: string;
}

// ============================================
// Style Maps
// ============================================

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-primary-600 text-white",
    "hover:bg-primary-500 active:bg-primary-700",
    "focus-visible:ring-primary-500/50",
    "shadow-sm shadow-primary-600/20 hover:shadow-primary-500/30",
    "disabled:bg-primary-600/50",
  ),
  secondary: cn(
    "bg-gray-100 text-gray-700 border border-gray-300",
    "hover:bg-gray-200 hover:text-gray-900 active:bg-gray-300",
    "focus-visible:ring-gray-500/50",
    "dark:bg-dark-700 dark:text-dark-100 dark:border-dark-600",
    "dark:hover:bg-dark-600 dark:hover:text-white dark:active:bg-dark-800",
    "disabled:bg-gray-100/50 disabled:text-gray-400 dark:disabled:bg-dark-700/50 dark:disabled:text-dark-400",
  ),
  success: cn(
    "bg-success-600 text-white",
    "hover:bg-success-500 active:bg-success-700",
    "focus-visible:ring-success-500/50",
    "shadow-sm shadow-success-600/20",
    "disabled:bg-success-600/50",
  ),
  danger: cn(
    "bg-danger-600 text-white",
    "hover:bg-danger-500 active:bg-danger-700",
    "focus-visible:ring-danger-500/50",
    "shadow-sm shadow-danger-600/20",
    "disabled:bg-danger-600/50",
  ),
  warning: cn(
    "bg-warning-600 text-white",
    "hover:bg-warning-500 active:bg-warning-700",
    "focus-visible:ring-warning-500/50",
    "shadow-sm shadow-warning-600/20",
    "disabled:bg-warning-600/50",
  ),
  ghost: cn(
    "bg-transparent text-gray-600",
    "hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200",
    "focus-visible:ring-gray-500/50",
    "dark:text-dark-300 dark:hover:bg-dark-700/50 dark:hover:text-dark-100 dark:active:bg-dark-700",
    "disabled:text-gray-400 dark:disabled:text-dark-500",
  ),
  outline: cn(
    "bg-transparent text-gray-700 border border-gray-300",
    "hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 active:bg-gray-100",
    "focus-visible:ring-gray-500/50",
    "dark:text-dark-200 dark:border-dark-600",
    "dark:hover:bg-dark-700/50 dark:hover:text-dark-100 dark:hover:border-dark-500 dark:active:bg-dark-700",
    "disabled:text-gray-400 disabled:border-gray-200 dark:disabled:text-dark-500 dark:disabled:border-dark-700",
  ),
  link: cn(
    "bg-transparent text-primary-600 underline-offset-4",
    "hover:text-primary-700 hover:underline active:text-primary-800",
    "focus-visible:ring-primary-500/50",
    "dark:text-primary-400 dark:hover:text-primary-300 dark:active:text-primary-500",
    "disabled:text-primary-400/50",
    "p-0 h-auto",
  ),
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs gap-1 rounded-md",
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-9 px-4 text-sm gap-2 rounded-lg",
  lg: "h-10 px-5 text-sm gap-2 rounded-lg",
  xl: "h-12 px-6 text-base gap-2.5 rounded-xl",
};

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  xs: "h-7 w-7 rounded-md",
  sm: "h-8 w-8 rounded-lg",
  md: "h-9 w-9 rounded-lg",
  lg: "h-10 w-10 rounded-lg",
  xl: "h-12 w-12 rounded-xl",
};

const spinnerSizeStyles: Record<ButtonSize, string> = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-4 w-4",
  xl: "h-5 w-5",
};

// ============================================
// Loading Spinner Sub-component
// ============================================

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
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
  );
}

// ============================================
// Button Component
// ============================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      iconOnly = false,
      disabled,
      type = "button",
      as = "button",
      href,
      target,
      rel,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    const baseStyles = cn(
      // Base layout
      "inline-flex items-center justify-center",
      // Font
      "font-medium",
      // Transitions
      "transition-all duration-200",
      // Focus ring
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900",
      // Disabled
      "disabled:cursor-not-allowed disabled:opacity-60",
      // Prevent text selection while clicking
      "select-none",
      // Whitespace
      "whitespace-nowrap",
    );

    const combinedClassName = cn(
      baseStyles,
      variantStyles[variant],
      iconOnly ? iconOnlySizeStyles[size] : sizeStyles[size],
      fullWidth && "w-full",
      // Override padding for link variant
      variant === "link" && "px-0",
      className,
    );

    const content = (
      <>
        {/* Loading spinner (replaces left icon when loading) */}
        {isLoading && <Spinner className={spinnerSizeStyles[size]} />}

        {/* Left icon (hidden when loading) */}
        {!isLoading && leftIcon && (
          <span className="inline-flex shrink-0">{leftIcon}</span>
        )}

        {/* Button text */}
        {!iconOnly && (
          <span className={cn(isLoading && !loadingText && "opacity-0")}>
            {isLoading && loadingText ? loadingText : children}
          </span>
        )}

        {/* Right icon */}
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </>
    );

    // Render as anchor tag if `as="a"` is specified
    if (as === "a" && href) {
      return (
        <a
          href={href}
          target={target}
          rel={rel || (target === "_blank" ? "noopener noreferrer" : undefined)}
          className={cn(
            combinedClassName,
            isDisabled && "pointer-events-none opacity-60",
          )}
          aria-disabled={isDisabled}
          tabIndex={isDisabled ? -1 : 0}
        >
          {content}
        </a>
      );
    }

    // Default: render as <button>
    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={combinedClassName}
        aria-busy={isLoading}
        {...props}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
