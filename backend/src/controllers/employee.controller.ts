// ============================================
// Employee Controller
// ============================================
// Handles HTTP requests for employee CRUD operations.
// Each method maps to an API route and delegates business
// logic to the EmployeeService layer.

import { Request, Response } from 'express';

import { EmployeeService } from '../services/employee.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

// ============================================
// Employee Controller
// ============================================

export class EmployeeController {
  // ------------------------------------------
  // GET /api/employees
  // List employees with search, filter, pagination
  // ------------------------------------------

  /**
   * Retrieves a paginated list of employees.
   *
   * Query parameters:
   *   - page (number, default 1)
   *   - limit (number, default 10, max 100)
   *   - search (string, searches across name, email, designation)
   *   - departmentId (UUID, filter by department)
   *   - status (ACTIVE | INACTIVE | ON_LEAVE | TERMINATED | PROBATION)
   *   - employmentType (Full-Time | Part-Time | Contract | Intern)
   *   - gender (MALE | FEMALE | OTHER)
   *   - sortBy (field name, default 'createdAt')
   *   - sortOrder ('asc' | 'desc', default 'desc')
   *
   * @route GET /api/employees
   * @access Authenticated (any role)
   */
  static list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { page, limit, search, departmentId, status, employmentType, gender, sortBy, sortOrder } =
      req.query;

    const result = await EmployeeService.list({
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
      search: search as string | undefined,
      departmentId: departmentId as string | undefined,
      status: status as any,
      employmentType: employmentType as string | undefined,
      gender: gender as any,
      sortBy: (sortBy as string) || 'createdAt',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
    });

