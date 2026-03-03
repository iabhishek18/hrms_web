// ============================================
// Utility Functions
// ============================================
// Provides commonly used utility functions across the frontend
// including className merging, date/currency formatting,
// color generation, and various helper functions.

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================
// Class Name Utility
// ============================================

/**
 * Merges class names using clsx and tailwind-merge.
 * This ensures that Tailwind CSS classes are properly merged
 * without conflicts (e.g., `p-4` and `p-2` will result in `p-2`).
 *
 * @param inputs - Class values to merge (strings, arrays, objects, etc.)
 * @returns Merged class name string
 *
 * @example
 * cn('px-4 py-2', 'bg-blue-500', isActive && 'bg-blue-700')
 * cn('text-sm', { 'font-bold': isBold, 'text-red-500': hasError })
 * cn('p-4', className) // Allows overriding default classes via props
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ============================================
// Date Formatting
// ============================================

/**
 * Formats a date string or Date object into a human-readable format.
 *
 * @param date - The date to format
 * @param format - The desired format
 * @returns Formatted date string or '—' if invalid
 */
export function formatDate(
  date: string | Date | null | undefined,
  format: 'short' | 'long' | 'relative' | 'date-only' | 'time-only' | 'datetime' = 'short',
): string {
  if (!date) return '—';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '—';

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

    case 'long':
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

    case 'relative':
      return getRelativeTime(d);

    case 'date-only':
      return d.toISOString().split('T')[0];

    case 'time-only':
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

    case 'datetime':
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

    default:
      return d.toLocaleDateString('en-US');
  }
}

/**
 * Returns a human-readable relative time string (e.g., "2 hours ago", "in 3 days").
 *
 * @param date - The date to compare against now
 * @returns Relative time string
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const isFuture = diffMs < 0;
  const prefix = isFuture ? 'in ' : '';
  const suffix = isFuture ? '' : ' ago';

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${prefix}${diffMin}m${suffix}`;
  if (diffHrs < 24) return `${prefix}${diffHrs}h${suffix}`;
  if (diffDays < 7) return `${prefix}${diffDays}d${suffix}`;
  if (diffWeeks < 5) return `${prefix}${diffWeeks}w${suffix}`;
  if (diffMonths < 12) return `${prefix}${diffMonths}mo${suffix}`;
  return `${prefix}${diffYears}y${suffix}`;
}

/**
 * Formats a time string (HH:MM) into 12-hour format with AM/PM.
 *
 * @param time - Time string in HH:MM format or a Date object
 * @returns Formatted time string (e.g., "9:30 AM")
 */
export function formatTime(time: string | Date | null | undefined): string {
  if (!time) return '—';

  if (typeof time === 'string' && !time.includes('T')) {
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return '—';
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  const d = typeof time === 'string' ? new Date(time) : time;
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ============================================
// Number / Currency Formatting
// ============================================

/**
 * Formats a number as currency.
 *
 * @param amount - The amount to format
 * @param currency - ISO 4217 currency code (default: 'INR')
 * @param locale - BCP 47 locale string (default: 'en-IN')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = 'INR',
  locale: string = 'en-IN',
): string {
  if (amount === null || amount === undefined) return '—';

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '—';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}

/**
 * Formats a number with commas and optional decimal places.
 *
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = 0,
): string {
  if (value === null || value === undefined) return '—';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats a decimal number as a percentage string.
 *
 * @param value - The percentage value (e.g., 85.5)
 * @param decimals - Decimal places to show (default: 1)
 * @returns Formatted percentage string (e.g., "85.5%")
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 1,
): string {
  if (value === null || value === undefined) return '—';
  if (isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats hours into a human-readable duration string.
 *
 * @param hours - Number of hours (can be decimal, e.g., 8.5)
 * @returns Formatted duration string (e.g., "8h 30m")
 */
export function formatDuration(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || isNaN(hours)) return '—';

  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (h === 0 && m === 0) return '0h';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ============================================
// String Utilities
// ============================================

/**
 * Truncates a string to a maximum length with an ellipsis.
 *
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Truncated string
 */
export function truncate(str: string | null | undefined, maxLength: number = 50): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param str - The string to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Converts a string to title case (each word capitalized).
 *
 * @param str - The string to convert
 * @returns Title-cased string
 */
export function titleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Returns initials from a name string (up to 2 characters).
 *
 * @param name - Full name string
 * @returns Uppercase initials (e.g., "JD" for "John Doe")
 */
export function getInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) return '??';

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns a full name from first and last name parts.
 *
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Combined full name
 */
export function getFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || '—';
}

