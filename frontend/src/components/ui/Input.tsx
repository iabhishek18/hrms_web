// ============================================
// Input UI Component
// ============================================
// A versatile, reusable input component with:
//   - Label with optional required indicator
//   - Error state with error message display
//   - Hint/helper text support
//   - Left and right icon slots
//   - Multiple sizes (sm, md, lg)
//   - Disabled and readonly states
//   - Dark theme compatible
//   - Seamless integration with React Hook Form
//   - Textarea variant support

import React, { forwardRef, useId } from 'react';
import { cn } from '@/utils/cn';
import { HiOutlineExclamationCircle } from 'react-icons/hi2';

// ============================================
// Types
// ============================================

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string;
  /** Error message to display below the input */
  error?: string;
  /** Hint/helper text displayed below the input (hidden when error is present) */
  hint?: string;
  /** Size variant of the input */
  inputSize?: InputSize;
  /** Icon element rendered on the left side of the input */
  leftIcon?: React.ReactNode;
  /** Icon element rendered on the right side of the input */
  rightIcon?: React.ReactNode;
  /** Whether the field is required (adds a red asterisk to the label) */
  isRequired?: boolean;
  /** Whether the input should take the full width of its container */
  fullWidth?: boolean;
  /** Additional class name for the outer wrapper div */
  wrapperClassName?: string;
  /** Additional class name for the label element */
  labelClassName?: string;
  /** Additional class name for the input element */
  inputClassName?: string;
}

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Label text displayed above the textarea */
  label?: string;
  /** Error message to display below the textarea */
  error?: string;
  /** Hint/helper text displayed below the textarea (hidden when error is present) */
  hint?: string;
  /** Size variant of the textarea */
  inputSize?: InputSize;
  /** Whether the field is required (adds a red asterisk to the label) */
  isRequired?: boolean;
  /** Whether the textarea should take the full width of its container */
  fullWidth?: boolean;
  /** Additional class name for the outer wrapper div */
  wrapperClassName?: string;
  /** Additional class name for the label element */
  labelClassName?: string;
  /** Additional class name for the textarea element */
  inputClassName?: string;
  /** Whether the textarea is resizable */
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

// ============================================
// Style Maps
// ============================================

const sizeStyles: Record<InputSize, { input: string; label: string; icon: string; iconWrapper: string }> = {
  sm: {
    input: 'h-8 px-3 text-xs rounded-lg',
    label: 'text-xs mb-1',
    icon: 'h-3.5 w-3.5',
    iconWrapper: 'px-2.5',
  },
  md: {
    input: 'h-10 px-3.5 text-sm rounded-lg',
    label: 'text-sm mb-1.5',
    icon: 'h-4 w-4',
    iconWrapper: 'px-3',
  },
  lg: {
    input: 'h-12 px-4 text-base rounded-xl',
    label: 'text-sm mb-1.5',
    icon: 'h-5 w-5',
    iconWrapper: 'px-3.5',
  },
};

const textareaSizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-xs rounded-lg',
  md: 'px-3.5 py-2.5 text-sm rounded-lg',
  lg: 'px-4 py-3 text-base rounded-xl',
};

const resizeStyles: Record<string, string> = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
};

// ============================================
// Shared base input styles
// ============================================

const baseInputStyles = cn(
  // Layout
  'w-full',
  // Colors (dark theme)
  'bg-dark-800/50 text-white placeholder-dark-500',
  // Border
  'border border-dark-700',
  // Transitions
  'transition-all duration-200',
  // Focus
  'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none',
  // Hover
  'hover:border-dark-600',
  // Disabled
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-dark-700',
  // Read-only
  'read-only:bg-dark-800/30 read-only:cursor-default read-only:hover:border-dark-700',
);

const errorInputStyles = cn(
  'border-danger-500/50',
  'focus:border-danger-500 focus:ring-danger-500/20',
  'hover:border-danger-500/70',
);

