// ============================================
// Leave Service
// ============================================
// Business logic layer for leave management operations.
// Handles applying for leave, approval/rejection workflows,
// balance tracking, and leave history queries.

import { Prisma, LeaveType, LeaveStatus } from '@prisma/client';

import prisma from '../config/database';
import { ApiError } from '../utils/ApiError';
import {
  calculateDaysBetween,
  calculateWorkingDays,
  buildWhereClause,
  paginate,
} from '../utils/helpers';

// ============================================
// Types
// ============================================

export interface ApplyLeaveParams {
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface UpdateLeaveStatusParams {
  leaveId: string;
  status: LeaveStatus;
  remarks?: string | null;
  approvedBy: string; // userId of the approver
}

export interface LeaveFilterParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  employeeId?: string;
  leaveType?: LeaveType;
  status?: LeaveStatus;
  startDate?: string;
  endDate?: string;
}

export interface LeaveBalanceParams {
  employeeId: string;
  leaveType: LeaveType;
  totalLeaves: number;
  year: number;
}

export interface LeaveBalanceSummary {
  leaveType: LeaveType;
  totalLeaves: number;
  usedLeaves: number;
  remainingLeaves: number;
  year: number;
}

// ============================================
// Default leave allocations per year (configurable)
// ============================================

const DEFAULT_LEAVE_ALLOCATIONS: Record<LeaveType, number> = {
  CASUAL: 12,
  SICK: 10,
  EARNED: 15,
  MATERNITY: 180,
  PATERNITY: 15,
  UNPAID: 365, // Essentially unlimited, tracked for record
  COMPENSATORY: 0, // Granted individually
};

// ============================================
// Leave Service Class
// ============================================

export class LeaveService {
  // ============================================
  // Apply for Leave
  // ============================================