/**
 * Converts an enum-style string to a human-readable label.
 * (e.g., "ON_LEAVE" → "On Leave", "FULL_TIME" → "Full Time")
 *
 * @param str - The enum string to humanize
 * @returns Human-readable string
 */
export function humanizeEnum(str: string | null | undefined): string {
  if (!str) return '—';
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// ============================================
// Color Utilities
// ============================================

/**
 * Returns a deterministic color based on a string input.
 * Useful for consistent avatar background colors.
 *
 * @param str - Input string (e.g., employee name or ID)
 * @returns A hex color string
 */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ('00' + value.toString(16)).slice(-2);
  }

  return color;
}

/**
 * Returns a Tailwind CSS color class based on a status string.
 * Used for rendering status badges consistently.
 *
 * @param status - The status string (e.g., "ACTIVE", "PENDING", "PRESENT")
 * @returns Object with bg, text, and dot color classes
 */
export function getStatusColor(status: string | null | undefined): {
  bg: string;
  text: string;
  dot: string;
  border: string;
} {
  const normalizedStatus = (status || '').toUpperCase().replace(/[\s-]/g, '_');

  const statusColors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    // Employee statuses
    ACTIVE: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      dot: 'bg-emerald-500',
      border: 'border-emerald-500/20',
    },
    INACTIVE: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      dot: 'bg-slate-400',
      border: 'border-slate-500/20',
    },
    ON_LEAVE: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-500',
      dot: 'bg-amber-500',
      border: 'border-amber-500/20',
    },
    TERMINATED: {
      bg: 'bg-red-500/10',
      text: 'text-red-500',
      dot: 'bg-red-500',
      border: 'border-red-500/20',
    },
    PROBATION: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      dot: 'bg-blue-400',
      border: 'border-blue-500/20',
    },

    // Leave statuses
    PENDING: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-500',
      dot: 'bg-amber-500',
      border: 'border-amber-500/20',
    },
    APPROVED: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      dot: 'bg-emerald-500',
      border: 'border-emerald-500/20',
    },
    REJECTED: {
      bg: 'bg-red-500/10',
      text: 'text-red-500',
      dot: 'bg-red-500',
      border: 'border-red-500/20',
    },
    CANCELLED: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      dot: 'bg-slate-400',
      border: 'border-slate-500/20',
    },

    // Attendance statuses
    PRESENT: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-500',
      dot: 'bg-emerald-500',
      border: 'border-emerald-500/20',
    },
    ABSENT: {
      bg: 'bg-red-500/10',
      text: 'text-red-500',
      dot: 'bg-red-500',
      border: 'border-red-500/20',
    },
    LATE: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-500',
      dot: 'bg-orange-500',
      border: 'border-orange-500/20',
    },
    HALF_DAY: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-500',
      dot: 'bg-yellow-500',
      border: 'border-yellow-500/20',
    },
    HOLIDAY: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      dot: 'bg-purple-400',
      border: 'border-purple-500/20',
    },
    WEEKEND: {
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      dot: 'bg-indigo-400',
      border: 'border-indigo-500/20',
    },
    UNMARKED: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-500',
      dot: 'bg-slate-500',
      border: 'border-slate-500/20',
    },

    // Priority levels
    LOW: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      dot: 'bg-slate-400',
      border: 'border-slate-500/20',
    },
    NORMAL: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      dot: 'bg-blue-400',
      border: 'border-blue-500/20',
    },
    HIGH: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-500',
      dot: 'bg-orange-500',
      border: 'border-orange-500/20',
    },
    URGENT: {
      bg: 'bg-red-500/10',
      text: 'text-red-500',
      dot: 'bg-red-500',
      border: 'border-red-500/20',
    },
  };

  return (
    statusColors[normalizedStatus] || {
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      dot: 'bg-slate-400',
      border: 'border-slate-500/20',
    }
  );
}

