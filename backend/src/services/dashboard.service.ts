// ============================================
// Dashboard Service
// ============================================
// Provides aggregated statistics, chart data, and summary
// information for the admin dashboard. Queries multiple tables
// to compile overview metrics, department breakdowns,
// attendance summaries, and performance data.

import prisma from '../config/database';
import { percentage, roundTo, getMonthBounds, calculateHoursWorked } from '../utils/helpers';

// ============================================
// Types
// ============================================

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  onLeaveEmployees: number;
  newHiresThisMonth: number;
  pendingLeaveRequests: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  attendanceRate: number;
  departments: number;
}

export interface DepartmentBreakdown {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  employeeCount: number;
  activeCount: number;
  percentage: number;
  color: string;
}

export interface AttendanceSummary {
  totalWorkingDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  onLeaveCount: number;
  holidayCount: number;
  unmarkedCount: number;
  attendanceRate: number;
  onTimeRate: number;
  lateRate: number;
  absentRate: number;
}

export interface TopPerformer {
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  avatar: string | null;
  rating: number;
  reviewPeriod: string;
}

export interface TopAbsentee {
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  avatar: string | null;
  absentDays: number;
  totalDays: number;
  absentPercentage: number;
}

export interface MonthlyAttendanceChart {
  month: string;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
}

export interface LeaveTypeDistribution {
  leaveType: string;
  count: number;
  percentage: number;
  color: string;
}

export interface RecentActivity {
  id: string;
  type: 'leave' | 'attendance' | 'employee' | 'announcement';
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
}

// Color palette for department charts
const DEPARTMENT_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ef4444', // red
];

const LEAVE_TYPE_COLORS: Record<string, string> = {
  CASUAL: '#6366f1',
  SICK: '#ef4444',
  EARNED: '#22c55e',
  MATERNITY: '#ec4899',
  PATERNITY: '#3b82f6',
  UNPAID: '#f97316',
  COMPENSATORY: '#8b5cf6',
};

// ============================================
// Dashboard Service Class
// ============================================

