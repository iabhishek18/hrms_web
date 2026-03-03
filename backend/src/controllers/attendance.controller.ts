// ============================================
// Attendance Controller
// ============================================
// Handles HTTP requests for attendance management including
// clock in/out, attendance records listing, summaries,
// and manual attendance entry by admins/HR.

import { Request, Response } from 'express';

import { AttendanceService } from '../services/attendance.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

// ============================================
// Attendance Controller Class
// ============================================

export class AttendanceController {
  // ------------------------------------------
  // Clock In
  // ------------------------------------------

  /**
   * POST /api/attendance/clock-in
   *
   * Records the current user's clock-in time for today.
   * Requires authentication. The employee ID is derived
   * from the authenticated user's profile.
   *
   * Body (optional):
   *   - notes: string  — Additional notes for the clock-in
   *   - location: string — Location from which the user is clocking in
   *
   * Responses:
   *   201 — Successfully clocked in
   *   400 — Employee not found or inactive
   *   409 — Already clocked in today
   */
  static clockIn = asyncHandler(async (req: Request, res: Response) => {
    // Get the employee ID from the authenticated user
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      throw ApiError.badRequest(
        'No employee profile linked to your account. Please contact an administrator.',
      );
    }

    const { notes, location } = req.body;

    // Extract the client IP address for audit purposes
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    const attendance = await AttendanceService.clockIn({
      employeeId,
      notes: notes || null,
      location: location || null,
      ipAddress,
    });

    res.status(201).json({
      success: true,
      message: 'Clocked in successfully',
      data: attendance,
    });
  });

  // ------------------------------------------
  // Clock Out
  // ------------------------------------------

  /**
   * POST /api/attendance/clock-out
   *
   * Records the current user's clock-out time for today.
   * Calculates total hours worked based on clock-in time.
   * Requires authentication.
   *
   * Body (optional):
   *   - notes: string — Additional notes for the clock-out
   *
   * Responses:
   *   200 — Successfully clocked out
   *   400 — No clock-in record found for today
   *   409 — Already clocked out today
   */
  static clockOut = asyncHandler(async (req: Request, res: Response) => {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      throw ApiError.badRequest(
        'No employee profile linked to your account. Please contact an administrator.',
      );
    }

    const { notes } = req.body;

    const attendance = await AttendanceService.clockOut({
      employeeId,
      notes: notes || null,
    });

    res.status(200).json({
      success: true,
      message: 'Clocked out successfully',
      data: attendance,
    });
  });

  // ------------------------------------------
  // Get Today's Status
  // ------------------------------------------

  /**
   * GET /api/attendance/today
   *
   * Returns the authenticated user's attendance status for today,
   * including clock-in/out times and total hours worked.
   *
   * Responses:
   *   200 — Today's attendance status
   */
  static getTodayStatus = asyncHandler(async (req: Request, res: Response) => {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      throw ApiError.badRequest('No employee profile linked to your account.');
    }

    const status = await AttendanceService.getTodayStatus(employeeId);

    res.status(200).json({
      success: true,
      message: "Today's attendance status retrieved",
      data: status,
    });
  });

  // ------------------------------------------
  // List Attendance Records
  // ------------------------------------------

  /**
   * GET /api/attendance
   *
   * Lists attendance records with filtering and pagination.
   * Admin/HR can see all records; employees see only their own.
   *
   * Query Parameters:
   *   - page: number (default: 1)
   *   - limit: number (default: 10, max: 100)
   *   - sortBy: string (default: 'date')
   *   - sortOrder: 'asc' | 'desc' (default: 'desc')
   *   - employeeId: string — Filter by employee (Admin/HR only)
   *   - date: string — Filter by specific date (ISO 8601)
   *   - startDate: string — Filter by start of date range
   *   - endDate: string — Filter by end of date range
   *   - status: AttendanceStatus — Filter by status
   *
   * Responses:
   *   200 — Paginated list of attendance records
   */
  static list = asyncHandler(async (req: Request, res: Response) => {
    const {
      page = '1',
      limit = '10',
      sortBy = 'date',
      sortOrder = 'desc',
      employeeId,
      date,
      startDate,
      endDate,
      status,
    } = req.query;

    // Non-admin users can only see their own attendance
    let filterEmployeeId = employeeId as string | undefined;
    const userRole = req.user?.role;

    if (userRole === 'EMPLOYEE') {
      filterEmployeeId = req.user?.employeeId;

      if (!filterEmployeeId) {
        throw ApiError.badRequest('No employee profile linked to your account.');
      }
    }

    const result = await AttendanceService.getAttendanceList({
      employeeId: filterEmployeeId,
      date: date as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      status: status as any,
      page: Math.max(1, parseInt(page as string, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10)),
      sortBy: sortBy as string,
      sortOrder: (sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc',
    });

    res.status(200).json({
      success: true,
      message: 'Attendance records retrieved successfully',
      data: result.data,
      meta: result.pagination,
    });
  });

  // ------------------------------------------
  // Get Attendance Record by ID
  // ------------------------------------------

  /**
   * GET /api/attendance/:id
   *
   * Returns a single attendance record by its ID.
   * Admin/HR can view any record; employees can only view their own.
   *
   * Responses:
   *   200 — Attendance record found
   *   404 — Record not found
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const record = await AttendanceService.getAttendanceById(id);

    // Employees can only view their own records
    if (req.user?.role === 'EMPLOYEE' && record.employeeId !== req.user?.employeeId) {
      throw ApiError.forbidden('You can only view your own attendance records.');
    }

    res.status(200).json({
      success: true,
      message: 'Attendance record retrieved',
      data: record,
    });
  });

  // ------------------------------------------
  // Create Manual Attendance (Admin/HR)
  // ------------------------------------------

  /**
   * POST /api/attendance/manual
   *
   * Creates or updates a manual attendance entry for a specific
   * employee and date. Only accessible by Admin and HR roles.
   *
   * Body:
   *   - employeeId: string (required) — Target employee UUID
   *   - date: string (required) — Date in ISO 8601 format
   *   - clockIn: string (optional) — Clock-in time
   *   - clockOut: string (optional) — Clock-out time
   *   - status: AttendanceStatus (required) — e.g., PRESENT, ABSENT, LATE
   *   - notes: string (optional) — Additional notes
   *
   * Responses:
   *   201 — Attendance record created/updated
   *   400 — Invalid input
   *   404 — Employee not found
   */
  static createManual = asyncHandler(async (req: Request, res: Response) => {
    const { employeeId, date, clockIn, clockOut, status, notes } = req.body;

    if (!employeeId || !date || !status) {
      throw ApiError.badRequest(
        'employeeId, date, and status are required for manual attendance entry.',
      );
    }

    const attendance = await AttendanceService.createManualAttendance({
      employeeId,
      date,
      clockIn: clockIn || null,
      clockOut: clockOut || null,
      status,
      notes: notes || null,
    });

    res.status(201).json({
      success: true,
      message: 'Manual attendance record created/updated successfully',
      data: attendance,
    });
  });

  // ------------------------------------------
  // Bulk Mark Attendance (Admin/HR)
  // ------------------------------------------

  /**
   * POST /api/attendance/bulk
   *
   * Marks attendance for multiple employees at once for a specific date.
   * Useful for holidays, company events, or filling in missing records.
   * Only accessible by Admin and HR roles.
   *
   * Body:
   *   - date: string (required) — Target date in ISO 8601 format
   *   - status: AttendanceStatus (required) — Status to apply
   *   - employeeIds: string[] (optional) — Specific employee IDs; if empty, applies to all active
   *   - notes: string (optional) — Notes to add to each record
   *
   * Responses:
   *   200 — Bulk operation completed with summary
   */
  static bulkMark = asyncHandler(async (req: Request, res: Response) => {
    const { date, status, employeeIds, notes } = req.body;

    if (!date || !status) {
      throw ApiError.badRequest('date and status are required for bulk attendance marking.');
    }

    const result = await AttendanceService.bulkMarkAttendance(
      date,
      status,
      employeeIds || undefined,
      notes || undefined,
    );

    res.status(200).json({
      success: true,
      message: `Bulk attendance marked successfully. Created: ${result.created}, Updated: ${result.updated}, Total: ${result.total}`,
      data: result,
    });
  });

  // ------------------------------------------
  // Get Employee Attendance Summary
  // ------------------------------------------

  /**
   * GET /api/attendance/summary/:employeeId
   *
   * Returns a summary of attendance statistics for a specific employee
   * within a given year and optional month. Includes counts of each
   * status type, attendance rate, and average hours worked.
   *
   * Route Params:
   *   - employeeId: string — The employee's UUID
   *
   * Query Parameters:
   *   - year: number (default: current year)
   *   - month: number (optional, 1-12) — Specific month to summarize
   *
   * Responses:
   *   200 — Summary statistics object
   *   404 — Employee not found
   */
  static getEmployeeSummary = asyncHandler(async (req: Request, res: Response) => {
    const employeeId = req.params.employeeId as string;
    const { year, month } = req.query;

    // Employees can only view their own summary
    if (req.user?.role === 'EMPLOYEE' && employeeId !== req.user?.employeeId) {
      throw ApiError.forbidden('You can only view your own attendance summary.');
    }

    const targetYear = year ? parseInt(year as string, 10) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string, 10) : undefined;

    // Validate year
    if (isNaN(targetYear) || targetYear < 2020 || targetYear > 2100) {
      throw ApiError.badRequest('Invalid year. Must be between 2020 and 2100.');
    }

    // Validate month if provided
    if (targetMonth !== undefined && (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12)) {
      throw ApiError.badRequest('Invalid month. Must be between 1 and 12.');
    }

    const summary = await AttendanceService.getEmployeeSummary(employeeId, targetYear, targetMonth);

    res.status(200).json({
      success: true,
      message: 'Attendance summary retrieved successfully',
      data: {
        employeeId,
        year: targetYear,
        month: targetMonth || null,
        ...summary,
      },
    });
  });

  // ------------------------------------------
  // Get Department-wise Summary (Admin/HR)
  // ------------------------------------------

  /**
   * GET /api/attendance/department-summary
   *
   * Returns today's attendance summary broken down by department.
   * Only accessible by Admin and HR roles.
   *
   * Responses:
   *   200 — Array of department attendance summaries
   */
  static getDepartmentSummary = asyncHandler(async (_req: Request, res: Response) => {
    const summary = await AttendanceService.getDepartmentSummary();

    res.status(200).json({
      success: true,
      message: 'Department attendance summary retrieved',
      data: summary,
    });
  });

  // ------------------------------------------
  // Get Overall Today Summary (Admin/HR)
  // ------------------------------------------

  /**
   * GET /api/attendance/overall-summary
   *
   * Returns an organization-wide attendance summary for today,
   * including total present, absent, late, on-leave, and unmarked counts.
   * Only accessible by Admin and HR roles.
   *
   * Responses:
   *   200 — Overall attendance summary for today
   */
  static getOverallSummary = asyncHandler(async (_req: Request, res: Response) => {
    const summary = await AttendanceService.getOverallTodaySummary();

    res.status(200).json({
      success: true,
      message: "Today's overall attendance summary retrieved",
      data: summary,
    });
  });

  // ------------------------------------------
  // Get Monthly Calendar View
  // ------------------------------------------

  /**
   * GET /api/attendance/calendar/:employeeId
   *
   * Returns daily attendance records for a specific employee and month,
   * suitable for rendering a calendar view on the frontend.
   *
   * Route Params:
   *   - employeeId: string — The employee's UUID
   *
   * Query Parameters:
   *   - year: number (default: current year)
   *   - month: number (default: current month, 1-12)
   *
   * Responses:
   *   200 — Array of daily attendance records for the month
   */
  static getMonthlyCalendar = asyncHandler(async (req: Request, res: Response) => {
    const employeeId = req.params.employeeId as string;
    const { year, month } = req.query;

    // Employees can only view their own calendar
    if (req.user?.role === 'EMPLOYEE' && employeeId !== req.user?.employeeId) {
      throw ApiError.forbidden('You can only view your own attendance calendar.');
    }

    const now = new Date();
    const targetYear = year ? parseInt(year as string, 10) : now.getFullYear();
    const targetMonth = month ? parseInt(month as string, 10) : now.getMonth() + 1;

    // Validate inputs
    if (isNaN(targetYear) || targetYear < 2020 || targetYear > 2100) {
      throw ApiError.badRequest('Invalid year. Must be between 2020 and 2100.');
    }

    if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      throw ApiError.badRequest('Invalid month. Must be between 1 and 12.');
    }

    const records = await AttendanceService.getMonthlyCalendar(employeeId, targetYear, targetMonth);

    res.status(200).json({
      success: true,
      message: 'Monthly attendance calendar retrieved',
      data: {
        employeeId,
        year: targetYear,
        month: targetMonth,
        records,
      },
    });
  });

  // ------------------------------------------
  // Delete Attendance Record (Admin only)
  // ------------------------------------------

  /**
   * DELETE /api/attendance/:id
   *
   * Permanently deletes an attendance record by its ID.
   * Only accessible by Admin role.
   *
   * Responses:
   *   200 — Record deleted successfully
   *   404 — Record not found
   */
  static delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const result = await AttendanceService.deleteAttendance(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null,
    });
  });
}

export default AttendanceController;
