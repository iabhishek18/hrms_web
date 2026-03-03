// ============================================
// Dashboard API Service
// ============================================
// Provides typed API functions for all dashboard
// endpoints. Used by the dashboard Redux slice and
// the Dashboard page to fetch stats, charts, and widgets.

import { api } from './client';

// ============================================
// Types
// ============================================

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  onLeaveToday: number;
  totalDepartments: number;
  pendingLeaveRequests: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  attendanceRate: number;
  newJoineesThisMonth: number;
}

export interface DepartmentBreakdown {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  employeeCount: number;
  activeCount: number;
  color?: string;
  percentage?: number;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  holiday: number;
  unmarked: number;
  attendanceRate: number;
  onTimeRate: number;
  date?: string;
  month?: number;
  year?: number;
}

export interface TopPerformer {
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
  rating: number;
  reviewPeriod: string;
}

export interface TopAbsentee {
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
  absentDays: number;
  totalDays: number;
  absentRate?: number;
}

export interface MonthlyAttendanceData {
  month: string;
  monthNumber: number;
  year: number;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  total: number;
}

export interface LeaveDistribution {
  leaveType: string;
  count: number;
  percentage: number;
  color?: string;
}

export interface RecentActivity {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  userId: string | null;
  userEmail: string | null;
  createdAt: string;
}

export interface FullDashboardData {
  stats: DashboardStats;
  departmentBreakdown: DepartmentBreakdown[];
  attendanceSummary: AttendanceSummary;
  topPerformers: TopPerformer[];
  topAbsentees: TopAbsentee[];
  monthlyAttendance: MonthlyAttendanceData[];
  leaveDistribution: LeaveDistribution[];
  recentActivity: RecentActivity[];
}

// ============================================
// Dashboard API Functions
// ============================================

export const dashboardApi = {
  /**
   * GET /api/dashboard
   * Returns the full dashboard payload with all widgets and chart data.
   * This is the primary endpoint used by the frontend dashboard page.
   */
  getFullDashboard: (params?: { period?: string; departmentId?: string }) =>
    api.get<FullDashboardData>('/dashboard', params as Record<string, unknown>),

  /**
   * GET /api/dashboard/stats
   * Returns summary statistics (employee counts, attendance rate, etc.)
   * Accessible by all authenticated users (employees get limited data).
   */
  getStats: () =>
    api.get<DashboardStats>('/dashboard/stats'),

  /**
   * GET /api/dashboard/department-breakdown
   * Returns employee distribution across departments.
   * Formatted for pie/donut chart rendering.
   */
  getDepartmentBreakdown: () =>
    api.get<DepartmentBreakdown[]>('/dashboard/department-breakdown'),

  /**
   * GET /api/dashboard/attendance-summary
   * Returns attendance summary for a given month/year.
   * Query: ?year=2024&month=6
   */
  getAttendanceSummary: (params?: { year?: number; month?: number }) =>
    api.get<AttendanceSummary>('/dashboard/attendance-summary', params as Record<string, unknown>),

  /**
   * GET /api/dashboard/top-performers
   * Returns employees with the highest performance ratings.
   * Query: ?limit=5
   */
  getTopPerformers: (limit: number = 5) =>
    api.get<TopPerformer[]>('/dashboard/top-performers', { limit }),

  /**
   * GET /api/dashboard/top-absentees
   * Returns employees with the most absent days this month.
   * Query: ?limit=5&year=2024&month=6
   */
  getTopAbsentees: (params?: { limit?: number; year?: number; month?: number }) =>
    api.get<TopAbsentee[]>('/dashboard/top-absentees', params as Record<string, unknown>),

  /**
   * GET /api/dashboard/charts/monthly-attendance
   * Returns monthly attendance trend data for bar/line charts.
   * Query: ?months=6
   */
  getMonthlyAttendanceChart: (months: number = 6) =>
    api.get<MonthlyAttendanceData[]>('/dashboard/charts/monthly-attendance', { months }),

  /**
   * GET /api/dashboard/charts/leave-distribution
   * Returns leave type distribution for pie/donut charts.
   */
  getLeaveDistribution: () =>
    api.get<LeaveDistribution[]>('/dashboard/charts/leave-distribution'),

  /**
   * GET /api/dashboard/recent-activity
   * Returns a unified feed of recent system activity.
   * Query: ?limit=10
   */
  getRecentActivity: (limit: number = 10) =>
    api.get<RecentActivity[]>('/dashboard/recent-activity', { limit }),
};

export default dashboardApi;
