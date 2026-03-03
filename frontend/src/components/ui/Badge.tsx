// ============================================
// Badge UI Component
// ============================================
// A versatile badge/tag component with:
//   - Multiple color variants (primary, success, danger, warning, info, neutral, accent)
//   - Multiple sizes (xs, sm, md, lg)
//   - Optional status dot indicator
//   - Removable variant with close button
//   - Pill (fully rounded) and default (rounded-md) shapes
//   - Pre-built status presets for employee, leave, attendance statuses
//   - Icon support (left icon)
//   - Outline variant
//   - Dark theme compatible
//   - Composable and lightweight

import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { HiOutlineXMark } from 'react-icons/hi2';

// ============================================
// Types
// ============================================

export type BadgeVariant =
  | 'primary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'accent';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export type BadgeShape = 'pill' | 'rounded';

export type BadgeStyle = 'solid' | 'outline' | 'subtle';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color variant of the badge */
  variant?: BadgeVariant;
  /** Size of the badge */
  size?: BadgeSize;
  /** Shape of the badge */
  shape?: BadgeShape;
  /** Visual style: solid background, outline border, or subtle tinted background */
  badgeStyle?: BadgeStyle;
  /** Whether to show a colored dot indicator before the text */
  dot?: boolean;
  /** Whether the badge is removable (shows a close/X button) */
  removable?: boolean;
  /** Callback fired when the remove button is clicked */
  onRemove?: () => void;
  /** Icon element rendered before the text (left side) */
  icon?: React.ReactNode;
  /** Whether the badge is interactive/clickable */
  clickable?: boolean;
  /** Render as a different HTML element */
  as?: 'span' | 'div' | 'button';
}

// ============================================
// Style Maps
// ============================================

// Subtle style (default) — tinted background with matching text color
const subtleVariantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  success: 'bg-success-500/10 text-success-400 border-success-500/20',
  danger: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
  warning: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
  info: 'bg-info-500/10 text-info-400 border-info-500/20',
  neutral: 'bg-dark-700/50 text-dark-300 border-dark-600/50',
  accent: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
};

// Solid style — filled background with white text
const solidVariantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-600 text-white border-primary-600',
  success: 'bg-success-600 text-white border-success-600',
  danger: 'bg-danger-600 text-white border-danger-600',
  warning: 'bg-warning-600 text-white border-warning-600',
  info: 'bg-info-600 text-white border-info-600',
  neutral: 'bg-dark-600 text-dark-100 border-dark-600',
  accent: 'bg-accent-600 text-white border-accent-600',
};

// Outline style — transparent background with colored border and text
const outlineVariantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-transparent text-primary-400 border-primary-500/40',
  success: 'bg-transparent text-success-400 border-success-500/40',
  danger: 'bg-transparent text-danger-400 border-danger-500/40',
  warning: 'bg-transparent text-warning-400 border-warning-500/40',
  info: 'bg-transparent text-info-400 border-info-500/40',
  neutral: 'bg-transparent text-dark-300 border-dark-500/40',
  accent: 'bg-transparent text-accent-400 border-accent-500/40',
};

// Dot color per variant
const dotColorStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-400',
  success: 'bg-success-400',
  danger: 'bg-danger-400',
  warning: 'bg-warning-400',
  info: 'bg-info-400',
  neutral: 'bg-dark-400',
  accent: 'bg-accent-400',
};

// Size styles
const sizeStyles: Record<BadgeSize, string> = {
  xs: 'h-4.5 px-1.5 text-2xs gap-1',
  sm: 'h-5 px-2 text-2xs gap-1',
  md: 'h-6 px-2.5 text-xs gap-1.5',
  lg: 'h-7 px-3 text-sm gap-1.5',
};

// Dot sizes
const dotSizeStyles: Record<BadgeSize, string> = {
  xs: 'h-1 w-1',
  sm: 'h-1.5 w-1.5',
  md: 'h-1.5 w-1.5',
  lg: 'h-2 w-2',
};

// Icon sizes
const iconSizeStyles: Record<BadgeSize, string> = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

// Close button sizes
const closeSizeStyles: Record<BadgeSize, string> = {
  xs: 'h-3 w-3 -mr-0.5',
  sm: 'h-3.5 w-3.5 -mr-0.5',
  md: 'h-4 w-4 -mr-0.5',
  lg: 'h-4 w-4 -mr-0.5',
};

