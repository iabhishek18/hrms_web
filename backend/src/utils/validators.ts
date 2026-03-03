// ============================================
// Zod Validation Schemas
// ============================================
// Centralized request validation schemas for all API endpoints.
// These schemas are used by the validation middleware to ensure
// incoming data meets the expected shape before reaching controllers.

import { z } from 'zod';

// ============================================
// Common / Shared Validators
// ============================================

/** Reusable UUID validator */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/** Pagination query params */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 10))),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional().default(''),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

/** Date string validator (ISO 8601 date) */
const dateStringSchema = z
  .string()
  .refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format. Use ISO 8601 (e.g., 2024-01-15)' },
  );

/** Phone number validator (basic international format) */
const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''))
  .nullable();

/** Password strength validator */
const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters long')
  .max(128, 'Password must not exceed 128 characters');

/** Strong password validator (for registration) */
const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

/** Email validator */
const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(1, 'Email is required')
  .max(255, 'Email must not exceed 255 characters')
  .transform((val) => val.toLowerCase().trim());

// ============================================
// Auth Validators
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: emailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(100, 'First name must not exceed 100 characters')
      .trim(),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(100, 'Last name must not exceed 100 characters')
      .trim(),
    role: z.enum(['ADMIN', 'HR', 'EMPLOYEE']).optional().default('EMPLOYEE'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: strongPasswordSchema,
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ============================================
// Employee Validators
// ============================================

export const createEmployeeSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must not exceed 100 characters')
    .trim(),
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: dateStringSchema.optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']).optional().nullable(),
  address: z.string().max(500, 'Address must not exceed 500 characters').optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),

  // Employment details
  designation: z
    .string()
    .min(1, 'Designation is required')
    .max(150, 'Designation must not exceed 150 characters')
    .trim(),
  departmentId: uuidSchema.optional().nullable(),
  managerId: uuidSchema.optional().nullable(),
  status: z
    .enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'PROBATION'])
    .optional()
    .default('ACTIVE'),
  joiningDate: dateStringSchema,
  confirmationDate: dateStringSchema.optional().nullable(),
  salary: z
    .number()
    .min(0, 'Salary cannot be negative')
    .max(99999999.99, 'Salary exceeds maximum value')
    .optional()
    .nullable(),
  employmentType: z
    .enum(['Full-Time', 'Part-Time', 'Contract', 'Intern'])
    .optional()
    .default('Full-Time'),

  // Emergency contact
  emergencyContactName: z.string().max(200).optional().nullable(),
  emergencyContactPhone: phoneSchema,
  emergencyContactRelation: z.string().max(100).optional().nullable(),

  // Bank details
  bankName: z.string().max(200).optional().nullable(),
  bankAccountNo: z.string().max(50).optional().nullable(),
  bankIfscCode: z.string().max(20).optional().nullable(),

  // Optional: create a user account for this employee
  createUserAccount: z.boolean().optional().default(false),
  password: passwordSchema.optional(),
  role: z.enum(['ADMIN', 'HR', 'EMPLOYEE']).optional().default('EMPLOYEE'),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema
  .omit({ createUserAccount: true, password: true, role: true })
  .partial();
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const employeeFilterSchema = paginationSchema.extend({
  departmentId: z.string().optional(),
  status: z
    .enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'PROBATION'])
    .optional(),
  employmentType: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
});
export type EmployeeFilterQuery = z.infer<typeof employeeFilterSchema>;

// ============================================
// Department Validators
// ============================================

export const createDepartmentSchema = z.object({
  name: z
    .string()
    .min(1, 'Department name is required')
    .max(200, 'Department name must not exceed 200 characters')
    .trim(),
  code: z
    .string()
    .min(1, 'Department code is required')
    .max(20, 'Department code must not exceed 20 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Code must contain only letters, numbers, hyphens, and underscores')
    .transform((val) => val.toUpperCase()),
  description: z.string().max(500).optional().nullable(),
  headId: uuidSchema.optional().nullable(),
  isActive: z.boolean().optional().default(true),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = createDepartmentSchema.partial();
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

// ============================================
// Leave Validators
// ============================================

export const applyLeaveSchema = z
  .object({
    leaveType: z.enum([
      'CASUAL',
      'SICK',
      'EARNED',
      'MATERNITY',
      'PATERNITY',
      'UNPAID',
      'COMPENSATORY',
    ]),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    reason: z
      .string()
      .min(10, 'Reason must be at least 10 characters long')
      .max(1000, 'Reason must not exceed 1000 characters')
      .trim(),
  })
  .refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'End date must be on or after the start date',
      path: ['endDate'],
    },
  );
export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;

export const updateLeaveStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
  remarks: z.string().max(500, 'Remarks must not exceed 500 characters').optional().nullable(),
});
export type UpdateLeaveStatusInput = z.infer<typeof updateLeaveStatusSchema>;

