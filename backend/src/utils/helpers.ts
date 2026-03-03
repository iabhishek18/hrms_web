// ============================================
// General Helper Utilities
// ============================================
// Provides commonly used utility functions across the application
// including date formatting, ID generation, currency formatting,
// pagination helpers, and query building utilities.

import { Prisma } from '@prisma/client';

// ============================================
// Date Utilities
// ============================================

/**
 * Formats a Date object into a human-readable string.
 *
 * @param date - The date to format
 * @param format - The desired format ('short', 'long', 'iso', 'date-only', 'time-only')
 * @returns Formatted date string
 *
 * @example
 *   formatDate(new Date(), 'short')      // "Jan 15, 2024"
 *   formatDate(new Date(), 'long')       // "January 15, 2024, 10:30 AM"
 *   formatDate(new Date(), 'iso')        // "2024-01-15T10:30:00.000Z"
 *   formatDate(new Date(), 'date-only')  // "2024-01-15"
 *   formatDate(new Date(), 'time-only')  // "10:30 AM"
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: 'short' | 'long' | 'iso' | 'date-only' | 'time-only' = 'short',
): string {
  if (!date) {
    return '—';
  }

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return '—';
  }

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

    case 'long':
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

    case 'iso':
      return d.toISOString();

    case 'date-only':
      return d.toISOString().split('T')[0];

    case 'time-only':
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

    default:
      return d.toLocaleDateString('en-US');
  }
}

/**
 * Calculates the number of days between two dates (inclusive).
 * Accounts for same-day leave requests by returning 1.
 *
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns Number of days between the two dates (inclusive), minimum 1
 *
 * @example
 *   calculateDaysBetween('2024-01-15', '2024-01-17') // 3
 *   calculateDaysBetween('2024-01-15', '2024-01-15') // 1
 */
export function calculateDaysBetween(
  startDate: Date | string,
  endDate: Date | string,
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // Normalize to midnight to avoid time-zone issues
  const startNormalized = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endNormalized = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  const diffMs = Math.abs(endNormalized.getTime() - startNormalized.getTime());
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Inclusive count: same day = 1 day
  return diffDays + 1;
}

/**
 * Calculates the number of working days (excluding weekends) between two dates.
 *
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns Number of working days (Mon-Fri) between the two dates, inclusive
 */
export function calculateWorkingDays(
  startDate: Date | string,
  endDate: Date | string,
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);

  let count = 0;
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (current <= last) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Returns the financial year string for a given date.
 * Assumes April-March financial year (common in many countries).
 *
 * @param date - The date to determine the financial year for
 * @returns Financial year string, e.g., "2023-2024"
 *
 * @example
 *   getFinancialYear(new Date('2024-02-15')) // "2023-2024"
 *   getFinancialYear(new Date('2024-06-15')) // "2024-2025"
 */
export function getFinancialYear(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const month = d.getMonth(); // 0-indexed: 0 = January, 3 = April
  const year = d.getFullYear();

  if (month >= 3) {
    // April onwards: current year to next year
    return `${year}-${year + 1}`;
  } else {
    // January to March: previous year to current year
    return `${year - 1}-${year}`;
  }
}

/**
 * Checks whether a given date falls on a weekend (Saturday or Sunday).
 *
 * @param date - The date to check
 * @returns true if the date is a Saturday or Sunday
 */
export function isWeekend(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Returns the start and end of a given day (midnight to 23:59:59.999).
 * Useful for querying attendance records for a specific date.
 *
 * @param date - The date to get bounds for
 * @returns Object with `start` and `end` Date objects
 */
export function getDayBounds(date: Date | string = new Date()): { start: Date; end: Date } {
  const d = typeof date === 'string' ? new Date(date) : date;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
}

/**
 * Returns the start and end of a given month.
 *
 * @param year - The year
 * @param month - The month (1-12, NOT 0-indexed)
 * @returns Object with `start` and `end` Date objects
 */
export function getMonthBounds(
  year: number,
  month: number,
): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999); // day 0 of next month = last day of this month
  return { start, end };
}