  /**
   * Creates a new leave request for an employee.
   *
   * Validations:
   * 1. Employee must exist and be active
   * 2. Dates must be valid (end >= start, not in the past for non-admins)
   * 3. No overlapping leave requests for the same period
   * 4. Sufficient leave balance for the requested type
   *
   * @param params - Leave application details
   * @returns The created leave record
   * @throws ApiError if validation fails
   */
  static async applyLeave(params: ApplyLeaveParams) {
    const { employeeId, leaveType, startDate, endDate, reason } = params;

    // 1. Verify the employee exists and is active
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        employeeId: true,
      },
    });

    if (!employee) {
      throw ApiError.notFound('Employee not found.');
    }

    if (employee.status === 'TERMINATED' || employee.status === 'INACTIVE') {
      throw ApiError.badRequest(
        'Cannot apply for leave. Employee status is inactive or terminated.',
      );
    }

    // 2. Parse and validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw ApiError.badRequest('Invalid date format. Please use ISO 8601 format (YYYY-MM-DD).');
    }

    if (end < start) {
      throw ApiError.badRequest('End date must be on or after the start date.');
    }

    // Calculate total leave days (working days only, excluding weekends)
    const totalDays = calculateWorkingDays(start, end);

    if (totalDays <= 0) {
      throw ApiError.badRequest(
        'The selected date range does not contain any working days.',
      );
    }

    // 3. Check for overlapping leave requests (pending or approved)
    const overlapping = await prisma.leave.findFirst({
      where: {
        employeeId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            // New leave starts during an existing leave
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });

    if (overlapping) {
      const overlapStart = overlapping.startDate.toISOString().split('T')[0];
      const overlapEnd = overlapping.endDate.toISOString().split('T')[0];
      throw ApiError.conflict(
        `You already have a ${overlapping.status.toLowerCase()} leave request from ${overlapStart} to ${overlapEnd} that overlaps with this period.`,
      );
    }

    // 4. Check leave balance (skip for unpaid leave)
    if (leaveType !== 'UNPAID') {
      const year = start.getFullYear();
      const balance = await this.getOrCreateLeaveBalance(employeeId, leaveType, year);
      const remainingLeaves = balance.totalLeaves - balance.usedLeaves;

      if (totalDays > remainingLeaves) {
        throw ApiError.badRequest(
          `Insufficient ${leaveType.toLowerCase()} leave balance. ` +
            `Available: ${remainingLeaves} days, Requested: ${totalDays} days.`,
        );
      }
    }

    // 5. Create the leave request
    const leave = await prisma.leave.create({
      data: {
        employeeId,
        leaveType,
        startDate: start,
        endDate: end,
        totalDays,
        reason: reason.trim(),
        status: 'PENDING',
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return leave;
  }

  // ============================================
  // Approve Leave
  // ============================================

  /**
   * Approves a pending leave request.
   * Deducts the leave days from the employee's leave balance.
   *
   * @param leaveId - The ID of the leave request to approve
   * @param approvedBy - The userId of the person approving the leave
   * @param remarks - Optional remarks from the approver
   * @returns The updated leave record
   * @throws ApiError if the leave is not found or not in PENDING status
   */
  static async approveLeave(leaveId: string, approvedBy: string, remarks?: string | null) {
    return this.updateLeaveStatus({
      leaveId,
      status: 'APPROVED',
      approvedBy,
      remarks: remarks ?? null,
    });
  }

  // ============================================
  // Reject Leave
  // ============================================

  /**
   * Rejects a pending leave request.
   * No balance deduction occurs for rejected leaves.
   *
   * @param leaveId - The ID of the leave request to reject
   * @param approvedBy - The userId of the person rejecting the leave
   * @param remarks - Optional remarks explaining the rejection reason
   * @returns The updated leave record
   * @throws ApiError if the leave is not found or not in PENDING status
   */
  static async rejectLeave(leaveId: string, approvedBy: string, remarks?: string | null) {
    return this.updateLeaveStatus({
      leaveId,
      status: 'REJECTED',
      approvedBy,
      remarks: remarks ?? null,
    });
  }

  // ============================================
  // Cancel Leave
  // ============================================

  /**
   * Cancels a leave request. Can be done by the employee (for pending/approved)
   * or by an admin/HR.
   *
   * If the leave was already approved, the balance is restored.
   *
   * @param leaveId - The ID of the leave request to cancel
   * @param cancelledBy - The userId of the person cancelling the leave
   * @param remarks - Optional remarks
   * @returns The updated leave record
   */
  static async cancelLeave(leaveId: string, cancelledBy: string, remarks?: string | null) {
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw ApiError.notFound('Leave request not found.');
    }

    if (leave.status === 'CANCELLED') {
      throw ApiError.badRequest('This leave request is already cancelled.');
    }

    if (leave.status === 'REJECTED') {
      throw ApiError.badRequest('Cannot cancel a rejected leave request.');
    }

    const wasApproved = leave.status === 'APPROVED';

    // Update leave status to CANCELLED
    const updatedLeave = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: 'CANCELLED',
        remarks: remarks?.trim() || leave.remarks,
        approvedBy: cancelledBy,
        approvedOn: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // If the leave was approved, restore the balance
    if (wasApproved && leave.leaveType !== 'UNPAID') {
      const year = leave.startDate.getFullYear();
      await this.adjustLeaveBalance(
        leave.employeeId,
        leave.leaveType,
        year,
        -leave.totalDays, // Negative = restore balance
      );
    }

    return updatedLeave;
  }

  // ============================================
  // Update Leave Status (internal helper)
  // ============================================

  /**
   * Internal method to update a leave request's status.
   * Handles both approval and rejection workflows, including
   * balance deduction on approval.
   *
   * @param params - Status update parameters
   * @returns The updated leave record with employee details
   */
  private static async updateLeaveStatus(params: UpdateLeaveStatusParams) {
    const { leaveId, status, approvedBy, remarks } = params;

    // Fetch the current leave request
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      throw ApiError.notFound('Leave request not found.');
    }

    // Only PENDING leaves can be approved or rejected
    if (leave.status !== 'PENDING') {
      throw ApiError.badRequest(
        `Cannot ${status.toLowerCase()} this leave request. ` +
          `Current status is "${leave.status}". Only PENDING leaves can be ${status.toLowerCase()}.`,
      );
    }

    // If approving, verify there's still sufficient balance
    if (status === 'APPROVED' && leave.leaveType !== 'UNPAID') {
      const year = leave.startDate.getFullYear();
      const balance = await this.getOrCreateLeaveBalance(
        leave.employeeId,
        leave.leaveType,
        year,
      );
      const remainingLeaves = balance.totalLeaves - balance.usedLeaves;

      if (leave.totalDays > remainingLeaves) {
        throw ApiError.badRequest(
          `Cannot approve: insufficient ${leave.leaveType.toLowerCase()} leave balance. ` +
            `Available: ${remainingLeaves} days, Requested: ${leave.totalDays} days.`,
        );
      }
    }

    // Use a transaction to atomically update leave status and balance
    const updatedLeave = await prisma.$transaction(async (tx) => {
      // Update the leave status
      const updated = await tx.leave.update({
        where: { id: leaveId },
        data: {
          status,
          remarks: remarks?.trim() || null,
          approvedBy,
          approvedOn: new Date(),
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              designation: true,
              department: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      // If approved, deduct from leave balance
      if (status === 'APPROVED' && leave.leaveType !== 'UNPAID') {
        const year = leave.startDate.getFullYear();
        await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveType_year: {
              employeeId: leave.employeeId,
              leaveType: leave.leaveType,
              year,
            },
          },
          update: {
            usedLeaves: { increment: leave.totalDays },
          },
          create: {
            employeeId: leave.employeeId,
            leaveType: leave.leaveType,
            year,
            totalLeaves: DEFAULT_LEAVE_ALLOCATIONS[leave.leaveType] || 0,
            usedLeaves: leave.totalDays,
          },
        });
      }

      return updated;
    });

    return updatedLeave;
  }

  // ============================================
  // Get Leave by ID
  // ============================================

  /**
   * Retrieves a single leave request by its ID.
   *
   * @param leaveId - The leave request ID
   * @returns The leave record with employee details
   * @throws ApiError 404 if not found
   */
  static async getLeaveById(leaveId: string) {
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            designation: true,
            avatar: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!leave) {
      throw ApiError.notFound('Leave request not found.');
    }

    return leave;
  }

  // ============================================
  // List Leaves (with filtering & pagination)
  // ============================================

  /**
   * Lists leave requests with support for filtering, searching,
   * pagination, and sorting.
   *
   * @param params - Filter and pagination parameters
   * @returns Paginated list of leave records with metadata
   */
  static async listLeaves(params: LeaveFilterParams) {
    const { page, limit, sortBy, sortOrder, search, employeeId, leaveType, status, startDate, endDate } = params;

    // Build the where clause with search and filters
    const where: Prisma.LeaveWhereInput = {};
    const andConditions: Prisma.LeaveWhereInput[] = [];

    // Filter by employee
    if (employeeId) {
      where.employeeId = employeeId;
    }

    // Filter by leave type
    if (leaveType) {
      where.leaveType = leaveType;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by date range
    if (startDate) {
      andConditions.push({
        startDate: { gte: new Date(startDate) },
      });
    }

    if (endDate) {
      andConditions.push({
        endDate: { lte: new Date(endDate) },
      });
    }

    // Text search across employee name and reason
    if (search && search.trim()) {
      andConditions.push({
        OR: [
          { reason: { contains: search.trim(), mode: 'insensitive' } },
          {
            employee: {
              OR: [
                { firstName: { contains: search.trim(), mode: 'insensitive' } },
                { lastName: { contains: search.trim(), mode: 'insensitive' } },
                { employeeId: { contains: search.trim(), mode: 'insensitive' } },
              ],
            },
          },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Count total matching records
    const total = await prisma.leave.count({ where });

    // Build sort order — handle nested sorts (e.g., employee.firstName)
    let orderBy: Prisma.LeaveOrderByWithRelationInput = { createdAt: 'desc' };
    const allowedSortFields = ['createdAt', 'startDate', 'endDate', 'totalDays', 'appliedOn', 'status', 'leaveType'];

    if (allowedSortFields.includes(sortBy)) {
      orderBy = { [sortBy]: sortOrder };
    }

    // Calculate pagination
    const pagination = paginate(page, limit, total);

    // Fetch the records
    const leaves = await prisma.leave.findMany({
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            designation: true,
            avatar: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return {
      data: leaves,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
        hasNextPage: pagination.hasNextPage,
        hasPrevPage: pagination.hasPrevPage,
      },
    };
  }

  // ============================================
  // Get Employee Leaves
  // ============================================

  /**
   * Retrieves all leave requests for a specific employee.
   * Useful for the employee's own leave history view.
   *
   * @param employeeId - The employee's ID
   * @param year - Optional year filter
   * @returns Array of leave records
   */
  static async getEmployeeLeaves(employeeId: string, year?: number) {
    const where: Prisma.LeaveWhereInput = { employeeId };

    if (year) {
      where.startDate = {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      };
    }

    const leaves = await prisma.leave.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            designation: true,
          },
        },
      },
    });

    return leaves;
  }

  // ============================================
  // Leave Balance Management
  // ============================================

  /**
   * Gets the leave balance for an employee for a specific leave type and year.
   * If no balance record exists, creates one with the default allocation.
   *
   * @param employeeId - The employee's ID
   * @param leaveType - The type of leave
   * @param year - The calendar year
   * @returns The leave balance record
   */
  static async getOrCreateLeaveBalance(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
  ) {
    const balance = await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveType_year: {
          employeeId,
          leaveType,
          year,
        },
      },
      update: {}, // No update if it already exists
      create: {
        employeeId,
        leaveType,
        year,
        totalLeaves: DEFAULT_LEAVE_ALLOCATIONS[leaveType] || 0,
        usedLeaves: 0,
      },
    });

    return balance;
  }

  /**
   * Retrieves the full leave balance summary for an employee.
   * Returns balances for all leave types for a given year.
   *
   * @param employeeId - The employee's ID
   * @param year - The calendar year (defaults to current year)
   * @returns Array of leave balance summaries
   */
  static async getLeaveBalanceSummary(
    employeeId: string,
    year: number = new Date().getFullYear(),
  ): Promise<LeaveBalanceSummary[]> {
    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });

    if (!employee) {
      throw ApiError.notFound('Employee not found.');
    }

    // Ensure balance records exist for all leave types
    const leaveTypes: LeaveType[] = [
      'CASUAL',
      'SICK',
      'EARNED',
      'MATERNITY',
      'PATERNITY',
      'UNPAID',
      'COMPENSATORY',
    ];

    // Create missing balance records in parallel
    await Promise.all(
      leaveTypes.map((lt) => this.getOrCreateLeaveBalance(employeeId, lt, year)),
    );

    // Fetch all balances for this employee and year
    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId, year },
      orderBy: { leaveType: 'asc' },
    });

    // Map to summary format with remaining calculation
    return balances.map((b) => ({
      leaveType: b.leaveType,
      totalLeaves: b.totalLeaves,
      usedLeaves: b.usedLeaves,
      remainingLeaves: Math.max(0, b.totalLeaves - b.usedLeaves),
      year: b.year,
    }));
  }

  /**
   * Sets or updates the leave balance for an employee.
   * Used by admins to manually adjust leave allocations.
   *
   * @param params - Balance update parameters
   * @returns The updated leave balance record
   */
  static async setLeaveBalance(params: LeaveBalanceParams) {
    const { employeeId, leaveType, totalLeaves, year } = params;

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });

    if (!employee) {
      throw ApiError.notFound('Employee not found.');
    }

    const balance = await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveType_year: {
          employeeId,
          leaveType,
          year,
        },
      },
      update: {
        totalLeaves,
      },
      create: {
        employeeId,
        leaveType,
        year,
        totalLeaves,
        usedLeaves: 0,
      },
    });

    return balance;
  }

  /**
   * Adjusts the used leave balance by a delta amount.
   * Positive delta = deduct balance (leave taken).
   * Negative delta = restore balance (leave cancelled/reverted).
   *
   * @param employeeId - The employee's ID
   * @param leaveType - The type of leave
   * @param year - The calendar year
   * @param delta - The amount to adjust (+/-)
   * @returns The updated leave balance record
   */
  private static async adjustLeaveBalance(
    employeeId: string,
    leaveType: LeaveType,
    year: number,
    delta: number,
  ) {
    const balance = await this.getOrCreateLeaveBalance(employeeId, leaveType, year);

    const newUsedLeaves = Math.max(0, balance.usedLeaves + delta);

    return prisma.leaveBalance.update({
      where: {
        employeeId_leaveType_year: {
          employeeId,
          leaveType,
          year,
        },
      },
      data: {
        usedLeaves: newUsedLeaves,
      },
    });
  }

  // ============================================
  // Initialize Leave Balances for New Employee
  // ============================================

  /**
   * Creates default leave balance records for a newly created employee.
   * Should be called when a new employee is onboarded.
   *
   * @param employeeId - The newly created employee's ID
   * @param year - The calendar year (defaults to current year)
   */
  static async initializeLeaveBalances(
    employeeId: string,
    year: number = new Date().getFullYear(),
  ): Promise<void> {
    const leaveTypes: LeaveType[] = [
      'CASUAL',
      'SICK',
      'EARNED',
      'MATERNITY',
      'PATERNITY',
      'UNPAID',
      'COMPENSATORY',
    ];

    const balanceRecords = leaveTypes.map((lt) => ({
      employeeId,
      leaveType: lt,
      year,
      totalLeaves: DEFAULT_LEAVE_ALLOCATIONS[lt] || 0,
      usedLeaves: 0,
    }));

    // Use createMany for efficient bulk insert (skip duplicates)
    await prisma.leaveBalance.createMany({
      data: balanceRecords,
      skipDuplicates: true,
    });
  }

  // ============================================
  // Dashboard / Statistics
  // ============================================

  /**
   * Returns leave statistics for the dashboard.
   * Includes counts by status, by type, and recent requests.
   *
   * @param departmentId - Optional filter by department
   * @returns Leave statistics object
   */
  static async getLeaveStats(departmentId?: string) {
    const currentYear = new Date().getFullYear();

    // Base where clause
    const baseWhere: Prisma.LeaveWhereInput = {
      startDate: {
        gte: new Date(`${currentYear}-01-01`),
      },
    };

    // Optionally filter by department
    if (departmentId) {
      baseWhere.employee = {
        departmentId,
      };
    }

    // Count by status
    const [pending, approved, rejected, cancelled] = await Promise.all([
      prisma.leave.count({ where: { ...baseWhere, status: 'PENDING' } }),
      prisma.leave.count({ where: { ...baseWhere, status: 'APPROVED' } }),
      prisma.leave.count({ where: { ...baseWhere, status: 'REJECTED' } }),
      prisma.leave.count({ where: { ...baseWhere, status: 'CANCELLED' } }),
    ]);

    // Count by leave type (approved only)
    const byType = await prisma.leave.groupBy({
      by: ['leaveType'],
      where: {
        ...baseWhere,
        status: 'APPROVED',
      },
      _count: { id: true },
      _sum: { totalDays: true },
    });

    // Recent leave requests (last 10)
    const recentRequests = await prisma.leave.findMany({
      where: baseWhere,
      orderBy: { appliedOn: 'desc' },
      take: 10,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            avatar: true,
            designation: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Employees currently on leave
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const onLeaveToday = await prisma.leave.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
        ...(departmentId
          ? { employee: { departmentId } }
          : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            avatar: true,
            designation: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return {
      summary: {
        total: pending + approved + rejected + cancelled,
        pending,
        approved,
        rejected,
        cancelled,
      },
      byType: byType.map((item) => ({
        leaveType: item.leaveType,
        count: item._count.id,
        totalDays: item._sum.totalDays || 0,
      })),
      recentRequests,
      onLeaveToday,
      onLeaveTodayCount: onLeaveToday.length,
    };
  }

  // ============================================
  // Bulk Operations
  // ============================================

  /**
   * Initializes leave balances for all active employees for a given year.
   * Typically run at the start of each calendar year.
   *
   * @param year - The calendar year to initialize balances for
   * @returns Count of employees processed
   */
  static async initializeYearlyBalances(year: number): Promise<number> {
    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    let processed = 0;

    for (const employee of activeEmployees) {
      await this.initializeLeaveBalances(employee.id, year);
      processed++;
    }

    return processed;
  }

  /**
   * Deletes a leave request. Only PENDING or CANCELLED requests can be deleted.
   * Approved or rejected leaves are kept for audit purposes.
   *
   * @param leaveId - The leave request ID to delete
   * @throws ApiError if the leave cannot be deleted
   */
  static async deleteLeave(leaveId: string): Promise<void> {
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      select: { id: true, status: true },
    });

    if (!leave) {
      throw ApiError.notFound('Leave request not found.');
    }

    if (leave.status === 'APPROVED') {
      throw ApiError.badRequest(
        'Cannot delete an approved leave request. Cancel it first.',
      );
    }

    await prisma.leave.delete({
      where: { id: leaveId },
    });
  }
}

export default LeaveService;
