// ============================================
// Attendance Service
// ============================================
// Business logic for attendance management including
// clock in/out, attendance records, and summary statistics.

import { AttendanceStatus, Prisma } from '@prisma/client';

import prisma from '../config/database';
import { ApiError } from '../utils/ApiError';
import { calculateHoursWorked, getDayBounds, getMonthBounds } from '../utils/helpers';

// ============================================
// Types
// ============================================

export interface ClockInData {
  employeeId: string;
  notes?: string | null;
  location?: string | null;
  ipAddress?: string | null;
}

export interface ClockOutData {
  employeeId: string;
  notes?: string | null;
}

export interface ManualAttendanceData {
  employeeId: string;
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  status: AttendanceStatus;
  notes?: string | null;
}

export interface AttendanceFilter {
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface AttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
  weekend: number;
  attendanceRate: number;
  averageHoursWorked: number;
}

export interface DepartmentAttendanceSummary {
  departmentId: string;
  departmentName: string;
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  attendanceRate: number;
}

// ============================================
// Attendance Service Class
// ============================================

export class AttendanceService {
  /**
   * Clock in for the current day.
   * Creates a new attendance record with the current timestamp.
   * Prevents duplicate clock-ins for the same day.
   */
  static async clockIn(data: ClockInData) {
    const { employeeId, notes, location, ipAddress } = data;

    // Verify the employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, firstName: true, lastName: true, status: true },
    });

    if (!employee) {
      throw ApiError.notFound('Employee not found');
    }

    if (employee.status !== 'ACTIVE') {
      throw ApiError.badRequest('Only active employees can clock in');
    }

    // Check if there's already an attendance record for today
    const today = new Date();
    const { start, end } = getDayBounds(today);

    const existingRecord = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    if (existingRecord) {
      if (existingRecord.clockIn) {
        throw ApiError.conflict(
          'You have already clocked in today. Use clock-out to end your session.',
        );
      }

      // Update existing record (e.g., created by admin as ABSENT but employee showed up)
      const updated = await prisma.attendance.update({
        where: { id: existingRecord.id },
        data: {
          clockIn: today,
          status: AttendanceService.determineClockInStatus(today),
          notes: notes || existingRecord.notes,
          location,
          ipAddress,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
      });

      return updated;
    }

    // Create a new attendance record
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const status = AttendanceService.determineClockInStatus(today);

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: todayDateOnly,
        clockIn: today,
        status,
        notes,
        location,
        ipAddress,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    return attendance;
  }

  /**
   * Clock out for the current day.
   * Updates the existing attendance record with the clock-out time
   * and calculates total hours worked.
   */
  static async clockOut(data: ClockOutData) {
    const { employeeId, notes } = data;

    // Find today's attendance record
    const today = new Date();
    const { start, end } = getDayBounds(today);

    const existingRecord = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    if (!existingRecord) {
      throw ApiError.badRequest(
        'No clock-in record found for today. Please clock in first.',
      );
    }

    if (!existingRecord.clockIn) {
      throw ApiError.badRequest(
        'No clock-in time recorded. Please clock in first.',
      );
    }

    if (existingRecord.clockOut) {
      throw ApiError.conflict('You have already clocked out today.');
    }

    // Calculate total hours worked
    const totalHours = calculateHoursWorked(existingRecord.clockIn, today);

    const updated = await prisma.attendance.update({
      where: { id: existingRecord.id },
      data: {
        clockOut: today,
        totalHours,
        notes: notes || existingRecord.notes,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Create or update a manual attendance record.
   * Used by admins/HR to set attendance for specific dates.
   */
  static async createManualAttendance(data: ManualAttendanceData) {
    const { employeeId, date, clockIn, clockOut, status, notes } = data;

    // Verify the employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });

    if (!employee) {
      throw ApiError.notFound('Employee not found');
    }

    const attendanceDate = new Date(date);
    const dateOnly = new Date(
      attendanceDate.getFullYear(),
      attendanceDate.getMonth(),
      attendanceDate.getDate(),
    );

    // Calculate total hours if both clock in and clock out are provided
    let totalHours: number | null = null;
    if (clockIn && clockOut) {
      totalHours = calculateHoursWorked(clockIn, clockOut);
    }

    // Upsert — create or update attendance for the given employee + date
    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: dateOnly,
        },
      },
      create: {
        employeeId,
        date: dateOnly,
        clockIn: clockIn ? new Date(clockIn) : null,
        clockOut: clockOut ? new Date(clockOut) : null,
        totalHours,
        status,
        notes,
      },
      update: {
        clockIn: clockIn ? new Date(clockIn) : undefined,
        clockOut: clockOut ? new Date(clockOut) : undefined,
        totalHours: totalHours ?? undefined,
        status,
        notes,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    return attendance;
  }

  /**
   * Get attendance records with filtering and pagination.
   */
  static async getAttendanceList(filter: AttendanceFilter) {
    const { employeeId, date, startDate, endDate, status, page, limit, sortBy, sortOrder } = filter;

    // Build where clause
    const where: Prisma.AttendanceWhereInput = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (date) {
      const { start, end } = getDayBounds(date);
      where.date = { gte: start, lte: end };
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Prisma.DateTimeFilter).gte = new Date(startDate);
      }
      if (endDate) {
        (where.date as Prisma.DateTimeFilter).lte = new Date(endDate);
      }
    }

    if (status) {
      where.status = status;
    }

    // Count total records matching the filter
    const total = await prisma.attendance.count({ where });

    // Fetch paginated records
    const skip = (page - 1) * limit;
    const orderBy: Prisma.AttendanceOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const records = await prisma.attendance.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            avatar: true,
            designation: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get a single attendance record by ID.
   */
  static async getAttendanceById(id: string) {
    const record = await prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            avatar: true,
            designation: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!record) {
      throw ApiError.notFound('Attendance record not found');
    }

    return record;
  }

  /**
   * Get today's attendance status for a specific employee.
   */
  static async getTodayStatus(employeeId: string) {
    const today = new Date();
    const { start, end } = getDayBounds(today);

    const record = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: start, lte: end },
      },
    });

    return {
      hasClockedIn: !!record?.clockIn,
      hasClockedOut: !!record?.clockOut,
      clockInTime: record?.clockIn || null,
      clockOutTime: record?.clockOut || null,
      totalHours: record?.totalHours || null,
      status: record?.status || 'UNMARKED',
    };
  }

  /**
   * Get attendance summary for a specific employee within a date range.
   * Calculates counts of each status type, attendance rate, and average hours.
   */
  static async getEmployeeSummary(
    employeeId: string,
    year: number,
    month?: number,
  ): Promise<AttendanceSummary> {
    // Build date range
    let startDate: Date;
    let endDate: Date;

    if (month) {
      const bounds = getMonthBounds(year, month);
      startDate = bounds.start;
      endDate = bounds.end;
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    // Fetch all attendance records in the date range
    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        status: true,
        totalHours: true,
      },
    });

    // Count each status type
    const statusCounts = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      holiday: 0,
      weekend: 0,
    };

    let totalHoursSum = 0;
    let hoursRecordCount = 0;

    for (const record of records) {
      switch (record.status) {
        case 'PRESENT':
          statusCounts.present++;
          break;
        case 'ABSENT':
          statusCounts.absent++;
          break;
        case 'LATE':
          statusCounts.late++;
          break;
        case 'HALF_DAY':
          statusCounts.halfDay++;
          break;
        case 'ON_LEAVE':
          statusCounts.onLeave++;
          break;
        case 'HOLIDAY':
          statusCounts.holiday++;
          break;
        case 'WEEKEND':
          statusCounts.weekend++;
          break;
      }

      if (record.totalHours && record.totalHours > 0) {
        totalHoursSum += record.totalHours;
        hoursRecordCount++;
      }
    }

    const totalDays = records.length;
    // Working days = total - holidays - weekends
    const workingDays = totalDays - statusCounts.holiday - statusCounts.weekend;
    // Present effectively includes PRESENT + LATE (they were at work)
    const effectivePresent = statusCounts.present + statusCounts.late + statusCounts.halfDay * 0.5;
    const attendanceRate = workingDays > 0 ? Math.round((effectivePresent / workingDays) * 1000) / 10 : 0;
    const averageHoursWorked = hoursRecordCount > 0
      ? Math.round((totalHoursSum / hoursRecordCount) * 100) / 100
      : 0;

    return {
      totalDays,
      ...statusCounts,
      attendanceRate,
      averageHoursWorked,
    };
  }

  /**
   * Get an organization-wide attendance summary for today,
   * broken down by department. Used on the dashboard.
   */
  static async getDepartmentSummary(): Promise<DepartmentAttendanceSummary[]> {
    const today = new Date();
    const { start, end } = getDayBounds(today);

    // Get all departments with their employee counts
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        employees: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            attendance: {
              where: {
                date: { gte: start, lte: end },
              },
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    return departments.map((dept) => {
      const totalEmployees = dept.employees.length;
      let presentToday = 0;
      let absentToday = 0;
      let lateToday = 0;
      let onLeaveToday = 0;

      for (const emp of dept.employees) {
        const todayAttendance = emp.attendance[0]; // At most one record per day

        if (!todayAttendance) {
          // No record = unmarked, could be absent
          absentToday++;
          continue;
        }

        switch (todayAttendance.status) {
          case 'PRESENT':
          case 'HALF_DAY':
            presentToday++;
            break;
          case 'LATE':
            lateToday++;
            break;
          case 'ON_LEAVE':
            onLeaveToday++;
            break;
          case 'ABSENT':
          default:
            absentToday++;
            break;
        }
      }

      const effectivePresent = presentToday + lateToday;
      const attendanceRate = totalEmployees > 0
        ? Math.round((effectivePresent / totalEmployees) * 1000) / 10
        : 0;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        totalEmployees,
        presentToday,
        absentToday,
        lateToday,
        onLeaveToday,
        attendanceRate,
      };
    });
  }

  /**
   * Get overall attendance summary stats for the dashboard.
   * Returns counts for today across the entire organization.
   */
  static async getOverallTodaySummary() {
    const today = new Date();
    const { start, end } = getDayBounds(today);

    // Total active employees
    const totalActiveEmployees = await prisma.employee.count({
      where: { status: 'ACTIVE' },
    });

    // Today's attendance records
    const todayRecords = await prisma.attendance.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      select: {
        status: true,
      },
    });

    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      holiday: 0,
    };

    for (const record of todayRecords) {
      switch (record.status) {
        case 'PRESENT':
          counts.present++;
          break;
        case 'ABSENT':
          counts.absent++;
          break;
        case 'LATE':
          counts.late++;
          break;
        case 'HALF_DAY':
          counts.halfDay++;
          break;
        case 'ON_LEAVE':
          counts.onLeave++;
          break;
        case 'HOLIDAY':
          counts.holiday++;
          break;
      }
    }

    // Employees who haven't been marked yet today
    const unmarked = totalActiveEmployees - todayRecords.length;

    const attendanceRate = totalActiveEmployees > 0
      ? Math.round(((counts.present + counts.late) / totalActiveEmployees) * 1000) / 10
      : 0;

    return {
      totalEmployees: totalActiveEmployees,
      totalMarked: todayRecords.length,
      unmarked: Math.max(0, unmarked),
      ...counts,
      attendanceRate,
    };
  }

  /**
   * Get attendance records for a specific employee for a given month.
   * Returns an array of daily records, useful for calendar views.
   */
  static async getMonthlyCalendar(employeeId: string, year: number, month: number) {
    const { start, end } = getMonthBounds(year, month);

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        clockIn: true,
        clockOut: true,
        totalHours: true,
        status: true,
        notes: true,
      },
    });

    return records;
  }

  /**
   * Delete an attendance record by ID.
   * Only admins should be able to perform this operation.
   */
  static async deleteAttendance(id: string) {
    const record = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!record) {
      throw ApiError.notFound('Attendance record not found');
    }

    await prisma.attendance.delete({ where: { id } });

    return { message: 'Attendance record deleted successfully' };
  }

  /**
   * Bulk mark attendance for all employees for a given date.
   * Useful for marking holidays or filling in missing records.
   */
  static async bulkMarkAttendance(
    date: string,
    status: AttendanceStatus,
    employeeIds?: string[],
    notes?: string,
  ) {
    const attendanceDate = new Date(date);
    const dateOnly = new Date(
      attendanceDate.getFullYear(),
      attendanceDate.getMonth(),
      attendanceDate.getDate(),
    );

    // Get target employees
    let targetEmployeeIds: string[];

    if (employeeIds && employeeIds.length > 0) {
      targetEmployeeIds = employeeIds;
    } else {
      // All active employees
      const activeEmployees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });
      targetEmployeeIds = activeEmployees.map((e) => e.id);
    }

    // Get existing records for this date to avoid duplicates
    const existingRecords = await prisma.attendance.findMany({
      where: {
        date: dateOnly,
        employeeId: { in: targetEmployeeIds },
      },
      select: { employeeId: true },
    });

    const existingEmployeeIds = new Set(existingRecords.map((r) => r.employeeId));
    const newEmployeeIds = targetEmployeeIds.filter((id) => !existingEmployeeIds.has(id));

    // Create attendance records for employees who don't have one yet
    if (newEmployeeIds.length > 0) {
      await prisma.attendance.createMany({
        data: newEmployeeIds.map((employeeId) => ({
          employeeId,
          date: dateOnly,
          status,
          notes: notes || null,
        })),
        skipDuplicates: true,
      });
    }

    // Update existing records if requested
    if (existingRecords.length > 0) {
      await prisma.attendance.updateMany({
        where: {
          date: dateOnly,
          employeeId: { in: Array.from(existingEmployeeIds) },
        },
        data: {
          status,
          notes: notes || undefined,
        },
      });
    }

    return {
      created: newEmployeeIds.length,
      updated: existingRecords.length,
      total: targetEmployeeIds.length,
    };
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Determines the attendance status based on clock-in time.
   * If clocked in after 9:30 AM, the employee is marked as LATE.
   * This threshold can be made configurable via settings.
   */
  private static determineClockInStatus(clockInTime: Date): AttendanceStatus {
    const hours = clockInTime.getHours();
    const minutes = clockInTime.getMinutes();

    // Late threshold: after 9:30 AM (configurable in settings ideally)
    const lateHour = 9;
    const lateMinute = 30;

    if (hours > lateHour || (hours === lateHour && minutes > lateMinute)) {
      return 'LATE';
    }

    return 'PRESENT';
  }
}

export default AttendanceService;
