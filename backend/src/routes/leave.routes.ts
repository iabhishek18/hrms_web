// ============================================
// Leave Management Routes
// ============================================
// Defines all API routes for leave management operations
// including applying, approving, rejecting, cancelling leaves,
// and querying leave balances and statistics.
//
// Route prefix: /api/leaves
//
// Authentication is required for all routes.
// Role-based access is enforced where needed.

import { Router } from 'express';

import { LeaveController } from '../controllers/leave.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  applyLeaveSchema,
  updateLeaveStatusSchema,
  leaveFilterSchema,
  leaveBalanceSchema,
} from '../utils/validators';

const router = Router();

// ============================================
// All routes require authentication
// ============================================
router.use(authenticate);

// ============================================
// Employee Leave Routes
// ============================================

/**
 * GET /api/leaves/my-leaves
 * Get the authenticated employee's own leave requests.
 * Must be defined BEFORE the /:id route to avoid conflict.
 */
router.get('/my-leaves', LeaveController.getMyLeaves);

/**
 * GET /api/leaves/balance
 * Get the authenticated employee's leave balance for the current year.
 */
router.get('/balance', LeaveController.getLeaveBalance);

/**
 * GET /api/leaves/balance/:employeeId
 * Get leave balance for a specific employee.
 * Employees can only view their own; Admin/HR can view any.
 */
router.get('/balance/:employeeId', LeaveController.getLeaveBalance);

/**
 * POST /api/leaves
 * Apply for leave (authenticated employee applies for themselves).
 * Body: { leaveType, startDate, endDate, reason }
 */
router.post(
  '/',
  validate(applyLeaveSchema),
  LeaveController.applyLeave,
);

// ============================================
// Admin / HR Routes
// ============================================

/**
 * GET /api/leaves/stats
 * Get leave statistics for the dashboard.
 * Access: Admin, HR
 */
router.get(
  '/stats',
  authorize('ADMIN', 'HR'),
  LeaveController.getLeaveStats,
);

/**
 * POST /api/leaves/on-behalf
 * Apply leave on behalf of an employee.
 * Access: Admin, HR
 */
router.post(
  '/on-behalf',
  authorize('ADMIN', 'HR'),
  validate(applyLeaveSchema),
  LeaveController.applyLeaveOnBehalf,
);

/**
 * PUT /api/leaves/balance
 * Set or update leave balance for an employee.
 * Access: Admin, HR
 */
router.put(
  '/balance',
  authorize('ADMIN', 'HR'),
  validate(leaveBalanceSchema),
  LeaveController.setLeaveBalance,
);

/**
 * POST /api/leaves/initialize-balances
 * Initialize leave balances for all active employees for a given year.
 * Access: Admin only
 */
router.post(
  '/initialize-balances',
  authorize('ADMIN'),
  LeaveController.initializeYearlyBalances,
);

// ============================================
// Leave CRUD Routes (parameterized)
// ============================================

/**
 * GET /api/leaves
 * List all leave requests with filtering, search, and pagination.
 * Employees see only their own; Admin/HR see all.
 */
router.get('/', LeaveController.listLeaves);

/**
 * GET /api/leaves/:id
 * Get a single leave request by ID.
 * Employees can only view their own; Admin/HR can view any.
 */
router.get('/:id', LeaveController.getLeaveById);

/**
 * PUT /api/leaves/:id/approve
 * Approve a pending leave request.
 * Access: Admin, HR
 */
router.put(
  '/:id/approve',
  authorize('ADMIN', 'HR'),
  LeaveController.approveLeave,
);

/**
 * PUT /api/leaves/:id/reject
 * Reject a pending leave request.
 * Access: Admin, HR
 */
router.put(
  '/:id/reject',
  authorize('ADMIN', 'HR'),
  LeaveController.rejectLeave,
);

/**
 * PUT /api/leaves/:id/cancel
 * Cancel a leave request.
 * Employees can cancel their own; Admin/HR can cancel any.
 */
router.put('/:id/cancel', LeaveController.cancelLeave);

/**
 * PUT /api/leaves/:id/status
 * Generic status update endpoint (approve, reject, or cancel).
 * Access: Admin, HR
 */
router.put(
  '/:id/status',
  authorize('ADMIN', 'HR'),
  validate(updateLeaveStatusSchema),
  LeaveController.updateLeaveStatus,
);

/**
 * DELETE /api/leaves/:id
 * Delete a leave request (only PENDING or CANCELLED can be deleted).
 * Access: Admin only
 */
router.delete(
  '/:id',
  authorize('ADMIN'),
  LeaveController.deleteLeave,
);

export default router;
