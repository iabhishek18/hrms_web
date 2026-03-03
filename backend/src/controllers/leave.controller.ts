// ============================================
// Leave Controller
// ============================================
// Handles HTTP requests for leave management operations.
// Delegates business logic to the LeaveService layer and
// returns standardized API responses.

import { Request, Response } from 'express';

import { LeaveService } from '../services/leave.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

// ============================================
// Leave Controller Class
// ============================================

export class LeaveController {
  // ------------------------------------------
  // Apply for Leave
  // ------------------------------------------

  /**
   * POST /api/leaves
   *
   * Creates a new leave request for the authenticated employee.
   * The employee ID is derived from the authenticated user's token.
   *
   * Request Body:
   *   - leaveType: LeaveType enum (CASUAL, SICK, EARNED, etc.)
   *   - startDate: ISO date string (YYYY-MM-DD)
   *   - endDate: ISO date string (YYYY-MM-DD)
   *   - reason: string (min 10 chars)
   *
   * Response: 201 Created with the new leave request
   */
  static applyLeave = asyncHandler(async (req: Request, res: Response) => {
    const { leaveType, startDate, endDate, reason } = req.body;

    // Get the employee ID from the authenticated user
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      throw ApiError.badRequest(
        'No employee profile linked to your account. Please contact an administrator.',
      );
    }

    const leave = await LeaveService.applyLeave({
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
    });

    res
      .status(201)
      .json(ApiResponse.created('Leave request submitted successfully. Awaiting approval.', leave));
  });

  // ------------------------------------------
  // Apply Leave on Behalf (Admin/HR)
  // ------------------------------------------

  /**
   * POST /api/leaves/on-behalf
   *
   * Admin/HR can apply leave on behalf of an employee.
   * Requires the employeeId in the request body.
   *
   * Request Body:
   *   - employeeId: UUID of the employee
   *   - leaveType: LeaveType enum
   *   - startDate: ISO date string
   *   - endDate: ISO date string
   *   - reason: string
   */
  static applyLeaveOnBehalf = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId, leaveType, startDate, endDate, reason } = req.body;

    if (!employeeId) {
      throw ApiError.badRequest('Employee ID is required when applying leave on behalf.');
    }

    const leave = await LeaveService.applyLeave({
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
    });

    res
      .status(201)
      .json(ApiResponse.created('Leave request submitted on behalf of employee.', leave));
  });

  // ------------------------------------------
  // Approve Leave
  // ------------------------------------------

  /**
   * PUT /api/leaves/:id/approve
   *
   * Approves a pending leave request. Only Admin/HR roles can approve.
   * The leave balance is deducted upon approval.
   *
   * URL Params:
   *   - id: UUID of the leave request
   *
   * Request Body (optional):
   *   - remarks: string (approval notes)
   */
  static approveLeave = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { remarks } = req.body;
    const approvedBy = req.user!.userId;

    const leave = await LeaveService.approveLeave(id, approvedBy, remarks);

    res.status(200).json(ApiResponse.success('Leave request approved successfully.', leave));
  });

  // ------------------------------------------
  // Reject Leave
  // ------------------------------------------

  /**
   * PUT /api/leaves/:id/reject
   *
   * Rejects a pending leave request. Only Admin/HR roles can reject.
   *
   * URL Params:
   *   - id: UUID of the leave request
   *
   * Request Body (optional):
   *   - remarks: string (rejection reason)
   */
  static rejectLeave = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { remarks } = req.body;
    const rejectedBy = req.user!.userId;

    const leave = await LeaveService.rejectLeave(id, rejectedBy, remarks);

    res.status(200).json(ApiResponse.success('Leave request rejected.', leave));
  });

  // ------------------------------------------
  // Cancel Leave
  // ------------------------------------------

  /**
   * PUT /api/leaves/:id/cancel
   *
   * Cancels a leave request. Employees can cancel their own pending
   * or approved leaves. Admin/HR can cancel any leave.
   *
   * If the leave was already approved, the leave balance is restored.
   *
   * URL Params:
   *   - id: UUID of the leave request
   *
   * Request Body (optional):
   *   - remarks: string (cancellation reason)
   */
  static cancelLeave = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { remarks } = req.body;
    const cancelledBy = req.user!.userId;

    // If the user is an employee, verify they own this leave request
    if (req.user!.role === 'EMPLOYEE') {
      const leave = await LeaveService.getLeaveById(id);

      if (leave.employeeId !== req.user!.employeeId) {
        throw ApiError.forbidden('You can only cancel your own leave requests.');
      }
    }

    const leave = await LeaveService.cancelLeave(id, cancelledBy, remarks);

    res.status(200).json(ApiResponse.success('Leave request cancelled successfully.', leave));
  });

  // ------------------------------------------
  // Get Leave by ID
  // ------------------------------------------

  /**
   * GET /api/leaves/:id
   *
   * Retrieves a single leave request by its ID.
   * Employees can only view their own leaves unless they are Admin/HR.
   *
   * URL Params:
   *   - id: UUID of the leave request
   */
  static getLeaveById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const leave = await LeaveService.getLeaveById(id);

    // If the user is an employee, verify they own this leave request
    if (req.user!.role === 'EMPLOYEE' && leave.employeeId !== req.user!.employeeId) {
      throw ApiError.forbidden('You can only view your own leave requests.');
    }

    res.status(200).json(ApiResponse.success('Leave request retrieved successfully.', leave));
  });

  // ------------------------------------------
  // List Leaves (with filtering & pagination)
  // ------------------------------------------

  /**
   * GET /api/leaves
   *
   * Lists leave requests with support for filtering, searching,
   * pagination, and sorting.
   *
   * Query Parameters:
   *   - page: number (default: 1)
   *   - limit: number (default: 10, max: 100)
   *   - sortBy: string (default: 'createdAt')
   *   - sortOrder: 'asc' | 'desc' (default: 'desc')
   *   - search: string (searches employee name, reason)
   *   - employeeId: UUID (filter by employee)
   *   - leaveType: LeaveType enum
   *   - status: LeaveStatus enum
   *   - startDate: ISO date string (filter leaves starting from this date)
   *   - endDate: ISO date string (filter leaves ending before this date)
   *
   * For employees, only their own leaves are returned.
   * Admin/HR can see all leaves.
   */
  static listLeaves = asyncHandler(async (req: Request, res: Response) => {
    const {
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      employeeId,
      leaveType,
      status,
      startDate,
      endDate,
    } = req.query;

    // Build filter params
    const filters: any = {
      page: Math.max(1, parseInt(page as string, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10)),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      search: search as string | undefined,
      leaveType: leaveType as string | undefined,
      status: status as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    };

    // If the user is a regular employee, restrict to their own leaves
    if (req.user!.role === 'EMPLOYEE') {
      filters.employeeId = req.user!.employeeId;
    } else if (employeeId) {
      // Admin/HR can filter by a specific employee
      filters.employeeId = employeeId as string;
    }

    const result = await LeaveService.listLeaves(filters);

    res.status(200).json({
      success: true,
      message: 'Leave requests retrieved successfully.',
      data: result.data,
      meta: result.meta,
    });
  });

  // ------------------------------------------
  // Get My Leaves
  // ------------------------------------------

  /**
   * GET /api/leaves/my-leaves
   *
   * Convenience endpoint for employees to list their own leave requests.
   * Supports optional year filtering.
   *
   * Query Parameters:
   *   - year: number (optional, filters by calendar year)
   */
  static getMyLeaves = asyncHandler(async (req: Request, res: Response) => {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      throw ApiError.badRequest(
        'No employee profile linked to your account. Please contact an administrator.',
      );
    }

    const { year } = req.query;
    const yearNum = year ? parseInt(year as string, 10) : undefined;

    const leaves = await LeaveService.getEmployeeLeaves(employeeId, yearNum);

    res
      .status(200)
      .json(ApiResponse.success('Your leave requests retrieved successfully.', leaves));
  });

  // ------------------------------------------
  // Get Leave Balance
  // ------------------------------------------

  /**
   * GET /api/leaves/balance
   * GET /api/leaves/balance/:employeeId
   *
   * Returns the leave balance summary for an employee.
   * If no employeeId param is provided, returns the authenticated
   * user's own balance. Admin/HR can query any employee's balance.
   *
   * Query Parameters:
   *   - year: number (optional, defaults to current year)
   */
  static getLeaveBalance = asyncHandler(async (req: Request, res: Response) => {
    let employeeId = req.params.employeeId as string | undefined;
    const { year } = req.query;

    // If no employeeId in params, use the authenticated user's employee ID
    if (!employeeId) {
      employeeId = req.user?.employeeId || '';
    }

    // Regular employees can only view their own balance
    if (req.user!.role === 'EMPLOYEE' && employeeId !== req.user!.employeeId) {
      throw ApiError.forbidden('You can only view your own leave balance.');
    }

    if (!employeeId) {
      throw ApiError.badRequest(
        'No employee profile linked to your account. Please contact an administrator.',
      );
    }

    const yearNum = year ? parseInt(year as string, 10) : new Date().getFullYear();
    const balances = await LeaveService.getLeaveBalanceSummary(employeeId, yearNum);

    res.status(200).json(ApiResponse.success('Leave balance retrieved successfully.', balances));
  });

  // ------------------------------------------
  // Set Leave Balance (Admin/HR)
  // ------------------------------------------

  /**
   * PUT /api/leaves/balance
   *
   * Allows Admin/HR to set or update the leave balance for an employee.
   *
   * Request Body:
   *   - employeeId: UUID of the employee
   *   - leaveType: LeaveType enum
   *   - totalLeaves: number (new total allocation)
   *   - year: number (calendar year)
   */
  static setLeaveBalance = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId, leaveType, totalLeaves, year } = req.body;

    if (!employeeId || !leaveType || totalLeaves === undefined || !year) {
      throw ApiError.badRequest(
        'All fields are required: employeeId, leaveType, totalLeaves, year.',
      );
    }

    const balance = await LeaveService.setLeaveBalance({
      employeeId,
      leaveType,
      totalLeaves,
      year,
    });

    res.status(200).json(ApiResponse.success('Leave balance updated successfully.', balance));
  });

  // ------------------------------------------
  // Get Leave Statistics (Dashboard)
  // ------------------------------------------

  /**
   * GET /api/leaves/stats
   *
   * Returns leave statistics for the dashboard.
   * Includes counts by status, by type, and recent requests.
   *
   * Query Parameters:
   *   - departmentId: UUID (optional, filter by department)
   */
  static getLeaveStats = asyncHandler(async (req: Request, res: Response) => {
    const { departmentId } = req.query;

    const stats = await LeaveService.getLeaveStats(departmentId as string | undefined);

    res.status(200).json(ApiResponse.success('Leave statistics retrieved successfully.', stats));
  });

  // ------------------------------------------
  // Delete Leave Request
  // ------------------------------------------

  /**
   * DELETE /api/leaves/:id
   *
   * Permanently deletes a leave request. Only PENDING or CANCELLED
   * requests can be deleted. Approved/rejected leaves are preserved
   * for audit purposes.
   *
   * Admin only.
   *
   * URL Params:
   *   - id: UUID of the leave request
   */
  static deleteLeave = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    await LeaveService.deleteLeave(id);

    res.status(200).json(ApiResponse.noContent('Leave request deleted successfully.'));
  });

  // ------------------------------------------
  // Initialize Yearly Balances (Admin)
  // ------------------------------------------

  /**
   * POST /api/leaves/initialize-balances
   *
   * Initializes leave balances for all active employees for a given year.
   * Typically run once at the start of each calendar year.
   *
   * Request Body:
   *   - year: number (the calendar year to initialize)
   */
  static initializeYearlyBalances = asyncHandler(async (req: Request, res: Response) => {
    const { year } = req.body;

    if (!year || typeof year !== 'number') {
      throw ApiError.badRequest('A valid year is required (e.g., 2024).');
    }

    const processedCount = await LeaveService.initializeYearlyBalances(year);

    res
      .status(200)
      .json(
        ApiResponse.success(
          `Leave balances initialized for ${processedCount} employees for year ${year}.`,
          { year, employeesProcessed: processedCount },
        ),
      );
  });

  // ------------------------------------------
  // Update Leave Status (Generic)
  // ------------------------------------------

  /**
   * PUT /api/leaves/:id/status
   *
   * Generic endpoint to update leave status.
   * Accepts status: APPROVED, REJECTED, or CANCELLED.
   *
   * This is an alternative to the specific approve/reject/cancel endpoints,
   * useful when the frontend uses a single dropdown to change status.
   *
   * URL Params:
   *   - id: UUID of the leave request
   *
   * Request Body:
   *   - status: LeaveStatus (APPROVED | REJECTED | CANCELLED)
   *   - remarks: string (optional)
   */
  static updateLeaveStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { status, remarks } = req.body;
    const userId = req.user!.userId;

    if (!status) {
      throw ApiError.badRequest('Status is required.');
    }

    let leave;

    switch (status) {
      case 'APPROVED':
        leave = await LeaveService.approveLeave(id, userId, remarks);
        break;
      case 'REJECTED':
        leave = await LeaveService.rejectLeave(id, userId, remarks);
        break;
      case 'CANCELLED':
        leave = await LeaveService.cancelLeave(id, userId, remarks);
        break;
      default:
        throw ApiError.badRequest(
          `Invalid status: "${status}". Allowed values: APPROVED, REJECTED, CANCELLED.`,
        );
    }

    res
      .status(200)
      .json(ApiResponse.success(`Leave request ${status.toLowerCase()} successfully.`, leave));
  });
}

export default LeaveController;
