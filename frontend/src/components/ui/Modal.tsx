// ============================================
// Modal UI Component
// ============================================
// A composable modal / dialog component with:
//   - Overlay backdrop with blur effect
//   - Multiple sizes (sm, md, lg, xl, full)
//   - Smooth enter/exit animations
//   - Close on overlay click (configurable)
//   - Close on Escape key
//   - Focus trapping
//   - Composable sub-components (ModalHeader, ModalBody, ModalFooter)
//   - Confirm dialog variant
//   - Dark theme compatible
//   - Portal rendering to avoid z-index issues
//   - Scroll lock when open

import React, {
  useEffect,
  useCallback,
  useRef,
  useState,
  forwardRef,
  Fragment,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";
import { HiOutlineXMark, HiOutlineExclamationTriangle } from "react-icons/hi2";

// ============================================
// Types
// ============================================

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
  /** Whether the modal is currently visible */
  isOpen: boolean;
  /** Callback fired when the modal should close */
  onClose: () => void;
  /** Size of the modal dialog */
  size?: ModalSize;
  /** Whether clicking the overlay backdrop closes the modal */
  closeOnOverlay?: boolean;
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean;
  /** Whether to show the close (X) button in the top-right corner */
  showCloseButton?: boolean;
  /** Whether to center the modal vertically */
  centered?: boolean;
  /** Additional class name for the modal content container */
  className?: string;
  /** Additional class name for the overlay */
  overlayClassName?: string;
  /** Children (typically ModalHeader, ModalBody, ModalFooter) */
  children?: React.ReactNode;
  /** Accessible label for the modal */
  "aria-label"?: string;
  /** ID of the element that labels the modal (e.g., the ModalHeader title) */
  "aria-labelledby"?: string;
  /** ID of the element that describes the modal */
  "aria-describedby"?: string;
  /** Whether to render the modal without a portal (useful for testing) */
  disablePortal?: boolean;
  /** Whether to prevent scroll lock on the body */
  preventScrollLock?: boolean;
  /** Initial focus element ref */
  initialFocusRef?: React.RefObject<HTMLElement>;
}

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Title text */
  title?: string;
  /** Subtitle / description text */
  subtitle?: string;
  /** Icon element rendered before the title */
  icon?: React.ReactNode;
  /** Whether to show a bottom border */
  bordered?: boolean;
  /** Callback for the close button (inherited from Modal if not provided) */
  onClose?: () => void;
  /** Whether to show the close button */
  showCloseButton?: boolean;
}

export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Padding size */
  padding?: "none" | "sm" | "md" | "lg";
}

export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show a top border */
  bordered?: boolean;
  /** Horizontal alignment of footer content */
  align?: "left" | "center" | "right" | "between";
}

export interface ConfirmModalProps {
  /** Whether the confirm modal is visible */
  isOpen: boolean;
  /** Callback fired when the modal should close */
  onClose: () => void;
  /** Callback fired when the user confirms the action */
  onConfirm: () => void;
  /** Title text */
  title: string;
  /** Description / message text */
  message: string;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Visual style of the confirm button */
  variant?: "danger" | "warning" | "primary";
  /** Whether the confirm action is loading / in progress */
  isLoading?: boolean;
  /** Icon element displayed at the top of the dialog */
  icon?: React.ReactNode;
}

// ============================================
// Style Maps
// ============================================

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
};

const bodyPaddingStyles: Record<string, string> = {
  none: "p-0",
  sm: "px-4 py-3",
  md: "px-5 py-4 sm:px-6",
  lg: "px-6 py-5 sm:px-8",
};

const footerAlignStyles: Record<string, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
  between: "justify-between",
};

const confirmVariantStyles: Record<
  string,
  { button: string; iconBg: string; iconColor: string }
> = {
  danger: {
    button:
      "bg-danger-600 text-white hover:bg-danger-500 active:bg-danger-700 focus-visible:ring-danger-500/50 shadow-sm shadow-danger-600/20",
    iconBg: "bg-danger-500/10",
    iconColor: "text-danger-400",
  },
  warning: {
    button:
      "bg-warning-600 text-white hover:bg-warning-500 active:bg-warning-700 focus-visible:ring-warning-500/50 shadow-sm shadow-warning-600/20",
    iconBg: "bg-warning-500/10",
    iconColor: "text-warning-400",
  },
  primary: {
    button:
      "bg-primary-600 text-white hover:bg-primary-500 active:bg-primary-700 focus-visible:ring-primary-500/50 shadow-sm shadow-primary-600/20",
    iconBg: "bg-primary-500/10",
    iconColor: "text-primary-400",
  },
};

// ============================================
// Portal Wrapper
// ============================================

