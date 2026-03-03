// ============================================
// Attendance Routes
// ============================================
// Defines all API routes for attendance management.
// Routes are organized by access level:
//   - Authenticated (any role): clock in/out, today status, own records
//   - Admin/HR: manual entry, bulk operations, summaries, delete
//
// Base path: /api/attendance

import { Router } from 'express';

import { AttendanceController } from '../controllers/attendance.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  clockInSchema,
  clockOutSchema,
  manualAttendanceSchema,
  attendanceFilterSchema,
} from '../utils/validators';

const router = Router();

// ============================================
// All routes require authentication
// ============================================
router.use(authenticate);

// ============================================
// Employee Self-Service Routes
// (Any authenticated user)
// ============================================

/**
 * POST /api/attendance/clock-in
 * Record clock-in for the current user
 */
router.post(
  '/clock-in',
  validate(clockInSchema),
  AttendanceController.clockIn,
);

/**
 * POST /api/attendance/clock-out
 * Record clock-out for the current user
 */
router.post(
  '/clock-out',
  validate(clockOutSchema),
  AttendanceController.clockOut,
);

/**
 * GET /api/attendance/today
 * Get today's attendance status for the current user
 */
router.get(
  '/today',
  AttendanceController.getTodayStatus,
);

/**
 * GET /api/attendance/my-summary
 * Get attendance summary for the current user
 * Query: ?year=2024&month=6
 */
router.get(
  '/my-summary',
  (req, _res, next) => {
    // Redirect to the summary endpoint with the user's employee ID
    if (req.user?.employeeId) {
      req.params.employeeId = req.user.employeeId;
    }
    next();
  },
  AttendanceController.getEmployeeSummary,
);

/**
 * GET /api/attendance/my-calendar
 * Get monthly calendar view for the current user
 * Query: ?year=2024&month=6
 */
router.get(
  '/my-calendar',
  (req, _res, next) => {
    if (req.user?.employeeId) {
      req.params.employeeId = req.user.employeeId;
    }
    next();
  },
  AttendanceController.getMonthlyCalendar,
);

// ============================================
// Admin/HR Only Routes
// (Require ADMIN or HR role)
// ============================================

/**
 * POST /api/attendance/manual
 * Create or update a manual attendance entry
 * Body: { employeeId, date, clockIn?, clockOut?, status, notes? }
 */
router.post(
  '/manual',
  authorize('ADMIN', 'HR'),
  validate(manualAttendanceSchema),
  AttendanceController.createManual,
);

/**
 * POST /api/attendance/bulk
 * Bulk mark attendance for multiple employees
 * Body: { date, status, employeeIds?, notes? }
 */
router.post(
  '/bulk',
  authorize('ADMIN', 'HR'),
  AttendanceController.bulkMark,
);

/**
 * GET /api/attendance/department-summary
 * Get today's attendance broken down by department
 */
router.get(
  '/department-summary',
  authorize('ADMIN', 'HR'),
  AttendanceController.getDepartmentSummary,
);

/**
 * GET /api/attendance/overall-summary
 * Get organization-wide attendance summary for today
 */
router.get(
  '/overall-summary',
  authorize('ADMIN', 'HR'),
  AttendanceController.getOverallSummary,
);

/**
 * GET /api/attendance/summary/:employeeId
 * Get attendance summary for a specific employee
 * Query: ?year=2024&month=6
 * Access: Admin/HR can view any; employees can view their own
 */
router.get(
  '/summary/:employeeId',
  AttendanceController.getEmployeeSummary,
);

/**
 * GET /api/attendance/calendar/:employeeId
 * Get monthly calendar view for a specific employee
 * Query: ?year=2024&month=6
 * Access: Admin/HR can view any; employees can view their own
 */
router.get(
  '/calendar/:employeeId',
  AttendanceController.getMonthlyCalendar,
);

// ============================================
// General Attendance Routes
// ============================================

/**
 * GET /api/attendance
 * List attendance records with filtering and pagination
 * Query: ?page=1&limit=10&sortBy=date&sortOrder=desc&employeeId=...&date=...&status=...
 * Access: Admin/HR see all; employees see only their own
 */
router.get(
  '/',
  AttendanceController.list,
);

/**
 * GET /api/attendance/:id
 * Get a single attendance record by ID
 * Access: Admin/HR can view any; employees can view their own
 */
router.get(
  '/:id',
  AttendanceController.getById,
);

/**
 * DELETE /api/attendance/:id
 * Delete an attendance record
 * Access: Admin only
 */
router.delete(
  '/:id',
  authorize('ADMIN'),
  AttendanceController.delete,
);

export default router;
