// ============================================
// Formatters — Date, Number, Currency utilities
// ============================================
// Centralized formatting functions used across all pages
// and components in the HRMS frontend application.

import { format, formatDistanceToNow, parseISO, isValid, differenceInDays } from 'date-fns';

// ============================================
// Date Formatters
// ============================================

/**
 * Safely parses a date value into a Date object.
 * Handles ISO strings, Date objects, timestamps, and null/undefined.
 */
export function toDate(value: string | Date | number | null | undefined): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value === 'number') {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }

  if (typeof value === 'string') {
    // Try ISO parse first (most common from API)
    try {
      const parsed = parseISO(value);
      if (isValid(parsed)) return parsed;
    } catch {
      // fall through
    }

    // Fallback to native Date constructor
    const fallback = new Date(value);
    return isValid(fallback) ? fallback : null;
  }

  return null;
}

/**
 * Formats a date into a short display format.
 * Example: "Jan 15, 2024"
 */
export function formatDate(
  value: string | Date | number | null | undefined,
  fallback: string = '—',
): string {
  const d = toDate(value);
  if (!d) return fallback;

  try {
    return format(d, 'MMM d, yyyy');
  } catch {
    return fallback;
  }
}

/**
 * Formats a date into a long display format.
 * Example: "January 15, 2024"
 */
export function formatDateLong(
  value: string | Date | number | null | undefined,
  fallback: string = '—',
): string {
  const d = toDate(value);
  if (!d) return fallback;

  try {
    return format(d, 'MMMM d, yyyy');
  } catch {
    return fallback;
  }
}

/**
 * Formats a date into date-only ISO format.
 * Example: "2024-01-15"
 */
export function formatDateISO(
  value: string | Date | number | null | undefined,
  fallback: string = '',
): string {
  const d = toDate(value);
  if (!d) return fallback;

  try {
    return format(d, 'yyyy-MM-dd');
  } catch {
    return fallback;
  }
}

/**
 * Formats a date into date + time display format.
 * Example: "Jan 15, 2024 at 10:30 AM"
 */
export function formatDateTime(
  value: string | Date | number | null | undefined,
  fallback: string = '—',
): string {
  const d = toDate(value);
  if (!d) return fallback;

  try {
    return format(d, "MMM d, yyyy 'at' h:mm a");
  } catch {
    return fallback;
  }
}

/**
 * Formats a date into time-only display format.
 * Example: "10:30 AM"
 */
export function formatTime(
  value: string | Date | number | null | undefined,
  fallback: string = '—',
): string {
  const d = toDate(value);
  if (!d) return fallback;

  try {
    return format(d, 'h:mm a');
  } catch {
    return fallback;
  }
}

/**
 * Formats a date as a relative time string.
 * Example: "2 hours ago", "3 days ago", "in 5 minutes"
 */
export function formatRelativeTime(
  value: string | Date | number | null | undefined,
  fallback: string = '—',
): string {
  const d = toDate(value);
  if (!d) return fallback;

  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return fallback;
  }
}

/**
 * Formats a date for form input fields (HTML date input).
 * Example: "2024-01-15"
 */