function ModalPortal({
  children,
  disablePortal,
}: {
  children: React.ReactNode;
  disablePortal?: boolean;
}) {
  if (disablePortal) {
    return <Fragment>{children}</Fragment>;
  }

  // Use document.body as the portal target
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

// ============================================
// Modal Component
// ============================================

export function Modal({
  isOpen,
  onClose,
  size = "md",
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
  centered = true,
  className,
  overlayClassName,
  children,
  disablePortal = false,
  preventScrollLock = false,
  initialFocusRef,
  ...ariaProps
}: ModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // ---- Handle open/close animation lifecycle ----
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to allow the DOM to update before starting the animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      return undefined;
    } else {
      setIsAnimating(false);
      // Wait for exit animation to complete before removing from DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200); // Match the animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ---- Scroll lock ----
  useEffect(() => {
    if (isOpen && !preventScrollLock) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
    return undefined;
  }, [isOpen, preventScrollLock]);

  // ---- Focus management ----
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element to restore later
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus the initial focus element or the modal content
      const timer = setTimeout(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else if (contentRef.current) {
          // Focus the first focusable element inside the modal
          const focusable = contentRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusable) {
            focusable.focus();
          } else {
            contentRef.current.focus();
          }
        }
      }, 50);

      return () => clearTimeout(timer);
    } else {
      // Restore focus to the previously active element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
      return undefined;
    }
  }, [isOpen, initialFocusRef]);

  // ---- Escape key handler ----
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // ---- Focus trapping ----
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== "Tab" || !contentRef.current) return;

    const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])',
    );

    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift+Tab: if focus is on the first element, wrap to the last
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab: if focus is on the last element, wrap to the first
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }, []);

  // ---- Overlay click handler ----
  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      // Only close if the click is on the overlay itself, not the content
      if (event.target === event.currentTarget && closeOnOverlay) {
        onClose();
      }
    },
    [closeOnOverlay, onClose],
  );

  // Don't render anything if the modal shouldn't be visible
  if (!shouldRender) {
    return null;
  }

  return (
    <ModalPortal disablePortal={disablePortal}>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex overflow-y-auto overflow-x-hidden",
          centered ? "items-center" : "items-start pt-16",
          "justify-center p-4",
          // Animation
          "transition-opacity duration-200",
          isAnimating ? "opacity-100" : "opacity-0",
          overlayClassName,
        )}
        onClick={handleOverlayClick}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={ariaProps["aria-label"]}
        aria-labelledby={ariaProps["aria-labelledby"]}
        aria-describedby={ariaProps["aria-describedby"]}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
            isAnimating ? "opacity-100" : "opacity-0",
          )}
          aria-hidden="true"
        />

        {/* Modal Content */}
        <div
          ref={contentRef}
          className={cn(
            "relative z-10 w-full",
            sizeStyles[size],
            // Background
            "bg-dark-800 border border-dark-700/50",
            // Border radius
            size === "full" ? "rounded-2xl" : "rounded-xl",
            // Shadow
            "shadow-modal-dark",
            // Animation
            "transition-all duration-200",
            isAnimating
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-95 opacity-0",
            // Max height for scrollable content
            size !== "full" && "max-h-[calc(100vh-2rem)]",
            "flex flex-col",
            // Allow tab focus on the container itself
            "outline-none",
            className,
          )}
          tabIndex={-1}
        >
          {/* Close button (absolute positioned in top-right) */}
          {showCloseButton && (
            <button
              onClick={onClose}
              className={cn(
                "absolute right-3 top-3 z-10",
                "flex h-8 w-8 items-center justify-center rounded-lg",
                "text-dark-400 transition-colors",
                "hover:bg-dark-700 hover:text-dark-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50",
              )}
              aria-label="Close modal"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          )}

          {/* Render children (ModalHeader, ModalBody, ModalFooter) */}
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}

Modal.displayName = "Modal";

// ============================================
// ModalHeader Component
// ============================================

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  (
    {
      children,
      className,
      title,
      subtitle,
      icon,
      bordered = true,
      onClose,
      showCloseButton = false,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex-shrink-0 px-5 py-4 sm:px-6",
          bordered && "border-b border-dark-700/50",
          className,
        )}
        {...props}
      >
        {title || subtitle || icon ? (
          <div className="flex items-start gap-3 pr-8">
            {/* Icon */}
            {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}

            {/* Title & Subtitle */}
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-lg font-semibold text-white">{title}</h2>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-dark-400">{subtitle}</p>
              )}
            </div>

            {/* Optional inline close button */}
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className={cn(
                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                  "text-dark-400 transition-colors",
                  "hover:bg-dark-700 hover:text-dark-200",
                )}
                aria-label="Close"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : (
          // Render children directly for full customization
          <div className="pr-8">{children}</div>
        )}
      </div>
    );
  },
);

ModalHeader.displayName = "ModalHeader";

// ============================================
// ModalBody Component
// ============================================

export const ModalBody = forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ children, className, padding = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex-1 overflow-y-auto scrollbar-thin",
          bodyPaddingStyles[padding],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ModalBody.displayName = "ModalBody";

// ============================================
// ModalFooter Component
// ============================================

export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  (
    { children, className, bordered = true, align = "right", ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-shrink-0 items-center gap-3 px-5 py-4 sm:px-6",
          footerAlignStyles[align],
          bordered && "border-t border-dark-700/50",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ModalFooter.displayName = "ModalFooter";

// ============================================
// ConfirmModal Component
// ============================================
// A pre-built confirmation dialog variant for
// destructive actions (delete, remove, etc.) or
// important confirmations (approve, reject, etc.).

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  icon,
}: ConfirmModalProps) {
  const styles = confirmVariantStyles[variant] || confirmVariantStyles.danger;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      centered
      showCloseButton={false}
      closeOnOverlay={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="px-5 py-6 sm:px-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full",
              styles.iconBg,
            )}
          >
            {icon || (
              <HiOutlineExclamationTriangle
                className={cn("h-6 w-6", styles.iconColor)}
              />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-4 text-center text-lg font-semibold text-white">
          {title}
        </h3>

        {/* Message */}
        <p className="mt-2 text-center text-sm text-dark-400">{message}</p>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          {/* Cancel button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              "flex-1 rounded-lg border border-dark-600 bg-dark-700 px-4 py-2.5",
              "text-sm font-medium text-dark-200",
              "transition-colors duration-200",
              "hover:bg-dark-600 hover:text-white",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-800",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {cancelLabel}
          </button>

          {/* Confirm button */}
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5",
              "text-sm font-medium",
              "transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-800",
              "disabled:cursor-not-allowed disabled:opacity-60",
              styles.button,
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
                <span>Processing…</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

ConfirmModal.displayName = "ConfirmModal";

// ============================================
// Exports
// ============================================

export default Modal;