    res.status(200).json({
      success: true,
      message: 'Employees retrieved successfully',
      data: result.data,
      meta: result.meta,
    });
  });

  // ------------------------------------------
  // GET /api/employees/:id
  // Get a single employee by ID
  // ------------------------------------------

  /**
   * Retrieves a single employee by their UUID.
   * Returns the full employee record with department,
   * manager, and user account information.
   *
   * @route GET /api/employees/:id
   * @access Authenticated (self or Admin/HR)
   */
  static getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    if (!id) {
      throw ApiError.badRequest('Employee ID is required');
    }

    const employee = await EmployeeService.getById(id);

    res.status(200).json({
      success: true,
      message: 'Employee retrieved successfully',
      data: employee,
    });
  });

  // ------------------------------------------
  // POST /api/employees
  // Create a new employee
  // ------------------------------------------

  /**
   * Creates a new employee record. Optionally creates an
   * associated user account for login access.
   *
   * Request body fields:
   *   - firstName (required)
   *   - lastName (required)
   *   - email (required)
   *   - designation (required)
   *   - joiningDate (required, ISO date string)
   *   - departmentId (optional, UUID)
   *   - managerId (optional, UUID)
   *   - status (optional, default 'ACTIVE')
   *   - phone, dateOfBirth, gender, address, etc. (optional)
   *   - createUserAccount (optional, boolean)
   *   - password (required if createUserAccount is true)
   *   - role (optional, default 'EMPLOYEE')
   *
   * @route POST /api/employees
   * @access Admin, HR
   */
  static create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = req.body;

    // Validate required fields at the controller level (additional to Zod middleware)
    if (
      !data.firstName ||
      !data.lastName ||
      !data.email ||
      !data.designation ||
      !data.joiningDate
    ) {
      throw ApiError.badRequest(
        'Missing required fields: firstName, lastName, email, designation, and joiningDate are required.',
      );
    }

    // If user account creation is requested, password must be provided
    if (data.createUserAccount && !data.password) {
      throw ApiError.badRequest(
        'Password is required when creating a user account for the employee.',
      );
    }

    const employee = await EmployeeService.create(data);

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee,
    });
  });

  // ------------------------------------------
  // PUT /api/employees/:id
  // Update an existing employee
  // ------------------------------------------

  /**
   * Updates an existing employee's information.
   * Supports partial updates (PATCH semantics) — only fields
   * included in the request body will be updated.
   *
   * @route PUT /api/employees/:id
   * @access Admin, HR
   */
  static update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const data = req.body;

    if (!id) {
      throw ApiError.badRequest('Employee ID is required');
    }

    // Ensure the body isn't completely empty
    if (!data || Object.keys(data).length === 0) {
      throw ApiError.badRequest(
        'No update data provided. Please include at least one field to update.',
      );
    }

    const employee = await EmployeeService.update(id, data);

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: employee,
    });
  });

  // ------------------------------------------
  // DELETE /api/employees/:id
  // Delete an employee
  // ------------------------------------------

  /**
   * Permanently deletes an employee and their associated
   * user account. This action cannot be undone.
   *
   * Cascading deletions:
   *   - Attendance records
   *   - Leave requests and balances
   *   - Documents
   *   - Performance reviews
   *   - Associated user account
   *
   * @route DELETE /api/employees/:id
   * @access Admin only
   */
  static delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;

    if (!id) {
      throw ApiError.badRequest('Employee ID is required');
    }

    await EmployeeService.delete(id);

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully',
      data: null,
    });
  });

  // ------------------------------------------
  // GET /api/employees/search?q=...
  // Quick search (autocomplete)
  // ------------------------------------------

  /**
   * Performs a quick search across employee name, email,
   * and employee ID. Returns minimal data suitable for
   * autocomplete dropdowns and search results.
   *
   * Query parameters:
   *   - q (string, the search query)
   *   - limit (number, default 10, max 20)
   *
   * @route GET /api/employees/search
   * @access Authenticated (any role)
   */
  static search = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { q, limit } = req.query;

    const searchQuery = (q as string) || '';
    const resultLimit = limit ? Math.min(parseInt(limit as string, 10), 20) : 10;

    const results = await EmployeeService.quickSearch(searchQuery, resultLimit);

    res.status(200).json({
      success: true,
      message: results.length > 0 ? 'Search results found' : 'No results found',
      data: results,
    });
  });

  // ------------------------------------------
  // GET /api/employees/stats
  // Employee statistics summary
  // ------------------------------------------

  /**
   * Returns aggregated employee statistics including total
   * counts by status, department breakdown, gender distribution,
   * and employment type distribution.
   *
   * Used by the dashboard overview section.
   *
   * @route GET /api/employees/stats
   * @access Admin, HR
   */
  static stats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stats = await EmployeeService.getStatsSummary();

    res.status(200).json({
      success: true,
      message: 'Employee statistics retrieved successfully',
      data: stats,
    });
  });

  // ------------------------------------------
  // GET /api/employees/recent
  // Recently joined employees
  // ------------------------------------------

  /**
   * Retrieves the most recently joined employees.
   * Useful for the dashboard "New Joiners" widget.
   *
   * Query parameters:
   *   - limit (number, default 5, max 20)
   *
   * @route GET /api/employees/recent
   * @access Authenticated (any role)
   */
  static recent = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query;
    const resultLimit = limit ? Math.min(parseInt(limit as string, 10), 20) : 5;

    const recentEmployees = await EmployeeService.getRecentJoiners(resultLimit);

    res.status(200).json({
      success: true,
      message: 'Recent employees retrieved successfully',
      data: recentEmployees,
    });
  });

  // ------------------------------------------
  // GET /api/employees/top-performers
  // Top performing employees
  // ------------------------------------------

  /**
   * Retrieves employees with the highest performance review
   * ratings. Used for the dashboard "Top Performers" widget.
   *
   * Query parameters:
   *   - limit (number, default 5, max 20)
   *
   * @route GET /api/employees/top-performers
   * @access Admin, HR
   */
  static topPerformers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query;
    const resultLimit = limit ? Math.min(parseInt(limit as string, 10), 20) : 5;

    const topPerformers = await EmployeeService.getTopPerformers(resultLimit);

    res.status(200).json({
      success: true,
      message: 'Top performers retrieved successfully',
      data: topPerformers,
    });
  });

  // ------------------------------------------
  // GET /api/employees/top-absentees
  // Employees with most absences this month
  // ------------------------------------------

  /**
   * Retrieves employees with the most absent days in the
   * current month. Used for the dashboard "Top Absentees" widget.
   *
   * Query parameters:
   *   - limit (number, default 5, max 20)
   *
   * @route GET /api/employees/top-absentees
   * @access Admin, HR
   */
  static topAbsentees = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query;
    const resultLimit = limit ? Math.min(parseInt(limit as string, 10), 20) : 5;

    const topAbsentees = await EmployeeService.getTopAbsentees(resultLimit);

    res.status(200).json({
      success: true,
      message: 'Top absentees retrieved successfully',
      data: topAbsentees,
    });
  });

  // ------------------------------------------
  // GET /api/employees/department-count
  // Employee count by department
  // ------------------------------------------

  /**
   * Returns the count of employees in each department.
   * Used for dashboard charts (bar chart, pie chart).
   *
   * @route GET /api/employees/department-count
   * @access Admin, HR
   */
  static departmentCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const departmentCounts = await EmployeeService.getCountByDepartment();

    res.status(200).json({
      success: true,
      message: 'Department employee counts retrieved successfully',
      data: departmentCounts,
    });
  });

  // ------------------------------------------
  // GET /api/employees/by-user/:userId
  // Get employee by associated user ID
  // ------------------------------------------

  /**
   * Retrieves the employee record associated with a given
   * user account ID. Useful for fetching the current user's
   * employee profile from their auth token.
   *
   * @route GET /api/employees/by-user/:userId
   * @access Authenticated (self or Admin/HR)
   */
  static getByUserId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.userId as string;

    if (!userId) {
      throw ApiError.badRequest('User ID is required');
    }

    const employee = await EmployeeService.getByUserId(userId);

    if (!employee) {
      throw ApiError.notFound('No employee record found for this user.');
    }

    res.status(200).json({
      success: true,
      message: 'Employee retrieved successfully',
      data: employee,
    });
  });

  // ------------------------------------------
  // GET /api/employees/by-emp-id/:employeeId
  // Get employee by human-readable employee ID
  // ------------------------------------------

  /**
   * Retrieves an employee by their human-readable employee
   * ID (e.g., "EMP-0042") rather than the internal UUID.
   *
   * @route GET /api/employees/by-emp-id/:employeeId
   * @access Authenticated (any role)
   */
  static getByEmployeeId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const employeeId = req.params.employeeId as string;

    if (!employeeId) {
      throw ApiError.badRequest('Employee ID is required');
    }

    const employee = await EmployeeService.getByEmployeeId(employeeId);

    res.status(200).json({
      success: true,
      message: 'Employee retrieved successfully',
      data: employee,
    });
  });

  // ------------------------------------------
  // GET /api/employees/birthdays
  // Employees with birthdays this month
  // ------------------------------------------

  /**
   * Returns employees whose birthday falls in the current month.
   * Used for the dashboard "Birthdays This Month" widget.
   *
   * @route GET /api/employees/birthdays
   * @access Authenticated (any role)
   */
  static birthdays = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const birthdayEmployees = await EmployeeService.getBirthdaysThisMonth();

    res.status(200).json({
      success: true,
      message: 'Birthday employees retrieved successfully',
      data: birthdayEmployees,
    });
  });
}

export default EmployeeController;
