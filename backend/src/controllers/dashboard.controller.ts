// ============================================
// Dashboard Controller
// ============================================
// Handles HTTP requests for the admin dashboard endpoints.
// Returns aggregated statistics, chart data, department breakdowns,
// attendance summaries, top performers, and recent activity.
//
// All endpoints require authentication. Some data may be filtered
// based on the user's role (e.g., employees only see their own data).

import { Request, Response } from 'express';

import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { DashboardService } from '../services/dashboard.service';

// ============================================
// Controller Methods
// ============================================

/**
 * GET /api/dashboard/stats
 *
 * Returns the main dashboard statistics including:
 * - Total, active, inactive, and on-leave employee counts
 * - New hires this month
 * - Pending leave requests
 * - Today's attendance (present, absent, late)
 * - Overall attendance rate
 * - Department count
 *
 * Access: Admin, HR (full stats), Employee (limited stats)
 */
export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await DashboardService.getStats();

  // If the user is a regular employee, return limited stats
  if (req.user?.role === 'EMPLOYEE') {
    const limitedStats = {
      totalEmployees: stats.totalEmployees,
      activeEmployees: stats.activeEmployees,
      departments: stats.departments,
      attendanceRate: stats.attendanceRate,
    };

    return res.status(200).json(
      ApiResponse.success('Dashboard stats fetched successfully', limitedStats),
    );
  }

  return res.status(200).json(
    ApiResponse.success('Dashboard stats fetched successfully', stats),
  );
});

/**
 * GET /api/dashboard
 *
 * Returns the full dashboard payload containing all widgets and chart data.
 * This is the primary endpoint consumed by the frontend dashboard page.
 * Runs all sub-queries in parallel for optimal performance.
 *
 * Response includes:
 * - stats: Summary cards data
 * - departmentBreakdown: Employee count by department (for pie/donut chart)
 * - attendanceSummary: Monthly attendance rates and counts
 * - topPerformers: Highest-rated employees
 * - topAbsentees: Employees with most absences this month
 * - charts.monthlyAttendance: Past 6 months attendance trend (bar chart)
 * - charts.leaveDistribution: Leave type breakdown (pie chart)
 * - recentActivity: Latest activity feed items
 *
 * Access: Admin, HR
 */
export const getFullDashboard = asyncHandler(async (req: Request, res: Response) => {
  const dashboardData = await DashboardService.getFullDashboard();

  return res.status(200).json(
    ApiResponse.success('Dashboard data fetched successfully', dashboardData),
  );
});

/**
 * GET /api/dashboard/department-breakdown
 *
 * Returns employee distribution across departments.
 * Data is structured for rendering pie/donut charts with colors.
 *
 * Response shape:
 * [
 *   {
 *     departmentId: string,
 *     departmentName: string,
 *     departmentCode: string,
 *     employeeCount: number,
 *     activeCount: number,
 *     percentage: number,
 *     color: string
 *   }
 * ]
 *
 * Access: Admin, HR
 */
export const getDepartmentBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const breakdown = await DashboardService.getDepartmentBreakdown();

  return res.status(200).json(
    ApiResponse.success('Department breakdown fetched successfully', breakdown),
  );
});

/**
 * GET /api/dashboard/attendance-summary
 *
 * Returns the attendance summary for a given month/year.
 * If no query params are provided, defaults to the current month.
 *
 * Query params:
 *   - year (number, optional): The year to query (e.g., 2024)
 *   - month (number, optional): The month to query (1-12)
 *
 * Response includes:
 * - totalWorkingDays, presentCount, absentCount, lateCount, etc.
 * - Calculated rates: attendanceRate, onTimeRate, lateRate, absentRate
 *
 * Access: Admin, HR
 */
export const getAttendanceSummary = asyncHandler(async (req: Request, res: Response) => {
  const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
  const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;

  // Basic validation for year and month query params
  if (year !== undefined && (isNaN(year) || year < 2000 || year > 2100)) {
    return res.status(400).json(
      ApiResponse.error('Invalid year parameter. Must be between 2000 and 2100.'),
    );
  }

  if (month !== undefined && (isNaN(month) || month < 1 || month > 12)) {
    return res.status(400).json(
      ApiResponse.error('Invalid month parameter. Must be between 1 and 12.'),
    );
  }

  const summary = await DashboardService.getAttendanceSummary(year, month);

  return res.status(200).json(
    ApiResponse.success('Attendance summary fetched successfully', summary),
  );
});

/**
 * GET /api/dashboard/top-performers
 *
 * Returns the top-performing employees based on their
 * latest performance review ratings, sorted by rating descending.
 *
 * Query params:
 *   - limit (number, optional): Maximum results to return (default: 5, max: 20)
 *
 * Response shape:
 * [
 *   {
 *     employeeId: string,
 *     employeeName: string,
 *     designation: string,
 *     department: string,
 *     avatar: string | null,
 *     rating: number,
 *     reviewPeriod: string
 *   }
 * ]
 *
 * Access: Admin, HR
 */
