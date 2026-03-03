// ============================================
// Attendance API Service
// ============================================
// Provides typed API functions for all attendance management
// endpoints. Used by the attendance Redux slice and attendance pages.

import { api } from './client';

// ============================================
// Types
// ============================================

export interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKEND';
  notes: string | null;
  ipAddress: string | null;
  location: string | null;
  employeeId: string;
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    designation: string;
    avatar: string | null;
    department: {
      id: string;
      name: string;
    } | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ClockInPayload {
  notes?: string;
  location?: string;
}

export interface ClockOutPayload {
  notes?: string;
}

export interface ManualAttendancePayload {
  employeeId: string;
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: string;
  notes?: string;
}

export interface BulkAttendancePayload {
  date: string;
  status: string;
  employeeIds?: string[];
  notes?: string;
}

export interface TodayStatus {
  id: string | null;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  status: string | null;
  notes: string | null;
  isClockedIn: boolean;
  isClockedOut: boolean;
}

export interface AttendanceListParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AttendanceSummary {
  employeeId: string;
  employeeName: string;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
  weekend: number;
  averageHours: number;
  attendanceRate: number;
  month?: number;
  year?: number;
}

export interface DepartmentAttendanceSummary {
  departmentId: string;
  departmentName: string;
  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  attendanceRate: number;
}

export interface OverallAttendanceSummary {
  date: string;
  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
  unmarked: number;
  attendanceRate: number;
  onTimeRate: number;
}

export interface MonthlyCalendarDay {
  date: string;
  status: string | null;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  notes: string | null;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ============================================
// Attendance API Functions
// ============================================

export const attendanceApi = {
  /**
   * GET /api/attendance
   * List attendance records with filtering and pagination.
   * Admin/HR see all; employees see only their own.
   */
  list: (params?: AttendanceListParams) =>
    api.get<{ data: AttendanceRecord[]; meta: PaginationMeta }>(
      '/attendance',
      params as Record<string, unknown>,
    ),

  /**
   * GET /api/attendance/:id
   * Get a single attendance record by ID.
   */
  getById: (id: string) =>
    api.get<AttendanceRecord>(`/attendance/${id}`),

  /**
   * POST /api/attendance/clock-in
   * Record clock-in for the current user.
   * Automatically records the current timestamp.
   */
  clockIn: (payload?: ClockInPayload) =>
    api.post<AttendanceRecord>('/attendance/clock-in', payload || {}),

  /**
   * POST /api/attendance/clock-out
   * Record clock-out for the current user.
   * Calculates total hours worked since clock-in.
   */
  clockOut: (payload?: ClockOutPayload) =>
    api.post<AttendanceRecord>('/attendance/clock-out', payload || {}),

  /**
   * GET /api/attendance/today
   * Get today's attendance status for the current user.
   * Returns clock-in/out times and whether user has already clocked in/out.
   */
  getTodayStatus: () =>
    api.get<TodayStatus>('/attendance/today'),

  /**
   * GET /api/attendance/my-summary
   * Get attendance summary for the current user.
   * Query: ?year=2024&month=6
   */
  getMySummary: (params?: { year?: number; month?: number }) =>
    api.get<AttendanceSummary>(
      '/attendance/my-summary',
      params as Record<string, unknown>,
    ),

  /**
   * GET /api/attendance/my-calendar
   * Get monthly calendar view for the current user.
   * Query: ?year=2024&month=6
   */
  getMyCalendar: (params?: { year?: number; month?: number }) =>
    api.get<MonthlyCalendarDay[]>(
      '/attendance/my-calendar',
      params as Record<string, unknown>,
    ),

  /**
   * POST /api/attendance/manual
   * Create or update a manual attendance entry. Admin/HR only.
   * Body: { employeeId, date, clockIn?, clockOut?, status, notes? }
   */
  createManual: (payload: ManualAttendancePayload) =>
    api.post<AttendanceRecord>('/attendance/manual', payload),

  /**
   * POST /api/attendance/bulk
   * Bulk mark attendance for multiple employees. Admin/HR only.
   * Body: { date, status, employeeIds?, notes? }
   */
  bulkMark: (payload: BulkAttendancePayload) =>
    api.post<{ count: number }>('/attendance/bulk', payload),

  /**
   * GET /api/attendance/department-summary
   * Get today's attendance broken down by department. Admin/HR only.
   */
  getDepartmentSummary: () =>
    api.get<DepartmentAttendanceSummary[]>('/attendance/department-summary'),

  /**
   * GET /api/attendance/overall-summary
   * Get organization-wide attendance summary for today. Admin/HR only.
   */
  getOverallSummary: () =>
    api.get<OverallAttendanceSummary>('/attendance/overall-summary'),

  /**
   * GET /api/attendance/summary/:employeeId
   * Get attendance summary for a specific employee.
   * Query: ?year=2024&month=6
   * Admin/HR can view any; employees can view their own.
   */
  getEmployeeSummary: (
    employeeId: string,
    params?: { year?: number; month?: number },
  ) =>
    api.get<AttendanceSummary>(
      `/attendance/summary/${employeeId}`,
      params as Record<string, unknown>,
    ),

  /**
   * GET /api/attendance/calendar/:employeeId
   * Get monthly calendar view for a specific employee.
   * Query: ?year=2024&month=6
   * Admin/HR can view any; employees can view their own.
   */
  getEmployeeCalendar: (
    employeeId: string,
    params?: { year?: number; month?: number },
  ) =>
    api.get<MonthlyCalendarDay[]>(
      `/attendance/calendar/${employeeId}`,
      params as Record<string, unknown>,
    ),

  /**
   * DELETE /api/attendance/:id
   * Delete an attendance record. Admin only.
   */
  delete: (id: string) =>
    api.delete<null>(`/attendance/${id}`),
};

export default attendanceApi;