// Shape styles
const shapeStyles: Record<BadgeShape, string> = {
  pill: 'rounded-full',
  rounded: 'rounded-md',
};

// ============================================
// Badge Component
// ============================================

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      className,
      variant = 'neutral',
      size = 'md',
      shape = 'pill',
      badgeStyle = 'subtle',
      dot = false,
      removable = false,
      onRemove,
      icon,
      clickable = false,
      as: Component = 'span',
      onClick,
      ...props
    },
    ref,
  ) => {
    // Select the appropriate style map based on badgeStyle
    const variantStyleMap =
      badgeStyle === 'solid'
        ? solidVariantStyles
        : badgeStyle === 'outline'
          ? outlineVariantStyles
          : subtleVariantStyles;

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    };

    return (
      <Component
        ref={ref as any}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center',
          'font-medium',
          'border',
          'whitespace-nowrap',
          'select-none',
          'transition-colors duration-150',
          // Variant colors
          variantStyleMap[variant],
          // Size
          sizeStyles[size],
          // Shape
          shapeStyles[shape],
          // Clickable / interactive
          clickable && 'cursor-pointer hover:opacity-80 active:opacity-70',
          // Removable — add slight extra right padding for close button space
          removable && size === 'xs' && 'pr-1',
          removable && size === 'sm' && 'pr-1.5',
          removable && size === 'md' && 'pr-1.5',
          removable && size === 'lg' && 'pr-2',
          className,
        )}
        onClick={onClick}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        {...props}
      >
        {/* Status dot indicator */}
        {dot && (
          <span
            className={cn(
              'flex-shrink-0 rounded-full',
              dotSizeStyles[size],
              dotColorStyles[variant],
            )}
            aria-hidden="true"
          />
        )}

        {/* Left icon */}
        {!dot && icon && (
          <span
            className={cn(
              'flex-shrink-0 inline-flex',
              iconSizeStyles[size],
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        {/* Badge text / content */}
        {children && <span className="truncate">{children}</span>}

        {/* Remove / close button */}
        {removable && (
          <button
            type="button"
            onClick={handleRemove}
            className={cn(
              'flex-shrink-0 inline-flex items-center justify-center rounded-full',
              'transition-colors duration-150',
              'hover:bg-white/10 focus-visible:outline-none',
              'cursor-pointer',
              closeSizeStyles[size],
            )}
            aria-label="Remove"
          >
            <HiOutlineXMark className="h-full w-full" />
          </button>
        )}
      </Component>
    );
  },
);

Badge.displayName = 'Badge';

// ============================================
// Status Badge Presets
// ============================================
// Pre-configured badge configurations for common
// HRMS status values. Returns the appropriate variant
// and optional dot for each status.

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'dot'> {
  /** The status value (case-insensitive) */
  status: string;
  /** Whether to show a dot indicator (default: true) */
  showDot?: boolean;
  /** Custom label override (default: derived from status) */
  label?: string;
}

// Employee status → badge variant mapping
const EMPLOYEE_STATUS_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  ACTIVE: { variant: 'success', label: 'Active' },
  INACTIVE: { variant: 'neutral', label: 'Inactive' },
  ON_LEAVE: { variant: 'info', label: 'On Leave' },
  TERMINATED: { variant: 'danger', label: 'Terminated' },
  PROBATION: { variant: 'warning', label: 'Probation' },
};

// Leave status → badge variant mapping
const LEAVE_STATUS_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  PENDING: { variant: 'warning', label: 'Pending' },
  APPROVED: { variant: 'success', label: 'Approved' },
  REJECTED: { variant: 'danger', label: 'Rejected' },
  CANCELLED: { variant: 'neutral', label: 'Cancelled' },
};

// Attendance status → badge variant mapping
const ATTENDANCE_STATUS_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  PRESENT: { variant: 'success', label: 'Present' },
  ABSENT: { variant: 'danger', label: 'Absent' },
  LATE: { variant: 'warning', label: 'Late' },
  HALF_DAY: { variant: 'info', label: 'Half Day' },
  ON_LEAVE: { variant: 'accent', label: 'On Leave' },
  HOLIDAY: { variant: 'primary', label: 'Holiday' },
  WEEKEND: { variant: 'neutral', label: 'Weekend' },
};