/**
 * Calculates the total hours between two timestamps.
 *
 * @param clockIn - Clock-in time
 * @param clockOut - Clock-out time
 * @returns Hours worked as a float (e.g., 8.5 for 8 hours 30 minutes), rounded to 2 decimals
 */
export function calculateHoursWorked(
  clockIn: Date | string,
  clockOut: Date | string,
): number {
  const start = typeof clockIn === 'string' ? new Date(clockIn) : clockIn;
  const end = typeof clockOut === 'string' ? new Date(clockOut) : clockOut;

  const diffMs = end.getTime() - start.getTime();

  if (diffMs <= 0) {
    return 0;
  }

  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

// ============================================
// ID Generation
// ============================================

/**
 * Generates a sequential employee ID with a given prefix.
 * Queries the database for the latest employee ID and increments.
 *
 * Format: EMP-0001, EMP-0002, ...
 *
 * @param lastEmployeeId - The most recent employee ID in the database (e.g., "EMP-0042"), or null if none exist
 * @param prefix - The prefix for the ID (default: "EMP")
 * @returns The next employee ID string
 *
 * @example
 *   generateEmployeeId(null)          // "EMP-0001"
 *   generateEmployeeId("EMP-0042")    // "EMP-0043"
 *   generateEmployeeId("HR-0010", "HR") // "HR-0011"
 */
export function generateEmployeeId(
  lastEmployeeId: string | null,
  prefix: string = 'EMP',
): string {
  if (!lastEmployeeId) {
    return `${prefix}-0001`;
  }

  // Extract the numeric part after the prefix and dash
  const parts = lastEmployeeId.split('-');
  const numericPart = parts.length > 1 ? parts[parts.length - 1] : '0000';
  const lastNumber = parseInt(numericPart, 10);

  if (isNaN(lastNumber)) {
    return `${prefix}-0001`;
  }

  const nextNumber = lastNumber + 1;
  const paddedNumber = nextNumber.toString().padStart(4, '0');

  return `${prefix}-${paddedNumber}`;
}

/**
 * Generates a unique reference number for leave requests.
 * Format: LV-YYYYMMDD-XXXX (e.g., LV-20240115-0001)
 *
 * @param sequence - Sequence number for the day
 * @returns Leave reference string
 */
export function generateLeaveReference(sequence: number = 1): string {
  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  return `LV-${dateStr}-${sequence.toString().padStart(4, '0')}`;
}

// ============================================
// Currency Formatting
// ============================================

/**
 * Formats a numeric value as a currency string.
 *
 * @param amount - The numeric amount to format
 * @param currency - ISO 4217 currency code (default: "INR")
 * @param locale - BCP 47 locale string (default: "en-IN")
 * @returns Formatted currency string (e.g., "₹1,50,000.00")
 *
 * @example
 *   formatCurrency(150000)                  // "₹1,50,000.00"
 *   formatCurrency(75000, 'USD', 'en-US')   // "$75,000.00"
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = 'INR',
  locale: string = 'en-IN',
): string {
  if (amount === null || amount === undefined) {
    return '—';
  }

  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return '—';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    // Fallback if Intl is not available or currency code is invalid
    return `${currency} ${numericAmount.toFixed(2)}`;
  }
}

// ============================================
// Pagination Helpers
// ============================================

/**
 * Calculates pagination offset and metadata from page/limit params.
 *
 * @param page - Current page number (1-based)
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata object
 */
export function paginate(
  page: number,
  limit: number,
  total: number,
): {
  skip: number;
  take: number;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const totalPages = Math.ceil(total / safeLimit);

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}

// ============================================
// Query Building Helpers
// ============================================

/**
 * Builds a Prisma-compatible `where` clause from a set of filter parameters.
 * Supports text search across multiple fields, exact-match filters,
 * date range filters, and enum filters.
 *
 * @param filters - Object containing filter key-value pairs
 * @param config - Configuration specifying how each field should be filtered
 * @returns A Prisma `where` object
 *
 * @example
 *   const where = buildWhereClause(
 *     { search: 'John', status: 'ACTIVE', departmentId: 'uuid-here' },
 *     {
 *       searchFields: ['firstName', 'lastName', 'email'],
 *       exactFields: ['status', 'departmentId'],
 *     }
 *   );
 */
export function buildWhereClause(
  filters: Record<string, any>,
  config: {
    searchFields?: string[];
    exactFields?: string[];
    dateRangeFields?: { field: string; startKey: string; endKey: string }[];
  },
): Record<string, any> {
  const where: Record<string, any> = {};
  const andConditions: Record<string, any>[] = [];

  // Text search across multiple fields (OR condition)
  if (config.searchFields && filters.search && String(filters.search).trim()) {
    const searchTerm = String(filters.search).trim();
    andConditions.push({
      OR: config.searchFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      })),
    });
  }

  // Exact match filters
  if (config.exactFields) {
    for (const field of config.exactFields) {
      if (filters[field] !== undefined && filters[field] !== null && filters[field] !== '') {
        where[field] = filters[field];
      }
    }
  }

  // Date range filters
  if (config.dateRangeFields) {
    for (const { field, startKey, endKey } of config.dateRangeFields) {
      const dateFilter: Record<string, Date> = {};

      if (filters[startKey]) {
        dateFilter.gte = new Date(filters[startKey]);
      }
      if (filters[endKey]) {
        dateFilter.lte = new Date(filters[endKey]);
      }

      if (Object.keys(dateFilter).length > 0) {
        where[field] = dateFilter;
      }
    }
  }

  // Combine AND conditions if any
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