export function formatDateForInput(
  value: string | Date | number | null | undefined,
): string {
  const d = toDate(value);
  if (!d) return '';

  try {
    return format(d, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

/**
 * Formats a date for datetime-local form inputs.
 * Example: "2024-01-15T10:30"
 */
export function formatDateTimeForInput(
  value: string | Date | number | null | undefined,
): string {
  const d = toDate(value);
  if (!d) return '';

  try {
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}

/**
 * Returns the number of days between two dates.
 * Always returns a positive number.
 */
export function daysBetween(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
): number {
  const startDate = toDate(start);
  const endDate = toDate(end);

  if (!startDate || !endDate) return 0;

  return Math.abs(differenceInDays(endDate, startDate)) + 1; // Inclusive
}

/**
 * Returns the month and year label.
 * Example: "January 2024"
 */
export function formatMonthYear(
  value: string | Date | number | null | undefined,
  fallback: string = '—',
): string {
  const d = toDate(value);
  if (!d) return fallback;

  try {
    return format(d, 'MMMM yyyy');
  } catch {
    return fallback;
  }
}

/**
 * Returns a short month label.
 * Example: "Jan 2024"
 */
export function formatShortMonthYear(
  value: string | Date | number | null | undefined,
  fallback: string = '—',
): string {
  const d = toDate(value);
  if (!d) return fallback;

  try {
    return format(d, 'MMM yyyy');
  } catch {
    return fallback;
  }
}

// ============================================
// Number Formatters
// ============================================

/**
 * Formats a number with comma separators.
 * Example: 1234567 → "1,234,567"
 */
export function formatNumber(
  value: number | string | null | undefined,
  fallback: string = '—',
): string {
  if (value === null || value === undefined || value === '') return fallback;

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return fallback;

  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Formats a number as a compact string.
 * Example: 1500 → "1.5K", 1500000 → "1.5M"
 */
export function formatCompactNumber(
  value: number | string | null | undefined,
  fallback: string = '—',
): string {
  if (value === null || value === undefined || value === '') return fallback;

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return fallback;

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }

  return num.toString();
}

/**
 * Formats a number with a fixed number of decimal places.
 * Example: formatDecimal(3.14159, 2) → "3.14"
 */
export function formatDecimal(
  value: number | string | null | undefined,
  decimals: number = 2,
  fallback: string = '—',
): string {
  if (value === null || value === undefined || value === '') return fallback;

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return fallback;

  return num.toFixed(decimals);
}

/**
 * Formats a number as a percentage.
 * Example: formatPercent(85.5) → "85.5%"
 */
export function formatPercent(
  value: number | string | null | undefined,
  decimals: number = 1,
  fallback: string = '—',
): string {
  if (value === null || value === undefined || value === '') return fallback;

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return fallback;

  return `${num.toFixed(decimals)}%`;
}

/**
 * Formats hours worked.
 * Example: formatHours(8.5) → "8h 30m"
 */
export function formatHours(
  value: number | string | null | undefined,
  fallback: string = '—',
): string {
  if (value === null || value === undefined || value === '') return fallback;

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || num <= 0) return fallback;

  const hours = Math.floor(num);
  const minutes = Math.round((num - hours) * 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

// ============================================
// Currency Formatters
// ============================================

/**
 * Formats a number as Indian Rupees (INR) currency.
 * Example: formatCurrency(150000) → "₹1,50,000.00"
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = 'INR',
  locale: string = 'en-IN',
  fallback: string = '—',
): string {
  if (value === null || value === undefined || value === '') return fallback;

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return fallback;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}

/**
 * Formats salary with compact notation.
 * Example: formatSalaryCompact(1500000) → "₹15L"
 */
export function formatSalaryCompact(
  value: number | string | null | undefined,
  fallback: string = '—',
): string {
  if (value === null || value === undefined || value === '') return fallback;

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return fallback;

  if (num >= 10_000_000) {
    return `₹${(num / 10_000_000).toFixed(1).replace(/\.0$/, '')}Cr`;
  }
  if (num >= 100_000) {
    return `₹${(num / 100_000).toFixed(1).replace(/\.0$/, '')}L`;
  }
  if (num >= 1_000) {
    return `₹${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }

  return `₹${num}`;
}

// ============================================
// String Formatters
// ============================================

/**
 * Capitalizes the first letter of a string.
 * Example: capitalize("hello") → "Hello"
 */
export function capitalize(value: string | null | undefined): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * Converts a string to title case.
 * Example: titleCase("john doe") → "John Doe"
 */
export function titleCase(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats a full name from first and last name.
 * Example: formatFullName("John", "Doe") → "John Doe"
 */
export function formatFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback: string = '—',
): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ').trim() : fallback;
}

/**
 * Generates initials from a name (up to 2 characters).
 * Example: getInitials("John Doe") → "JD"
 */
export function getInitials(
  name: string | null | undefined,
  fallback: string = '??',
): string {
  if (!name || !name.trim()) return fallback;

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Truncates a string to a maximum length with an ellipsis.
 * Example: truncate("Hello World", 8) → "Hello..."
 */
export function truncate(
  value: string | null | undefined,
  maxLength: number = 50,
  suffix: string = '...',
): string {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return value.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Formats a phone number for display.
 * Example: formatPhone("+919876543210") → "+91 98765 43210"
 */
export function formatPhone(
  value: string | null | undefined,
  fallback: string = '—',
): string {
  if (!value) return fallback;

  // Remove all non-digit characters except leading +
  const cleaned = value.replace(/[^\d+]/g, '');

  if (cleaned.length < 7) return value; // Too short to format

  // Indian phone number with country code
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return `+91 ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`;
  }

  // 10-digit number
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }

  // Generic formatting with country code
  if (cleaned.startsWith('+') && cleaned.length > 10) {
    const countryCode = cleaned.slice(0, cleaned.length - 10);
    const number = cleaned.slice(-10);
    return `${countryCode} ${number.slice(0, 5)} ${number.slice(5)}`;
  }

  return value;
}

/**
 * Formats an employee ID for display.
 * Example: formatEmployeeId("EMP-0042") → "EMP-0042"
 */
export function formatEmployeeId(
  value: string | null | undefined,
  fallback: string = '—',
): string {
  return value || fallback;
}

// ============================================
// Status Formatters
// ============================================

/** Map of employee status to display labels */
const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
  PROBATION: 'Probation',
};

/** Map of leave status to display labels */
const LEAVE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

/** Map of leave type to display labels */
const LEAVE_TYPE_LABELS: Record<string, string> = {
  CASUAL: 'Casual Leave',
  SICK: 'Sick Leave',
  EARNED: 'Earned Leave',
  MATERNITY: 'Maternity Leave',
  PATERNITY: 'Paternity Leave',
  UNPAID: 'Unpaid Leave',
  COMPENSATORY: 'Compensatory Off',
};

/** Map of attendance status to display labels */
const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  HALF_DAY: 'Half Day',
  ON_LEAVE: 'On Leave',
  HOLIDAY: 'Holiday',
  WEEKEND: 'Weekend',
};

/** Map of roles to display labels */
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  HR: 'HR Manager',
  EMPLOYEE: 'Employee',
};

/**
 * Generic enum label formatter.
 * Looks up the value in the provided map, falling back to titleCase.
 */
function enumLabel(value: string | null | undefined, map: Record<string, string>): string {
  if (!value) return '—';
  return map[value] || titleCase(value.replace(/_/g, ' '));
}

export function formatEmployeeStatus(status: string | null | undefined): string {
  return enumLabel(status, EMPLOYEE_STATUS_LABELS);
}

export function formatLeaveStatus(status: string | null | undefined): string {
  return enumLabel(status, LEAVE_STATUS_LABELS);
}

export function formatLeaveType(type: string | null | undefined): string {
  return enumLabel(type, LEAVE_TYPE_LABELS);
}

export function formatAttendanceStatus(status: string | null | undefined): string {
  return enumLabel(status, ATTENDANCE_STATUS_LABELS);
}

export function formatRole(role: string | null | undefined): string {
  return enumLabel(role, ROLE_LABELS);
}

// ============================================
// Color Mappers (for status badges)
// ============================================

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary';

const EMPLOYEE_STATUS_COLORS: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  ON_LEAVE: 'warning',
  TERMINATED: 'danger',
  PROBATION: 'info',
};

const LEAVE_STATUS_COLORS: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

const ATTENDANCE_STATUS_COLORS: Record<string, BadgeVariant> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  LATE: 'warning',
  HALF_DAY: 'info',
  ON_LEAVE: 'primary',
  HOLIDAY: 'neutral',
  WEEKEND: 'neutral',
};

const ROLE_COLORS: Record<string, BadgeVariant> = {
  ADMIN: 'danger',
  HR: 'primary',
  EMPLOYEE: 'info',
};

export function getEmployeeStatusColor(status: string | null | undefined): BadgeVariant {
  return EMPLOYEE_STATUS_COLORS[status || ''] || 'neutral';
}

export function getLeaveStatusColor(status: string | null | undefined): BadgeVariant {
  return LEAVE_STATUS_COLORS[status || ''] || 'neutral';
}

export function getAttendanceStatusColor(status: string | null | undefined): BadgeVariant {
  return ATTENDANCE_STATUS_COLORS[status || ''] || 'neutral';
}

export function getRoleColor(role: string | null | undefined): BadgeVariant {
  return ROLE_COLORS[role || ''] || 'neutral';
}

// ============================================
// Miscellaneous Formatters
// ============================================

/**
 * Formats file size in bytes to a human-readable string.
 * Example: formatFileSize(1536) → "1.5 KB"
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes < 0) return '—';
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Formats a boolean value as "Yes" / "No".
 */
export function formatBoolean(
  value: boolean | null | undefined,
  trueLabel: string = 'Yes',
  falseLabel: string = 'No',
  fallback: string = '—',
): string {
  if (value === null || value === undefined) return fallback;
  return value ? trueLabel : falseLabel;
}

/**
 * Returns a deterministic color string from a name.
 * Useful for consistent avatar background colors.
 */
export function stringToColor(str: string): string {
  if (!str) return '#6366f1';

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#a855f7', '#ef4444',
    '#0ea5e9', '#10b981', '#f59e0b', '#e11d48',
  ];

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/**
 * Formats a gender enum to a display label.
 */
export function formatGender(gender: string | null | undefined): string {
  if (!gender) return '—';
  const map: Record<string, string> = {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other',
  };
  return map[gender] || gender;
}

/**
 * Formats a marital status enum to a display label.
 */
export function formatMaritalStatus(status: string | null | undefined): string {
  if (!status) return '—';
  const map: Record<string, string> = {
    SINGLE: 'Single',
    MARRIED: 'Married',
    DIVORCED: 'Divorced',
    WIDOWED: 'Widowed',
  };
  return map[status] || status;
}

/**
 * Formats employment type for display.
 */
export function formatEmploymentType(type: string | null | undefined): string {
  return type || '—';
}

/**
 * Pluralizes a word based on count.
 * Example: pluralize(3, "day") → "3 days"
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  const word = count === 1 ? singular : (plural || `${singular}s`);
  return `${count} ${word}`;
}

/**
 * Returns "today", "yesterday", or a formatted date.
 * Useful for activity feeds and recent items.
 */
export function formatSmartDate(
  value: string | Date | number | null | undefined,
  fallback: string = '—',
): string {
  const d = toDate(value);
  if (!d) return fallback;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = differenceInDays(today, target);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDate(d, fallback);
}