/**
 * Returns a Tailwind CSS gradient class for a given index.
 * Used for stat cards and chart items.
 *
 * @param index - The index to use for color selection
 * @returns Gradient class string
 */
export function getGradient(index: number): string {
  const gradients = [
    'from-indigo-500 to-indigo-600',
    'from-violet-500 to-violet-600',
    'from-pink-500 to-pink-600',
    'from-rose-500 to-rose-600',
    'from-orange-500 to-orange-600',
    'from-amber-500 to-amber-600',
    'from-emerald-500 to-emerald-600',
    'from-teal-500 to-teal-600',
    'from-cyan-500 to-cyan-600',
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-red-500 to-red-600',
  ];

  return gradients[index % gradients.length];
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Validates an email address format.
 *
 * @param email - Email string to validate
 * @returns true if the email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates that a string is a valid UUID.
 *
 * @param str - String to validate
 * @returns true if the string is a valid UUID v4
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ============================================
// Miscellaneous Utilities
// ============================================

/**
 * Creates a debounced version of a function.
 * The function will only execute after the specified delay
 * has passed since the last invocation.
 *
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 300,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Returns a promise that resolves after the specified delay.
 * Useful for adding artificial delays during development.
 *
 * @param ms - Milliseconds to wait
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Copies text to the clipboard and returns a success flag.
 *
 * @param text - The text to copy
 * @returns Promise that resolves to true if successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Generates a download for a blob of data.
 *
 * @param data - The data to download
 * @param filename - The filename for the download
 * @param mimeType - The MIME type (default: 'text/csv')
 */
export function downloadFile(
  data: string | Blob,
  filename: string,
  mimeType: string = 'text/csv',
): void {
  const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Clamps a number between a min and max value.
 *
 * @param value - The number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns The clamped number
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Safely parses a JSON string, returning a fallback value on failure.
 *
 * @param json - The JSON string to parse
 * @param fallback - Value to return if parsing fails
 * @returns Parsed value or the fallback
 */
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Picks specified keys from an object.
 *
 * @param obj - Source object
 * @param keys - Keys to pick
 * @returns New object with only the specified keys
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omits specified keys from an object.
 *
 * @param obj - Source object
 * @param keys - Keys to omit
 * @returns New object without the specified keys
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Returns true if the current environment is a browser (not SSR).
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Returns true if the user's system prefers dark mode.
 */
export function prefersDarkMode(): boolean {
  if (!isBrowser) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Generates an array of page numbers for pagination.
 *
 * @param currentPage - Current page number (1-based)
 * @param totalPages - Total number of pages
 * @param maxVisible - Maximum visible page buttons (default: 5)
 * @returns Array of page numbers and ellipsis markers (-1)
 */
export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5,
): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const halfVisible = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - halfVisible);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  const pages: number[] = [];

  if (start > 1) {
    pages.push(1);
    if (start > 2) {
      pages.push(-1); // Ellipsis marker
    }
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      pages.push(-1); // Ellipsis marker
    }
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Returns a greeting based on the current time of day.
 *
 * @returns Greeting string ("Good Morning", "Good Afternoon", "Good Evening")
 */
export function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Computes the percentage of a part relative to a total.
 *
 * @param part - The partial value
 * @param total - The total value
 * @param decimals - Decimal places (default: 1)
 * @returns The percentage value, or 0 if total is 0
 */
export function percentage(part: number, total: number, decimals: number = 1): number {
  if (total === 0) return 0;
  const result = (part / total) * 100;
  const factor = Math.pow(10, decimals);
  return Math.round(result * factor) / factor;
}

/**
 * Converts file size in bytes to a human-readable string.
 *
 * @param bytes - File size in bytes
 * @returns Human-readable file size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '—';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default cn;
