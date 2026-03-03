// ============================================
// Employee Routes
// ============================================
// Defines all API routes for employee management.
// Each route is protected by authentication middleware
// and optionally by role-based authorization middleware.
//
// Route prefix: /api/employees

import { Router } from 'express';

import { EmployeeController } from '../controllers/employee.controller';
import { authenticate, authorize, selfOrAdmin } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeFilterSchema,
  idParamSchema,
} from '../utils/validators';

const router = Router();

// ============================================
// All routes require authentication
// ============================================
router.use(authenticate);

// ============================================
// Routes that must be defined BEFORE /:id
// to prevent Express from treating the path
// segments as UUID parameters
// ============================================

/**
 * GET /api/employees/search?q=...&limit=...
 * Quick search / autocomplete across employee name, email, and ID.
 * Accessible by all authenticated users.
 */
router.get('/search', EmployeeController.search);

/**
 * GET /api/employees/stats
 * Aggregated employee statistics (totals, by department, by gender, etc.)
 * Restricted to Admin and HR roles.
 */
router.get('/stats', authorize('ADMIN', 'HR'), EmployeeController.stats);

/**
 * GET /api/employees/recent
 * Recently joined employees list.
 * Accessible by all authenticated users.
 */
router.get('/recent', EmployeeController.recent);

/**
 * GET /api/employees/top-performers
 * Employees with the highest performance ratings.
 * Restricted to Admin and HR roles.
 */
router.get(
  '/top-performers',
  authorize('ADMIN', 'HR'),
  EmployeeController.topPerformers,
);

/**
 * GET /api/employees/top-absentees
 * Employees with the most absences this month.
 * Restricted to Admin and HR roles.
 */
router.get(
  '/top-absentees',
  authorize('ADMIN', 'HR'),
  EmployeeController.topAbsentees,
);

/**
 * GET /api/employees/department-count
 * Employee count grouped by department.
 * Restricted to Admin and HR roles.
 */
router.get(
  '/department-count',
  authorize('ADMIN', 'HR'),
  EmployeeController.departmentCount,
);

/**
 * GET /api/employees/birthdays
 * Employees with birthdays in the current month.
 * Accessible by all authenticated users.
 */
router.get('/birthdays', EmployeeController.birthdays);

/**
 * GET /api/employees/by-user/:userId
 * Get employee record by associated user account ID.
 * Accessible by self or Admin/HR.
 */
router.get(
  '/by-user/:userId',
  selfOrAdmin('userId'),
  EmployeeController.getByUserId,
);

/**
 * GET /api/employees/by-emp-id/:employeeId
 * Get employee record by human-readable employee ID (e.g., EMP-0042).
 * Accessible by all authenticated users.
 */
router.get('/by-emp-id/:employeeId', EmployeeController.getByEmployeeId);

// ============================================
// Standard CRUD routes
// ============================================

/**
 * GET /api/employees
 * List employees with search, filter, sort, and pagination.
 * Accessible by all authenticated users.
 *
 * Query params validated by employeeFilterSchema:
 *   - page, limit, sortBy, sortOrder, search
 *   - departmentId, status, employmentType, gender
 */
router.get(
  '/',
  validate(employeeFilterSchema, 'query'),
  EmployeeController.list,
);

/**
 * POST /api/employees
 * Create a new employee record.
 * Restricted to Admin and HR roles.
 *
 * Body validated by createEmployeeSchema:
 *   - firstName, lastName, email, designation, joiningDate (required)
 *   - departmentId, managerId, status, phone, etc. (optional)
 *   - createUserAccount, password, role (optional, for user account creation)
 */
router.post(
  '/',
  authorize('ADMIN', 'HR'),
  validate(createEmployeeSchema),
  EmployeeController.create,
);

/**
 * GET /api/employees/:id
 * Get a single employee by UUID.
 * Employees can view their own record; Admin/HR can view any.
 */
router.get(
  '/:id',
  selfOrAdmin('id'),
  EmployeeController.getById,
);

/**
 * PUT /api/employees/:id
 * Update an existing employee.
 * Restricted to Admin and HR roles.
 *
 * Supports partial updates — only provided fields are updated.
 * Body validated by updateEmployeeSchema.
 */
router.put(
  '/:id',
  authorize('ADMIN', 'HR'),
  validate(updateEmployeeSchema),
  EmployeeController.update,
);

/**
 * PATCH /api/employees/:id
 * Alias for PUT — same behavior (partial update).
 * Some frontends prefer PATCH for partial updates.
 */
router.patch(
  '/:id',
  authorize('ADMIN', 'HR'),
  validate(updateEmployeeSchema),
  EmployeeController.update,
);

/**
 * DELETE /api/employees/:id
 * Permanently delete an employee and their associated data.
 * Restricted to Admin role only (not HR).
 *
 * Cascading deletions include:
 *   - Attendance records
 *   - Leave requests and balances
 *   - Documents
 *   - Performance reviews
 *   - Associated user account
 */
router.delete(
  '/:id',
  authorize('ADMIN'),
  EmployeeController.delete,
);

export default router;