// ============================================
// String Utilities
// ============================================

/**
 * Converts a string to title case.
 *
 * @param str - The input string
 * @returns Title-cased string
 *
 * @example
 *   toTitleCase('john doe')   // "John Doe"
 *   toTitleCase('HELLO world') // "Hello World"
 */
export function toTitleCase(str: string): string {
  if (!str) {
    return '';
  }
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Creates a full name from first and last name parts.
 *
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Combined full name, trimmed
 */
export function getFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || '—';
}

/**
 * Generates initials from a name (up to 2 characters).
 *
 * @param name - Full name string
 * @returns Uppercase initials (e.g., "JD" for "John Doe")
 */
export function getInitials(name: string): string {
  if (!name || !name.trim()) {
    return '??';
  }

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============================================
// Miscellaneous Utilities
// ============================================

/**
 * Picks only the specified keys from an object.
 * Useful for sanitizing request bodies or database results.
 *
 * @param obj - Source object
 * @param keys - Array of keys to pick
 * @returns A new object containing only the specified keys
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
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
 * Omits the specified keys from an object.
 *
 * @param obj - Source object
 * @param keys - Array of keys to omit
 * @returns A new object without the specified keys
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
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
 * Safely parses a JSON string, returning a default value on failure.
 *
 * @param jsonString - The JSON string to parse
 * @param defaultValue - Value to return if parsing fails
 * @returns Parsed object or the default value
 */
export function safeJsonParse<T = unknown>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Delays execution for a specified number of milliseconds.
 * Useful for testing loading states and retry logic.
 *
 * @param ms - Milliseconds to wait
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clamps a number between a minimum and maximum value.
 *
 * @param value - The number to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns The clamped number
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generates a random hex color string.
 * Useful for assigning default avatar colors to employees.
 *
 * @returns A hex color string (e.g., "#a3b4c5")
 */
export function randomColor(): string {
  const letters = '0123456789abcdef';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/**
 * Returns a deterministic color based on a string input.
 * Useful for consistent avatar background colors per employee.
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
 * Rounds a number to the specified number of decimal places.
 *
 * @param value - Number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded number
 */
export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Computes the percentage of a part relative to a total.
 *
 * @param part - The partial value
 * @param total - The total value
 * @param decimals - Decimal places to round to (default: 1)
 * @returns The percentage value, or 0 if total is 0
 */
export function percentage(part: number, total: number, decimals: number = 1): number {
  if (total === 0) {
    return 0;
  }
  return roundTo((part / total) * 100, decimals);
}