export class DashboardService {
  /**
   * Fetches all dashboard statistics in a single call.
   * Runs multiple queries in parallel for performance.
   */
  static async getStats(): Promise<DashboardStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Run all count queries in parallel for maximum performance
    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      onLeaveEmployees,
      newHiresThisMonth,
      pendingLeaveRequests,
      todayAttendance,
      departments,
    ] = await Promise.all([
      // Total employees count
      prisma.employee.count(),

      // Active employees count
      prisma.employee.count({
        where: { status: 'ACTIVE' },
      }),

      // Inactive employees count
      prisma.employee.count({
        where: { status: 'INACTIVE' },
      }),

      // Employees currently on leave
      prisma.employee.count({
        where: { status: 'ON_LEAVE' },
      }),

      // New hires this month
      prisma.employee.count({
        where: {
          joiningDate: {
            gte: startOfMonth,
          },
        },
      }),

      // Pending leave requests
      prisma.leave.count({
        where: { status: 'PENDING' },
      }),

      // Today's attendance records
      prisma.attendance.groupBy({
        by: ['status'],
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        _count: {
          status: true,
        },
      }),

      // Total departments count
      prisma.department.count({
        where: { isActive: true },
      }),
    ]);

    // Parse today's attendance by status
    let todayPresent = 0;
    let todayAbsent = 0;
    let todayLate = 0;

    for (const record of todayAttendance) {
      switch (record.status) {
        case 'PRESENT':
          todayPresent = record._count.status;
          break;
        case 'ABSENT':
          todayAbsent = record._count.status;
          break;
        case 'LATE':
          todayLate = record._count.status;
          break;
        case 'HALF_DAY':
          todayPresent += record._count.status; // Count half-days as present
          break;
      }
    }

    // Calculate attendance rate (present + late + half-day) / total active employees
    const totalTracked = todayPresent + todayLate + todayAbsent;
    const attendanceRate = totalTracked > 0
      ? percentage(todayPresent + todayLate, totalTracked)
      : 0;

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      onLeaveEmployees,
      newHiresThisMonth,
      pendingLeaveRequests,
      todayPresent,
      todayAbsent,
      todayLate,
      attendanceRate,
      departments,
    };
  }

  /**
   * Returns employee count broken down by department,
   * suitable for pie/donut chart rendering on the dashboard.
   */
  static async getDepartmentBreakdown(): Promise<DepartmentBreakdown[]> {
    // Query departments with their employee counts
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        employees: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Calculate total employees across all departments for percentage
    const totalEmployees = departments.reduce(
      (sum, dept) => sum + dept.employees.length,
      0,
    );

    // Map departments to the breakdown structure
    const breakdown: DepartmentBreakdown[] = departments.map((dept, index) => {
      const employeeCount = dept.employees.length;
      const activeCount = dept.employees.filter((e) => e.status === 'ACTIVE').length;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code,
        employeeCount,
        activeCount,
        percentage: percentage(employeeCount, totalEmployees),
        color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
      };
    });

    // Sort by employee count descending
    return breakdown.sort((a, b) => b.employeeCount - a.employeeCount);
  }

  /**
   * Returns the attendance summary for a given month.
   * Calculates present, absent, late, on-leave, holiday, and unmarked counts.
   *
   * @param year - The year (e.g., 2024)
   * @param month - The month (1-12)
   */
  static async getAttendanceSummary(
    year?: number,
    month?: number,
  ): Promise<AttendanceSummary> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1;
    const { start, end } = getMonthBounds(targetYear, targetMonth);

    // Count total working days in the month (excluding weekends)
    let totalWorkingDays = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        totalWorkingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Get attendance records grouped by status for the month
    const attendanceGroups = await prisma.attendance.groupBy({
      by: ['status'],
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        status: true,
      },
    });

    // Parse counts by status
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let onLeaveCount = 0;
    let holidayCount = 0;

    for (const group of attendanceGroups) {
      switch (group.status) {
        case 'PRESENT':
          presentCount = group._count.status;
          break;
        case 'ABSENT':
          absentCount = group._count.status;
          break;
        case 'LATE':
          lateCount = group._count.status;
          break;
        case 'HALF_DAY':
          halfDayCount = group._count.status;
          break;
        case 'ON_LEAVE':
          onLeaveCount = group._count.status;
          break;
        case 'HOLIDAY':
          holidayCount = group._count.status;
          break;
      }
    }

    // Get total active employees for unmarked calculation
    const activeEmployees = await prisma.employee.count({
      where: { status: 'ACTIVE' },
    });

    // Calculate total tracked records
    const totalRecords = presentCount + absentCount + lateCount + halfDayCount + onLeaveCount + holidayCount;

    // Calculate days elapsed so far this month (up to today or end of month)
    const effectiveEnd = now < end ? now : end;
    let daysElapsed = 0;
    const check = new Date(start);
    while (check <= effectiveEnd) {
      const dow = check.getDay();
      if (dow !== 0 && dow !== 6) {
        daysElapsed++;
      }
      check.setDate(check.getDate() + 1);
    }

    // Expected records = active employees * working days elapsed
    const expectedRecords = activeEmployees * daysElapsed;
    const unmarkedCount = Math.max(0, expectedRecords - totalRecords);

    // Calculate rates
    const totalForRate = presentCount + absentCount + lateCount + halfDayCount;
    const attendanceRate = totalForRate > 0 ? percentage(presentCount + lateCount + halfDayCount, totalForRate) : 0;
    const onTimeRate = totalForRate > 0 ? percentage(presentCount, totalForRate) : 0;
    const lateRate = totalForRate > 0 ? percentage(lateCount, totalForRate) : 0;
    const absentRate = totalForRate > 0 ? percentage(absentCount, totalForRate) : 0;

    return {
      totalWorkingDays,
      presentCount,
      absentCount,
      lateCount,
      halfDayCount,
      onLeaveCount,
      holidayCount,
      unmarkedCount,
      attendanceRate,
      onTimeRate,
      lateRate,
      absentRate,
    };
  }

  /**
   * Returns the top performing employees based on their
   * latest performance review ratings.
   *
   * @param limit - Maximum number of results (default: 5)
   */
  static async getTopPerformers(limit: number = 5): Promise<TopPerformer[]> {
    const reviews = await prisma.performanceReview.findMany({
      orderBy: {
        rating: 'desc',
      },
      take: limit,
      distinct: ['employeeId'], // One review per employee (the best one)
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            avatar: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return reviews.map((review) => ({
      employeeId: review.employee.id,
      employeeName: `${review.employee.firstName} ${review.employee.lastName}`,
      designation: review.employee.designation,
      department: review.employee.department?.name ?? 'Unassigned',
      avatar: review.employee.avatar,
      rating: review.rating,
      reviewPeriod: review.reviewPeriod,
    }));
  }

  /**
   * Returns the employees with the most absent days in the
   * current month or a specified date range.
   *
   * @param limit - Maximum number of results (default: 5)
   * @param year - Year to query (defaults to current year)
   * @param month - Month to query (defaults to current month)
   */
  static async getTopAbsentees(
    limit: number = 5,
    year?: number,
    month?: number,
  ): Promise<TopAbsentee[]> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1;
    const { start, end } = getMonthBounds(targetYear, targetMonth);

    // Get absent counts grouped by employee
    const absentRecords = await prisma.attendance.groupBy({
      by: ['employeeId'],
      where: {
        date: {
          gte: start,
          lte: end,
        },
        status: 'ABSENT',
      },
      _count: {
        status: true,
      },
      orderBy: {
        _count: {
          status: 'desc',
        },
      },
      take: limit,
    });

    if (absentRecords.length === 0) {
      return [];
    }

    // Fetch employee details for the absentees
    const employeeIds = absentRecords.map((r) => r.employeeId);
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        designation: true,
        avatar: true,
        department: {
          select: {
            name: true,
          },
        },
      },
    });

    // Create a lookup map for employee data
    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // Count total working days in the month for percentage calculation
    let totalWorkingDays = 0;
    const current = new Date(start);
    while (current <= end && current <= now) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        totalWorkingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return absentRecords
      .map((record) => {
        const employee = employeeMap.get(record.employeeId);
        if (!employee) return null;

        return {
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          designation: employee.designation,
          department: employee.department?.name ?? 'Unassigned',
          avatar: employee.avatar,
          absentDays: record._count.status,
          totalDays: totalWorkingDays,
          absentPercentage: percentage(record._count.status, totalWorkingDays),
        };
      })
      .filter((item): item is TopAbsentee => item !== null);
  }

  /**
   * Returns monthly attendance data for the past N months,
   * suitable for rendering bar/line charts on the dashboard.
   *
   * @param months - Number of past months to include (default: 6)
   */
  static async getMonthlyAttendanceChart(
    months: number = 6,
  ): Promise<MonthlyAttendanceChart[]> {
    const now = new Date();
    const results: MonthlyAttendanceChart[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const { start, end } = getMonthBounds(year, month);

      // Get attendance grouped by status for this month
      const groups = await prisma.attendance.groupBy({
        by: ['status'],
        where: {
          date: {
            gte: start,
            lte: end,
          },
        },
        _count: {
          status: true,
        },
      });

      let present = 0;
      let absent = 0;
      let late = 0;
      let onLeave = 0;

      for (const group of groups) {
        switch (group.status) {
          case 'PRESENT':
            present = group._count.status;
            break;
          case 'ABSENT':
            absent = group._count.status;
            break;
          case 'LATE':
            late = group._count.status;
            break;
          case 'ON_LEAVE':
            onLeave = group._count.status;
            break;
          case 'HALF_DAY':
            present += group._count.status;
            break;
        }
      }

      // Format month label (e.g., "Jan 2024")
      const monthLabel = targetDate.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });

      results.push({
        month: monthLabel,
        present,
        absent,
        late,
        onLeave,
      });
    }

    return results;
  }

  /**
   * Returns leave request distribution by type for the current year,
   * suitable for pie/donut chart rendering.
   */
  static async getLeaveTypeDistribution(): Promise<LeaveTypeDistribution[]> {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const leaveGroups = await prisma.leave.groupBy({
      by: ['leaveType'],
      where: {
        appliedOn: {
          gte: startOfYear,
          lte: endOfYear,
        },
        status: {
          in: ['APPROVED', 'PENDING'],
        },
      },
      _count: {
        leaveType: true,
      },
    });

    const totalLeaves = leaveGroups.reduce(
      (sum, group) => sum + group._count.leaveType,
      0,
    );

    return leaveGroups
      .map((group) => ({
        leaveType: group.leaveType,
        count: group._count.leaveType,
        percentage: percentage(group._count.leaveType, totalLeaves),
        color: LEAVE_TYPE_COLORS[group.leaveType] || '#9ca3af',
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Returns recent activity items for the dashboard feed.
   * Aggregates recent leave requests, attendance events, new employees,
   * and announcements into a unified activity stream.
   *
   * @param limit - Maximum number of activity items (default: 10)
   */
  static async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    const activities: RecentActivity[] = [];

    // Fetch recent leave requests
    const recentLeaves = await prisma.leave.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.ceil(limit / 3),
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    for (const leave of recentLeaves) {
      const name = `${leave.employee.firstName} ${leave.employee.lastName}`;
      activities.push({
        id: leave.id,
        type: 'leave',
        title: `Leave Request - ${leave.leaveType}`,
        description: `${name} applied for ${leave.totalDays} day(s) of ${leave.leaveType.toLowerCase()} leave. Status: ${leave.status}`,
        timestamp: leave.createdAt,
        userName: name,
      });
    }

    // Fetch recently joined employees
    const recentEmployees = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.ceil(limit / 3),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        designation: true,
        joiningDate: true,
        createdAt: true,
        department: {
          select: { name: true },
        },
      },
    });

    for (const emp of recentEmployees) {
      const name = `${emp.firstName} ${emp.lastName}`;
      activities.push({
        id: emp.id,
        type: 'employee',
        title: 'New Employee Joined',
        description: `${name} joined as ${emp.designation} in ${emp.department?.name ?? 'Unassigned'} department.`,
        timestamp: emp.createdAt,
        userName: name,
      });
    }

    // Fetch recent announcements
    const recentAnnouncements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.ceil(limit / 3),
      where: { isActive: true },
    });

    for (const ann of recentAnnouncements) {
      activities.push({
        id: ann.id,
        type: 'announcement',
        title: ann.title,
        description: ann.content.length > 150 ? ann.content.substring(0, 150) + '...' : ann.content,
        timestamp: ann.createdAt,
        userName: ann.publishedBy ?? 'System',
      });
    }

    // Sort all activities by timestamp descending and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Returns a combined dashboard data payload containing all
   * widgets and charts. This is the primary endpoint used by
   * the frontend dashboard page.
   */
  static async getFullDashboard() {
    // Execute all dashboard queries in parallel
    const [
      stats,
      departmentBreakdown,
      attendanceSummary,
      topPerformers,
      topAbsentees,
      monthlyAttendance,
      leaveDistribution,
      recentActivity,
    ] = await Promise.all([
      DashboardService.getStats(),
      DashboardService.getDepartmentBreakdown(),
      DashboardService.getAttendanceSummary(),
      DashboardService.getTopPerformers(5),
      DashboardService.getTopAbsentees(5),
      DashboardService.getMonthlyAttendanceChart(6),
      DashboardService.getLeaveTypeDistribution(),
      DashboardService.getRecentActivity(10),
    ]);

    return {
      stats,
      departmentBreakdown,
      attendanceSummary,
      topPerformers,
      topAbsentees,
      charts: {
        monthlyAttendance,
        leaveDistribution,
      },
      recentActivity,
    };
  }
}

export default DashboardService;