// Role → badge variant mapping
const ROLE_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  ADMIN: { variant: 'primary', label: 'Admin' },
  HR: { variant: 'accent', label: 'HR' },
  EMPLOYEE: { variant: 'success', label: 'Employee' },
};

// Leave type → badge variant mapping
const LEAVE_TYPE_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  CASUAL: { variant: 'info', label: 'Casual' },
  SICK: { variant: 'danger', label: 'Sick' },
  EARNED: { variant: 'success', label: 'Earned' },
  MATERNITY: { variant: 'accent', label: 'Maternity' },
  PATERNITY: { variant: 'primary', label: 'Paternity' },
  UNPAID: { variant: 'neutral', label: 'Unpaid' },
  COMPENSATORY: { variant: 'warning', label: 'Compensatory' },
};

// Announcement priority → badge variant mapping
const PRIORITY_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  LOW: { variant: 'neutral', label: 'Low' },
  NORMAL: { variant: 'info', label: 'Normal' },
  HIGH: { variant: 'warning', label: 'High' },
  URGENT: { variant: 'danger', label: 'Urgent' },
};

// Combined lookup across all status maps
const ALL_STATUS_MAPS: Record<string, { variant: BadgeVariant; label: string }> = {
  ...EMPLOYEE_STATUS_MAP,
  ...LEAVE_STATUS_MAP,
  ...ATTENDANCE_STATUS_MAP,
  ...ROLE_MAP,
  ...LEAVE_TYPE_MAP,
  ...PRIORITY_MAP,
};

/**
 * StatusBadge — A convenience wrapper that automatically selects
 * the correct variant and label based on a status string.
 *
 * Usage:
 * ```tsx
 * <StatusBadge status="ACTIVE" />
 * <StatusBadge status="PENDING" showDot />
 * <StatusBadge status="ADMIN" label="Administrator" />
 * ```
 */
export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  (
    {
      status,
      showDot = true,
      label: customLabel,
      size = 'sm',
      shape = 'pill',
      badgeStyle = 'subtle',
      ...props
    },
    ref,
  ) => {
    const normalizedStatus = status?.toUpperCase().trim() || '';
    const config = ALL_STATUS_MAPS[normalizedStatus] || {
      variant: 'neutral' as BadgeVariant,
      label: status
        ? status
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Unknown',
    };

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        size={size}
        shape={shape}
        badgeStyle={badgeStyle}
        dot={showDot}
        {...props}
      >
        {customLabel || config.label}
      </Badge>
    );
  },
);

StatusBadge.displayName = 'StatusBadge';

// ============================================
// Specialized Status Badge Components
// ============================================
// These provide even more specific typing for
// each status domain (employee, leave, attendance, role).

export interface EmployeeStatusBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PROBATION' | string;
}

export function EmployeeStatusBadge({ status, ...props }: EmployeeStatusBadgeProps) {
  const config = EMPLOYEE_STATUS_MAP[status.toUpperCase()] || {
    variant: 'neutral' as BadgeVariant,
    label: status,
  };
  return (
    <Badge variant={config.variant} dot size="sm" {...props}>
      {props.label || config.label}
    </Badge>
  );
}

EmployeeStatusBadge.displayName = 'EmployeeStatusBadge';

export interface LeaveStatusBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;
}

export function LeaveStatusBadge({ status, ...props }: LeaveStatusBadgeProps) {
  const config = LEAVE_STATUS_MAP[status.toUpperCase()] || {
    variant: 'neutral' as BadgeVariant,
    label: status,
  };
  return (
    <Badge variant={config.variant} dot size="sm" {...props}>
      {props.label || config.label}
    </Badge>
  );
}

LeaveStatusBadge.displayName = 'LeaveStatusBadge';

export interface AttendanceStatusBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKEND' | string;
}

export function AttendanceStatusBadge({ status, ...props }: AttendanceStatusBadgeProps) {
  const config = ATTENDANCE_STATUS_MAP[status.toUpperCase()] || {
    variant: 'neutral' as BadgeVariant,
    label: status,
  };
  return (
    <Badge variant={config.variant} dot size="sm" {...props}>
      {props.label || config.label}
    </Badge>
  );
}

AttendanceStatusBadge.displayName = 'AttendanceStatusBadge';

export interface RoleBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  role: 'ADMIN' | 'HR' | 'EMPLOYEE' | string;
}

