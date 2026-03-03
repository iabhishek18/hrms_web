// ============================================
// Dashboard Routes
// ============================================
// Defines all API routes for the admin dashboard.
// These routes provide aggregated statistics, chart data,
// department breakdowns, attendance summaries, top performers,
// and recent activity feeds.
//
// All routes require authentication. Most routes are restricted
// to Admin and HR roles, with limited data available to employees.

import { Router } from 'express';

import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// ============================================
// All dashboard routes require authentication
// ============================================
router.use(authenticate);

// ============================================
// Main Dashboard Endpoints
// ============================================

/**
 * GET /api/dashboard
 * Returns the full dashboard payload with all widgets and chart data.
 * This is the primary endpoint used by the frontend dashboard page.
 * Access: Admin, HR
 */
router.get('/', authorize('ADMIN', 'HR'), DashboardController.getFullDashboard);

/**
 * GET /api/dashboard/stats
 * Returns summary statistics (employee counts, attendance rate, etc.)
 * Access: All authenticated users (employees get limited data)
 */
router.get('/stats', DashboardController.getStats);

// ============================================
// Department & Employee Breakdown
// ============================================

/**
 * GET /api/dashboard/department-breakdown
 * Returns employee distribution across departments.
 * Formatted for pie/donut chart rendering.
 * Access: Admin, HR
 */
router.get(
  '/department-breakdown',
  authorize('ADMIN', 'HR'),
  DashboardController.getDepartmentBreakdown,
);

// ============================================
// Attendance Widgets
// ============================================

/**
 * GET /api/dashboard/attendance-summary
 * Returns attendance summary for a given month/year.
 * Query: ?year=2024&month=6
 * Access: Admin, HR
 */
router.get(
  '/attendance-summary',
  authorize('ADMIN', 'HR'),
  DashboardController.getAttendanceSummary,
);

// ============================================
// Performance & Absence Widgets
// ============================================

/**
 * GET /api/dashboard/top-performers
 * Returns employees with the highest performance ratings.
 * Query: ?limit=5
 * Access: Admin, HR
 */
router.get(
  '/top-performers',
  authorize('ADMIN', 'HR'),
  DashboardController.getTopPerformers,
);

/**
 * GET /api/dashboard/top-absentees
 * Returns employees with the most absent days this month.
 * Query: ?limit=5&year=2024&month=6
 * Access: Admin, HR
 */
router.get(
  '/top-absentees',
  authorize('ADMIN', 'HR'),
  DashboardController.getTopAbsentees,
);

// ============================================
// Chart Data Endpoints
// ============================================

/**
 * GET /api/dashboard/charts/monthly-attendance
 * Returns monthly attendance trend data for bar/line charts.
 * Query: ?months=6
 * Access: Admin, HR
 */
router.get(
  '/charts/monthly-attendance',
  authorize('ADMIN', 'HR'),
  DashboardController.getMonthlyAttendanceChart,
);

/**
 * GET /api/dashboard/charts/leave-distribution
 * Returns leave type distribution for pie/donut charts.
 * Access: Admin, HR
 */
router.get(
  '/charts/leave-distribution',
  authorize('ADMIN', 'HR'),
  DashboardController.getLeaveDistribution,
);

// ============================================
// Activity Feed
// ============================================

/**
 * GET /api/dashboard/recent-activity
 * Returns a unified feed of recent system activity.
 * Query: ?limit=10
 * Access: Admin, HR
 */
router.get(
  '/recent-activity',
  authorize('ADMIN', 'HR'),
  DashboardController.getRecentActivity,
);

export default router;