export const leaveFilterSchema = paginationSchema.extend({
  employeeId: z.string().optional(),
  leaveType: z
    .enum(['CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'PATERNITY', 'UNPAID', 'COMPENSATORY'])
    .optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type LeaveFilterQuery = z.infer<typeof leaveFilterSchema>;

export const leaveBalanceSchema = z.object({
  employeeId: uuidSchema,
  leaveType: z.enum([
    'CASUAL',
    'SICK',
    'EARNED',
    'MATERNITY',
    'PATERNITY',
    'UNPAID',
    'COMPENSATORY',
  ]),
  totalLeaves: z.number().min(0, 'Total leaves cannot be negative').max(365),
  year: z
    .number()
    .int()
    .min(2020, 'Year must be 2020 or later')
    .max(2100, 'Year must be 2100 or earlier'),
});
export type LeaveBalanceInput = z.infer<typeof leaveBalanceSchema>;

// ============================================
// Attendance Validators
// ============================================

export const clockInSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
});
export type ClockInInput = z.infer<typeof clockInSchema>;

export const clockOutSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
});
export type ClockOutInput = z.infer<typeof clockOutSchema>;

export const manualAttendanceSchema = z.object({
  employeeId: uuidSchema,
  date: dateStringSchema,
  clockIn: z.string().optional().nullable(),
  clockOut: z.string().optional().nullable(),
  status: z.enum([
    'PRESENT',
    'ABSENT',
    'LATE',
    'HALF_DAY',
    'ON_LEAVE',
    'HOLIDAY',
    'WEEKEND',
  ]),
  notes: z.string().max(500).optional().nullable(),
});
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;

export const attendanceFilterSchema = paginationSchema.extend({
  employeeId: z.string().optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z
    .enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'HOLIDAY', 'WEEKEND'])
    .optional(),
});
export type AttendanceFilterQuery = z.infer<typeof attendanceFilterSchema>;

// ============================================
// Profile Validators
// ============================================

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  phone: phoneSchema,
  dateOfBirth: dateStringSchema.optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED']).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),
  emergencyContactName: z.string().max(200).optional().nullable(),
  emergencyContactPhone: phoneSchema,
  emergencyContactRelation: z.string().max(100).optional().nullable(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ============================================
// Settings Validators
// ============================================

export const updateSettingSchema = z.object({
  key: z
    .string()
    .min(1, 'Setting key is required')
    .max(100, 'Key must not exceed 100 characters')
    .regex(/^[a-z][a-z0-9_.]+$/i, 'Key must start with a letter and contain only letters, numbers, dots, and underscores'),
  value: z.string().min(0).max(5000, 'Value must not exceed 5000 characters'),
  group: z
    .string()
    .max(50)
    .optional()
    .default('general'),
  description: z.string().max(500).optional().nullable(),
});
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;

export const bulkUpdateSettingsSchema = z.object({
  settings: z
    .array(updateSettingSchema)
    .min(1, 'At least one setting is required')
    .max(50, 'Cannot update more than 50 settings at once'),
});
export type BulkUpdateSettingsInput = z.infer<typeof bulkUpdateSettingsSchema>;

// ============================================
// Holiday Validators
// ============================================

export const createHolidaySchema = z.object({
  name: z
    .string()
    .min(1, 'Holiday name is required')
    .max(200, 'Name must not exceed 200 characters')
    .trim(),
  date: dateStringSchema,
  description: z.string().max(500).optional().nullable(),
  isOptional: z.boolean().optional().default(false),
  year: z.number().int().min(2020).max(2100),
});
export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;

export const updateHolidaySchema = createHolidaySchema.partial();
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;

// ============================================
// Announcement Validators
// ============================================

export const createAnnouncementSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(300, 'Title must not exceed 300 characters')
    .trim(),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content must not exceed 10000 characters'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  isActive: z.boolean().optional().default(true),
  expiresAt: dateStringSchema.optional().nullable(),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = createAnnouncementSchema.partial();
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

// ============================================
// Performance Review Validators
// ============================================

export const createPerformanceReviewSchema = z.object({
  employeeId: uuidSchema,
  reviewPeriod: z
    .string()
    .min(1, 'Review period is required')
    .max(50)
    .trim(),
  rating: z
    .number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must not exceed 5'),
  strengths: z.string().max(2000).optional().nullable(),
  areasToImprove: z.string().max(2000).optional().nullable(),
  goals: z.string().max(2000).optional().nullable(),
  comments: z.string().max(2000).optional().nullable(),
});
export type CreatePerformanceReviewInput = z.infer<typeof createPerformanceReviewSchema>;

export const updatePerformanceReviewSchema = createPerformanceReviewSchema
  .omit({ employeeId: true })
  .partial();
export type UpdatePerformanceReviewInput = z.infer<typeof updatePerformanceReviewSchema>;

// ============================================
// ID Param Validator (for route params)
// ============================================

export const idParamSchema = z.object({
  id: uuidSchema,
});
export type IdParam = z.infer<typeof idParamSchema>;

// ============================================
// Dashboard Query Validators
// ============================================

export const dashboardQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year', 'all']).optional().default('month'),
  departmentId: z.string().optional(),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