export function RoleBadge({ role, ...props }: RoleBadgeProps) {
  const config = ROLE_MAP[role.toUpperCase()] || {
    variant: 'neutral' as BadgeVariant,
    label: role,
  };
  return (
    <Badge variant={config.variant} size="sm" badgeStyle="subtle" {...props}>
      {props.label || config.label}
    </Badge>
  );
}

RoleBadge.displayName = 'RoleBadge';

export interface LeaveTypeBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  leaveType: string;
}

export function LeaveTypeBadge({ leaveType, ...props }: LeaveTypeBadgeProps) {
  const config = LEAVE_TYPE_MAP[leaveType.toUpperCase()] || {
    variant: 'neutral' as BadgeVariant,
    label: leaveType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  };
  return (
    <Badge variant={config.variant} size="sm" badgeStyle="subtle" {...props}>
      {props.label || config.label}
    </Badge>
  );
}

LeaveTypeBadge.displayName = 'LeaveTypeBadge';

// ============================================
// Badge Group Component
// ============================================
// Renders multiple badges in a horizontally-wrapped flex container
// with consistent spacing.

export interface BadgeGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Gap between badges */
  gap?: 'xs' | 'sm' | 'md';
  /** Whether to wrap badges to the next line */
  wrap?: boolean;
}

const gapStyles: Record<string, string> = {
  xs: 'gap-1',
  sm: 'gap-1.5',
  md: 'gap-2',
};

export const BadgeGroup = forwardRef<HTMLDivElement, BadgeGroupProps>(
  (
    {
      children,
      className,
      gap = 'sm',
      wrap = true,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center',
          gapStyles[gap],
          wrap && 'flex-wrap',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

BadgeGroup.displayName = 'BadgeGroup';

// ============================================
// Notification Dot Component
// ============================================
// A simple colored dot used as a notification indicator,
// typically positioned absolutely on a parent element.

export interface NotificationDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color variant */
  variant?: BadgeVariant;
  /** Size of the dot */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the ping animation */
  ping?: boolean;
  /** Numeric count to display inside the dot (turns it into a count badge) */
  count?: number;
  /** Max count to display (shows "99+" if exceeded) */
  maxCount?: number;
}

const notificationDotSizes: Record<string, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

const notificationCountSizes: Record<string, string> = {
  sm: 'h-4 min-w-[16px] px-1 text-2xs',
  md: 'h-5 min-w-[20px] px-1.5 text-2xs',
  lg: 'h-6 min-w-[24px] px-2 text-xs',
};

const notificationDotColors: Record<BadgeVariant, string> = {
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  danger: 'bg-danger-500',
  warning: 'bg-warning-500',
  info: 'bg-info-500',
  neutral: 'bg-dark-400',
  accent: 'bg-accent-500',
};

const notificationPingColors: Record<BadgeVariant, string> = {
  primary: 'bg-primary-400',
  success: 'bg-success-400',
  danger: 'bg-danger-400',
  warning: 'bg-warning-400',
  info: 'bg-info-400',
  neutral: 'bg-dark-300',
  accent: 'bg-accent-400',
};

export const NotificationDot = forwardRef<HTMLSpanElement, NotificationDotProps>(
  (
    {
      className,
      variant = 'danger',
      size = 'md',
      ping = false,
      count,
      maxCount = 99,
      ...props
    },
    ref,
  ) => {
    // If count is provided, render as a count badge instead of a dot
    if (count !== undefined && count > 0) {
      const displayCount = count > maxCount ? `${maxCount}+` : String(count);

      return (
        <span
          ref={ref}
          className={cn(
            'inline-flex items-center justify-center rounded-full font-bold text-white',
            notificationCountSizes[size],
            notificationDotColors[variant],
            className,
          )}
          {...props}
        >
          {displayCount}
        </span>
      );
    }

    return (
      <span
        ref={ref}
        className={cn(
          'relative inline-flex',
          notificationDotSizes[size],
          className,
        )}
        {...props}
      >
        {/* Ping animation ring */}
        {ping && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              notificationPingColors[variant],
            )}
            aria-hidden="true"
          />
        )}
        {/* Solid dot */}
        <span
          className={cn(
            'relative inline-flex h-full w-full rounded-full',
            notificationDotColors[variant],
          )}
        />
      </span>
    );
  },
);

NotificationDot.displayName = 'NotificationDot';

// ============================================
// Exports
// ============================================

export default Badge;