// ============================================
// Input Component
// ============================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      inputSize = 'md',
      leftIcon,
      rightIcon,
      isRequired = false,
      fullWidth = true,
      wrapperClassName,
      labelClassName,
      inputClassName,
      className,
      id: propId,
      disabled,
      readOnly,
      type = 'text',
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const id = propId || autoId;
    const hasError = !!error;
    const sizes = sizeStyles[inputSize];

    return (
      <div
        className={cn(
          'flex flex-col',
          fullWidth && 'w-full',
          wrapperClassName,
        )}
      >
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'block font-medium text-dark-200',
              sizes.label,
              labelClassName,
            )}
          >
            {label}
            {isRequired && (
              <span className="ml-0.5 text-danger-400" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {/* Input wrapper (for icons) */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div
              className={cn(
                'pointer-events-none absolute inset-y-0 left-0 flex items-center',
                sizes.iconWrapper,
              )}
            >
              <span
                className={cn(
                  'transition-colors',
                  sizes.icon,
                  hasError ? 'text-danger-400' : 'text-dark-500',
                )}
              >
                {leftIcon}
              </span>
            </div>
          )}

          {/* Input element */}
          <input
            ref={ref}
            id={id}
            type={type}
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${id}-error` : hint ? `${id}-hint` : undefined
            }
            className={cn(
              baseInputStyles,
              sizes.input,
              hasError && errorInputStyles,
              leftIcon && inputSize === 'sm' && 'pl-8',
              leftIcon && inputSize === 'md' && 'pl-10',
              leftIcon && inputSize === 'lg' && 'pl-11',
              rightIcon && inputSize === 'sm' && 'pr-8',
              rightIcon && inputSize === 'md' && 'pr-10',
              rightIcon && inputSize === 'lg' && 'pr-11',
              inputClassName,
              className,
            )}
            {...props}
          />

          {/* Right icon */}
          {rightIcon && (
            <div
              className={cn(
                'pointer-events-none absolute inset-y-0 right-0 flex items-center',
                sizes.iconWrapper,
              )}
            >
              <span
                className={cn(
                  'transition-colors',
                  sizes.icon,
                  hasError ? 'text-danger-400' : 'text-dark-500',
                )}
              >
                {rightIcon}
              </span>
            </div>
          )}
        </div>

        {/* Error message */}
        {hasError && (
          <p
            id={`${id}-error`}
            className="mt-1.5 flex items-center gap-1 text-xs text-danger-400"
            role="alert"
          >
            <HiOutlineExclamationCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {/* Hint text (shown only when there's no error) */}
        {!hasError && hint && (
          <p
            id={`${id}-hint`}
            className="mt-1.5 text-xs text-dark-500"
          >
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

// ============================================
// Textarea Component
// ============================================

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      inputSize = 'md',
      isRequired = false,
      fullWidth = true,
      wrapperClassName,
      labelClassName,
      inputClassName,
      className,
      id: propId,
      disabled,
      readOnly,
      resize = 'vertical',
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const id = propId || autoId;
    const hasError = !!error;
    const sizes = sizeStyles[inputSize];

    return (
      <div
        className={cn(
          'flex flex-col',
          fullWidth && 'w-full',
          wrapperClassName,
        )}
      >
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'block font-medium text-dark-200',
              sizes.label,
              labelClassName,
            )}
          >
            {label}
            {isRequired && (
              <span className="ml-0.5 text-danger-400" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {/* Textarea element */}
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          className={cn(
            baseInputStyles,
            textareaSizeStyles[inputSize],
            hasError && errorInputStyles,
            resizeStyles[resize],
            // Custom scrollbar for textarea
            'scrollbar-thin',
            inputClassName,
            className,
          )}
          {...props}
        />

        {/* Error message */}
        {hasError && (
          <p
            id={`${id}-error`}
            className="mt-1.5 flex items-center gap-1 text-xs text-danger-400"
            role="alert"
          >
            <HiOutlineExclamationCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {/* Hint text (shown only when there's no error) */}
        {!hasError && hint && (
          <p
            id={`${id}-hint`}
            className="mt-1.5 text-xs text-dark-500"
          >
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

// ============================================
// Select Component
// ============================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Label text displayed above the select */
  label?: string;
  /** Error message to display below the select */
  error?: string;
  /** Hint/helper text displayed below the select */
  hint?: string;
  /** Size variant of the select */
  inputSize?: InputSize;
  /** Whether the field is required */
  isRequired?: boolean;
  /** Whether the select should take the full width */
  fullWidth?: boolean;
  /** Placeholder option text */
  placeholder?: string;
  /** Array of options to render */
  options?: SelectOption[];
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Additional class name for the outer wrapper div */
  wrapperClassName?: string;
  /** Additional class name for the label element */
  labelClassName?: string;
  /** Additional class name for the select element */
  inputClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      inputSize = 'md',
      isRequired = false,
      fullWidth = true,
      placeholder,
      options = [],
      leftIcon,
      wrapperClassName,
      labelClassName,
      inputClassName,
      className,
      id: propId,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const id = propId || autoId;
    const hasError = !!error;
    const sizes = sizeStyles[inputSize];

    return (
      <div
        className={cn(
          'flex flex-col',
          fullWidth && 'w-full',
          wrapperClassName,
        )}
      >
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'block font-medium text-dark-200',
              sizes.label,
              labelClassName,
            )}
          >
            {label}
            {isRequired && (
              <span className="ml-0.5 text-danger-400" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {/* Select wrapper */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div
              className={cn(
                'pointer-events-none absolute inset-y-0 left-0 flex items-center',
                sizes.iconWrapper,
              )}
            >
              <span
                className={cn(
                  'transition-colors',
                  sizes.icon,
                  hasError ? 'text-danger-400' : 'text-dark-500',
                )}
              >
                {leftIcon}
              </span>
            </div>
          )}

          {/* Select element */}
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${id}-error` : hint ? `${id}-hint` : undefined
            }
            className={cn(
              baseInputStyles,
              sizes.input,
              hasError && errorInputStyles,
              leftIcon && inputSize === 'sm' && 'pl-8',
              leftIcon && inputSize === 'md' && 'pl-10',
              leftIcon && inputSize === 'lg' && 'pl-11',
              // Extra right padding for the dropdown arrow
              'pr-10',
              // Appearance reset for custom arrow
              'appearance-none',
              'cursor-pointer',
              inputClassName,
              className,
            )}
            {...props}
          >
            {/* Placeholder option */}
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}

            {/* Options from the options prop */}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}

            {/* Or render children directly */}
            {children}
          </select>

          {/* Custom dropdown arrow */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg
              className={cn(
                'h-4 w-4 transition-colors',
                hasError ? 'text-danger-400' : 'text-dark-500',
              )}
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
          </div>
        </div>

        {/* Error message */}
        {hasError && (
          <p
            id={`${id}-error`}
            className="mt-1.5 flex items-center gap-1 text-xs text-danger-400"
            role="alert"
          >
            <HiOutlineExclamationCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {/* Hint text */}
        {!hasError && hint && (
          <p
            id={`${id}-hint`}
            className="mt-1.5 text-xs text-dark-500"
          >
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

// ============================================
// Checkbox Component
// ============================================

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Label text displayed next to the checkbox */
  label?: string;
  /** Description text displayed below the label */
  description?: string;
  /** Error message */
  error?: string;
  /** Size variant */
  inputSize?: InputSize;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error,
      inputSize = 'md',
      className,
      id: propId,
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const id = propId || autoId;
    const hasError = !!error;

    const checkboxSize =
      inputSize === 'sm'
        ? 'h-3.5 w-3.5'
        : inputSize === 'lg'
          ? 'h-5 w-5'
          : 'h-4 w-4';

    return (
      <div className="flex flex-col">
        <div className="flex items-start gap-2.5">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            aria-invalid={hasError}
            className={cn(
              checkboxSize,
              'rounded border-dark-600 bg-dark-800',
              'text-primary-600',
              'focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-0',
              'cursor-pointer',
              'disabled:cursor-not-allowed disabled:opacity-50',
              hasError && 'border-danger-500/50',
              className,
            )}
            {...props}
          />
          {(label || description) && (
            <div className="flex flex-col">
              {label && (
                <label
                  htmlFor={id}
                  className={cn(
                    'cursor-pointer font-medium text-dark-200',
                    inputSize === 'sm' ? 'text-xs' : 'text-sm',
                  )}
                >
                  {label}
                </label>
              )}
              {description && (
                <p
                  className={cn(
                    'text-dark-500',
                    inputSize === 'sm' ? 'text-2xs' : 'text-xs',
                  )}
                >
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
        {hasError && (
          <p className="mt-1 flex items-center gap-1 text-xs text-danger-400" role="alert">
            <HiOutlineExclamationCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

// ============================================
// Toggle / Switch Component
// ============================================

export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Label text displayed next to the toggle */
  label?: string;
  /** Description text displayed below the label */
  description?: string;
  /** Size variant */
  inputSize?: InputSize;
  /** Whether the toggle is currently checked/on */
  isChecked?: boolean;
  /** Callback when the toggle state changes */
  onToggle?: (checked: boolean) => void;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  (
    {
      label,
      description,
      inputSize = 'md',
      isChecked,
      onToggle,
      className,
      id: propId,
      checked,
      onChange,
      disabled,
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const id = propId || autoId;

    const isOn = isChecked ?? checked ?? false;

    const trackSize =
      inputSize === 'sm'
        ? 'h-4 w-8'
        : inputSize === 'lg'
          ? 'h-7 w-13'
          : 'h-5 w-10';

    const thumbSize =
      inputSize === 'sm'
        ? 'h-3 w-3'
        : inputSize === 'lg'
          ? 'h-5.5 w-5.5'
          : 'h-4 w-4';

    const thumbTranslate =
      inputSize === 'sm'
        ? 'translate-x-4'
        : inputSize === 'lg'
          ? 'translate-x-6'
          : 'translate-x-5';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onToggle?.(e.target.checked);
    };

    return (
      <div className="flex items-start gap-3">
        {/* Hidden input for form compatibility */}
        <input
          ref={ref}
          type="checkbox"
          id={id}
          checked={isOn}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />

        {/* Visual toggle track */}
        <label
          htmlFor={id}
          className={cn(
            'relative inline-flex flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200',
            trackSize,
            isOn ? 'bg-primary-600' : 'bg-dark-600',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          {/* Toggle thumb / knob */}
          <span
            className={cn(
              'inline-block transform rounded-full bg-white shadow-sm transition-transform duration-200',
              thumbSize,
              isOn ? thumbTranslate : 'translate-x-0.5',
            )}
          />
        </label>

        {/* Label and description */}
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={id}
                className={cn(
                  'cursor-pointer font-medium text-dark-200',
                  inputSize === 'sm' ? 'text-xs' : 'text-sm',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p
                className={cn(
                  'text-dark-500',
                  inputSize === 'sm' ? 'text-2xs' : 'text-xs',
                  disabled && 'opacity-50',
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);

Toggle.displayName = 'Toggle';

// ============================================
// Exports
// ============================================

export default Input;