export const getTopPerformers = asyncHandler(async (req: Request, res: Response) => {
  let limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

  // Clamp the limit to a reasonable range
  if (isNaN(limit) || limit < 1) {
    limit = 5;
  }
  if (limit > 20) {
    limit = 20;
  }

  const performers = await DashboardService.getTopPerformers(limit);

  return res.status(200).json(
    ApiResponse.success('Top performers fetched successfully', performers),
  );
});

/**
 * GET /api/dashboard/top-absentees
 *
 * Returns the employees with the most absent days in the
 * current month (or a specified month/year).
 *
 * Query params:
 *   - limit (number, optional): Maximum results (default: 5, max: 20)
 *   - year (number, optional): The year to query
 *   - month (number, optional): The month to query (1-12)
 *
 * Response shape:
 * [
 *   {
 *     employeeId: string,
 *     employeeName: string,
 *     designation: string,
 *     department: string,
 *     avatar: string | null,
 *     absentDays: number,
 *     totalDays: number,
 *     absentPercentage: number
 *   }
 * ]
 *
 * Access: Admin, HR
 */
export const getTopAbsentees = asyncHandler(async (req: Request, res: Response) => {
  let limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
  const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
  const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;

  // Clamp limit
  if (isNaN(limit) || limit < 1) {
    limit = 5;
  }
  if (limit > 20) {
    limit = 20;
  }

  const absentees = await DashboardService.getTopAbsentees(limit, year, month);

  return res.status(200).json(
    ApiResponse.success('Top absentees fetched successfully', absentees),
  );
});

/**
 * GET /api/dashboard/charts/monthly-attendance
 *
 * Returns monthly attendance trend data for the past N months.
 * Suitable for rendering bar/line charts on the dashboard.
 *
 * Query params:
 *   - months (number, optional): Number of past months to include (default: 6, max: 12)
 *
 * Response shape:
 * [
 *   {
 *     month: "Jan 2024",
 *     present: 120,
 *     absent: 15,
 *     late: 8,
 *     onLeave: 5
 *   },
 *   ...
 * ]
 *
 * Access: Admin, HR
 */
export const getMonthlyAttendanceChart = asyncHandler(async (req: Request, res: Response) => {
  let months = req.query.months ? parseInt(req.query.months as string, 10) : 6;

  // Clamp months to a reasonable range
  if (isNaN(months) || months < 1) {
    months = 6;
  }
  if (months > 12) {
    months = 12;
  }

  const chartData = await DashboardService.getMonthlyAttendanceChart(months);

  return res.status(200).json(
    ApiResponse.success('Monthly attendance chart data fetched successfully', chartData),
  );
});

/**
 * GET /api/dashboard/charts/leave-distribution
 *
 * Returns leave request distribution by type for the current year.
 * Suitable for rendering pie/donut charts.
 *
 * Response shape:
 * [
 *   {
 *     leaveType: "CASUAL",
 *     count: 45,
 *     percentage: 35.2,
 *     color: "#6366f1"
 *   },
 *   ...
 * ]
 *
 * Access: Admin, HR
 */
export const getLeaveDistribution = asyncHandler(async (req: Request, res: Response) => {
  const distribution = await DashboardService.getLeaveTypeDistribution();

  return res.status(200).json(
    ApiResponse.success('Leave distribution fetched successfully', distribution),
  );
});

/**
 * GET /api/dashboard/recent-activity
 *
 * Returns a unified feed of recent activity across the system,
 * including new leave requests, employee onboarding events,
 * and announcements.
 *
 * Query params:
 *   - limit (number, optional): Maximum activity items (default: 10, max: 50)
 *
 * Response shape:
 * [
 *   {
 *     id: string,
 *     type: "leave" | "attendance" | "employee" | "announcement",
 *     title: string,
 *     description: string,
 *     timestamp: string (ISO 8601),
 *     userId?: string,
 *     userName?: string
 *   },
 *   ...
 * ]
 *
 * Access: Admin, HR
 */
export const getRecentActivity = asyncHandler(async (req: Request, res: Response) => {
  let limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  // Clamp limit
  if (isNaN(limit) || limit < 1) {
    limit = 10;
  }
  if (limit > 50) {
    limit = 50;
  }

  const activity = await DashboardService.getRecentActivity(limit);

  return res.status(200).json(
    ApiResponse.success('Recent activity fetched successfully', activity),
  );
});

// ============================================
// Export all controller methods as a single object
// for convenient use in route definitions
// ============================================

export const DashboardController = {
  getStats,
  getFullDashboard,
  getDepartmentBreakdown,
  getAttendanceSummary,
  getTopPerformers,
  getTopAbsentees,
  getMonthlyAttendanceChart,
  getLeaveDistribution,
  getRecentActivity,
};

export default DashboardController;
