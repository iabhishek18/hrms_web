// ============================================
// Dashboard Page
// ============================================
// Main dashboard view for the HRMS application.
// Displays summary statistics, charts, top performers,
// top absentees, department breakdown, and attendance
// summary widgets. Matches the reference dashboard at
// https://hrms.kunaldutta.com/dashboard
//
// Layout:
//   Row 1: Overview stat cards (Total Employees, Active, Inactive, etc.)
//   Row 2: Department breakdown (donut chart) + Performance report (bar chart)
//   Row 3: Top Performers + Top Absentees tables
//   Row 4: Attendance Summary (pie/donut + stats)

import { useEffect, useCallback, useMemo } from "react";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import {
  fetchFullDashboard,
  fetchDashboardStats,
  fetchTopPerformers,
  fetchTopAbsentees,
  fetchDepartmentBreakdown,
  fetchAttendanceSummary,
  fetchMonthlyAttendanceChart,
  selectDashboardStats,
  selectDepartmentBreakdown,
  selectAttendanceSummary,
  selectTopPerformers,
  selectTopAbsentees,
  selectMonthlyAttendance,
  selectDashboardLoading,
  selectDashboardError,
} from "@/store/slices/dashboardSlice";
import { setPageTitle, selectResolvedTheme } from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";
import {
  HiOutlineUsers,
  HiOutlineUserPlus,
  HiOutlineUserMinus,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineChartBarSquare,
  HiOutlineEllipsisHorizontal,
  HiOutlineStar,
} from "react-icons/hi2";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ============================================
// Chart Color Palette
// ============================================

const DEPARTMENT_COLORS = [
  "#6366f1", // primary/indigo
  "#8b5cf6", // accent/violet
  "#06b6d4", // cyan
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#64748b", // slate
];

const ATTENDANCE_COLORS = {
  present: "#22c55e",
  late: "#f59e0b",
  absent: "#ef4444",
  holiday: "#6366f1",
  onLeave: "#06b6d4",
  unmarked: "#475569",
};

// ============================================
// Skeleton Loader Component
// ============================================

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-gray-200 bg-white p-5 dark:border-dark-700/50 dark:bg-dark-800/50",
        className,
      )}
    >
      <div className="mb-3 h-4 w-24 rounded bg-gray-200 dark:bg-dark-700" />
      <div className="mb-2 h-8 w-16 rounded bg-gray-200 dark:bg-dark-700" />
      <div className="h-3 w-32 rounded bg-gray-200 dark:bg-dark-700" />
    </div>
  );
}

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-gray-200 bg-white p-5 dark:border-dark-700/50 dark:bg-dark-800/50",
        className,
      )}
    >
      <div className="mb-4 h-5 w-32 rounded bg-gray-200 dark:bg-dark-700" />
      <div className="flex items-end justify-center gap-2 pt-4">
        {[60, 80, 40, 90, 55, 70, 45, 85].map((h, i) => (
          <div
            key={i}
            className="w-8 rounded-t bg-gray-200 dark:bg-dark-700"
            style={{ height: `${h}%`, minHeight: `${h}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-dark-700" />
          <div className="flex-1">
            <div className="mb-1 h-3.5 w-28 rounded bg-gray-200 dark:bg-dark-700" />
            <div className="h-2.5 w-20 rounded bg-gray-200 dark:bg-dark-700" />
          </div>
          <div className="h-4 w-10 rounded bg-gray-200 dark:bg-dark-700" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  loading?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  loading,
}: StatCardProps) {
  if (loading) {
    return <SkeletonCard />;
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-card transition-all duration-200 hover:border-gray-300 hover:shadow-card-hover dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none dark:hover:border-dark-600/50 dark:hover:shadow-card-dark-hover">
      {/* Background glow effect on hover */}
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-10",
          iconBg,
        )}
      />

      <div className="relative flex items-start justify-between">
        {/* Content */}
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-dark-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">
              {subtitle}
            </p>
          )}

          {/* Trend indicator */}
          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              {trend.isPositive ? (
                <div className="flex items-center gap-0.5 text-success-600 dark:text-success-400">
                  <HiOutlineArrowTrendingUp className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">+{trend.value}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 text-danger-600 dark:text-danger-400">
                  <HiOutlineArrowTrendingDown className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    -{Math.abs(trend.value)}%
                  </span>
                </div>
              )}
              <span className="text-2xs text-gray-400 dark:text-dark-500">
                {trend.label}
              </span>
            </div>
          )}
        </div>

        {/* Icon */}
        <div
          className={cn(
            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl",
            iconBg,
          )}
        >
          <Icon className={cn("h-5.5 w-5.5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Card Wrapper Component (for chart sections)
// ============================================

interface CardWrapperProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}

function CardWrapper({
  title,
  subtitle,
  action,
  children,
  className,
  loading,
}: CardWrapperProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-dark-700/30">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-2xs text-gray-500 dark:text-dark-400">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Content */}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ============================================
// Avatar Component (inline)
// ============================================

function Avatar({
  name,
  avatar,
  size = "sm",
}: {
  name: string;
  avatar?: string | null;
  size?: "sm" | "md";
}) {
  const initials = name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Generate a consistent color from the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-primary-600",
    "bg-accent-600",
    "bg-success-600",
    "bg-warning-600",
    "bg-danger-600",
    "bg-info-600",
  ];
  const colorClass = colors[Math.abs(hash) % colors.length];

  const sizeClass = size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={cn(sizeClass, "rounded-full object-cover")}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        colorClass,
        "flex items-center justify-center rounded-full font-semibold text-white",
      )}
    >
      {initials}
    </div>
  );
}

// ============================================
// Rating Stars Component
// ============================================

function RatingStars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <HiOutlineStar
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < Math.round(rating)
              ? "fill-warning-400 text-warning-400"
              : "text-gray-300 dark:text-dark-600",
          )}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-gray-600 dark:text-dark-300 tabular-nums">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

// ============================================
// Custom Tooltip for Charts
// ============================================

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-xl dark:border-dark-600 dark:bg-dark-800">
      <p className="mb-1.5 text-xs font-semibold text-gray-800 dark:text-dark-200">
        {label}
      </p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-500 dark:text-dark-400">
            {entry.name}:
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Custom Pie Chart Label
// ============================================

function renderCustomPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) {
  if (percent < 0.05) return null; // Don't show labels for very small slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ============================================
// Dashboard Page Component
// ============================================

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isDark = resolvedTheme === "dark";

  // Redux state
  const stats = useAppSelector(selectDashboardStats);
  const departmentBreakdown = useAppSelector(selectDepartmentBreakdown);
  const attendanceSummary = useAppSelector(selectAttendanceSummary);
  const topPerformers = useAppSelector(selectTopPerformers);
  const topAbsentees = useAppSelector(selectTopAbsentees);
  const monthlyAttendance = useAppSelector(selectMonthlyAttendance);
  const isLoading = useAppSelector(selectDashboardLoading);
  const error = useAppSelector(selectDashboardError);
  const userRole = useAppSelector((state) => state.auth.user?.role);

  const isAdminOrHR = userRole === "ADMIN" || userRole === "HR";

  // ---- Set Page Title ----
  useEffect(() => {
    dispatch(setPageTitle({ title: "Dashboard" }));
  }, [dispatch]);

  // ---- Fetch Dashboard Data ----
  useEffect(() => {
    // Try full dashboard first (Admin/HR), otherwise just stats
    if (isAdminOrHR) {
      dispatch(fetchFullDashboard({ force: true }));
    } else {
      dispatch(fetchDashboardStats());
    }
  }, [dispatch, isAdminOrHR]);

  // Fallback: fetch individual sections if full dashboard doesn't return them
  useEffect(() => {
    if (isAdminOrHR && !isLoading && stats && !departmentBreakdown.length) {
      dispatch(fetchDepartmentBreakdown());
    }
    if (isAdminOrHR && !isLoading && stats && !topPerformers.length) {
      dispatch(fetchTopPerformers(5));
    }
    if (isAdminOrHR && !isLoading && stats && !topAbsentees.length) {
      dispatch(fetchTopAbsentees());
    }
    if (isAdminOrHR && !isLoading && stats && !attendanceSummary) {
      dispatch(fetchAttendanceSummary());
    }
    if (isAdminOrHR && !isLoading && stats && !monthlyAttendance.length) {
      dispatch(fetchMonthlyAttendanceChart(6));
    }
  }, [
    dispatch,
    isAdminOrHR,
    isLoading,
    stats,
    departmentBreakdown.length,
    topPerformers.length,
    topAbsentees.length,
    attendanceSummary,
    monthlyAttendance.length,
  ]);

  // ---- Refresh Handler ----
  const handleRefresh = useCallback(() => {
    if (isAdminOrHR) {
      dispatch(fetchFullDashboard({ force: true }));
    } else {
      dispatch(fetchDashboardStats());
    }
  }, [dispatch, isAdminOrHR]);

  // ---- Prepare chart data ----

  // Department breakdown for donut chart
  const departmentChartData = useMemo(() => {
    if (!departmentBreakdown.length) return [];
    return departmentBreakdown.map((dept, index) => ({
      name: dept.departmentName || "Unknown",
      value: dept.employeeCount || dept.activeCount || 0,
      color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
    }));
  }, [departmentBreakdown]);

  // Attendance summary for donut chart
  const attendanceChartData = useMemo(() => {
    if (!attendanceSummary) return [];
    const data = [];
    if (attendanceSummary.present > 0)
      data.push({
        name: "On Time",
        value: attendanceSummary.present,
        color: ATTENDANCE_COLORS.present,
      });
    if (attendanceSummary.late > 0)
      data.push({
        name: "Late",
        value: attendanceSummary.late,
        color: ATTENDANCE_COLORS.late,
      });
    if (attendanceSummary.absent > 0)
      data.push({
        name: "Absent",
        value: attendanceSummary.absent,
        color: ATTENDANCE_COLORS.absent,
      });
    if (attendanceSummary.holiday > 0)
      data.push({
        name: "Holiday",
        value: attendanceSummary.holiday,
        color: ATTENDANCE_COLORS.holiday,
      });
    if (attendanceSummary.onLeave > 0)
      data.push({
        name: "On Leave",
        value: attendanceSummary.onLeave,
        color: ATTENDANCE_COLORS.onLeave,
      });
    if (attendanceSummary.unmarked > 0)
      data.push({
        name: "Unmarked",
        value: attendanceSummary.unmarked,
        color: ATTENDANCE_COLORS.unmarked,
      });
    return data;
  }, [attendanceSummary]);

  // Monthly attendance bar chart data
  const barChartData = useMemo(() => {
    if (!monthlyAttendance.length) {
      // Provide sample data for visual display
      return [
        { month: "Jul", present: 85, late: 8, absent: 7 },
        { month: "Aug", present: 88, late: 6, absent: 6 },
        { month: "Sep", present: 82, late: 10, absent: 8 },
        { month: "Oct", present: 90, late: 5, absent: 5 },
        { month: "Nov", present: 87, late: 7, absent: 6 },
        { month: "Dec", present: 84, late: 9, absent: 7 },
      ];
    }
    return monthlyAttendance.map((m) => ({
      month: m.month?.slice(0, 3) || `M${m.monthNumber}`,
      present: m.present,
      late: m.late,
      absent: m.absent,
    }));
  }, [monthlyAttendance]);

  // ---- Error State ----
  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-500/10">
          <HiOutlineExclamationTriangle className="h-8 w-8 text-danger-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Failed to Load Dashboard
        </h3>
        <p className="mt-1.5 max-w-sm text-center text-sm text-gray-500 dark:text-dark-400">
          {error}
        </p>
        <button
          onClick={handleRefresh}
          className="mt-6 flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-500"
        >
          <HiOutlineArrowPath className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ---- Section Header ---- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            Overview
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-400">
            Welcome back! Here's what's happening with your team today.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-2 self-start rounded-lg border px-3.5 py-2 text-sm font-medium transition-all sm:self-auto",
            isDark
              ? "border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-600 hover:text-white"
              : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900 shadow-sm",
            isLoading && "cursor-not-allowed opacity-50",
          )}
        >
          <HiOutlineArrowPath
            className={cn("h-4 w-4", isLoading && "animate-spin")}
          />
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ================================================================ */}
      {/* ROW 1: Overview Stat Cards                                       */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={stats?.totalEmployees ?? "—"}
          subtitle={`${stats?.activeEmployees ?? "—"} Active · ${stats?.inactiveEmployees ?? "—"} Inactive`}
          icon={HiOutlineUsers}
          iconBg="bg-primary-500/10"
          iconColor="text-primary-400"
          trend={
            stats?.newJoineesThisMonth
              ? {
                  value: stats.newJoineesThisMonth,
                  isPositive: true,
                  label: "new this month",
                }
              : undefined
          }
          loading={isLoading && !stats}
        />

        <StatCard
          title="Present Today"
          value={stats?.todayPresent ?? "—"}
          subtitle={`${stats?.todayLate ?? 0} late arrivals`}
          icon={HiOutlineClock}
          iconBg="bg-success-500/10"
          iconColor="text-success-400"
          trend={
            stats?.attendanceRate
              ? {
                  value: Math.round(stats.attendanceRate),
                  isPositive: stats.attendanceRate > 80,
                  label: "attendance rate",
                }
              : undefined
          }
          loading={isLoading && !stats}
        />

        <StatCard
          title="On Leave"
          value={stats?.onLeaveToday ?? "—"}
          subtitle={`${stats?.pendingLeaveRequests ?? 0} pending requests`}
          icon={HiOutlineCalendarDays}
          iconBg="bg-warning-500/10"
          iconColor="text-warning-400"
          loading={isLoading && !stats}
        />

        <StatCard
          title="Departments"
          value={stats?.totalDepartments ?? "—"}
          subtitle={`${stats?.totalEmployees ? Math.round(stats.totalEmployees / Math.max(stats.totalDepartments ?? 1, 1)) : "—"} avg per dept`}
          icon={HiOutlineBuildingOffice2}
          iconBg="bg-accent-500/10"
          iconColor="text-accent-400"
          loading={isLoading && !stats}
        />
      </div>

      {/* ================================================================ */}
      {/* ROW 2: Department Breakdown + Performance Report (Charts)         */}
      {/* ================================================================ */}
      {isAdminOrHR && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* ---- Department Breakdown (Donut Chart) ---- */}
          <CardWrapper
            title="By Department"
            subtitle="Employee distribution"
            className="lg:col-span-2"
            loading={isLoading && !departmentChartData.length}
          >
            {departmentChartData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={departmentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomPieLabel}
                      stroke="none"
                    >
                      {departmentChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {departmentChartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-2xs text-gray-500 dark:text-dark-400">
                        {item.name}{" "}
                        <span className="font-medium text-gray-700 dark:text-dark-300">
                          ({item.value})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-60 items-center justify-center">
                <p className="text-sm text-gray-400 dark:text-dark-500">
                  No department data
                </p>
              </div>
            )}
          </CardWrapper>

          {/* ---- Performance / Attendance Bar Chart ---- */}
          <CardWrapper
            title="Performance Report"
            subtitle="Monthly attendance trends"
            className="lg:col-span-3"
            action={
              <div className="flex items-center gap-1.5">
                <button className="rounded-md bg-gray-200 px-2.5 py-1 text-2xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600 dark:hover:text-white">
                  All Time
                </button>
                <button className="rounded-md px-2.5 py-1 text-2xs font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-dark-500 dark:hover:bg-dark-700 dark:hover:text-dark-300">
                  This Month
                </button>
                <button className="rounded-md px-2.5 py-1 text-2xs font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-dark-500 dark:hover:bg-dark-700 dark:hover:text-dark-300">
                  Year
                </button>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={barChartData}
                margin={{ top: 5, right: 5, left: -15, bottom: 5 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDark ? "#1e293b" : "#e2e8f0"}
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? "#64748b" : "#6b7280", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? "#64748b" : "#6b7280", fontSize: 11 }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    fill: isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(0,0,0,0.04)",
                  }}
                />
                <Bar
                  dataKey="present"
                  name="Present"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="late"
                  name="Late"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="absent"
                  name="Absent"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Chart legend */}
            <div className="mt-3 flex justify-center gap-6">
              {[
                { color: "#22c55e", label: "Present" },
                { color: "#f59e0b", label: "Late" },
                { color: "#ef4444", label: "Absent" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-2xs text-gray-500 dark:text-dark-400">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </CardWrapper>
        </div>
      )}

      {/* ================================================================ */}
      {/* ROW 3: Top Performers + Top Absentees                            */}
      {/* ================================================================ */}
      {isAdminOrHR && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ---- Top Performers ---- */}
          <CardWrapper
            title="Top Performers"
            subtitle="Highest rated employees"
            action={
              <button className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-dark-500 dark:hover:bg-dark-700 dark:hover:text-dark-300">
                <HiOutlineEllipsisHorizontal className="h-4 w-4" />
              </button>
            }
          >
            {isLoading && !topPerformers.length ? (
              <SkeletonTable rows={5} />
            ) : topPerformers.length > 0 ? (
              <div className="space-y-3">
                {topPerformers.map((performer, index) => {
                  const fullName = `${performer.firstName} ${performer.lastName}`;
                  return (
                    <div
                      key={performer.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-dark-700/30"
                    >
                      {/* Rank */}
                      <span
                        className={cn(
                          "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-2xs font-bold",
                          index === 0
                            ? "bg-warning-500/15 text-warning-500 dark:text-warning-400"
                            : index === 1
                              ? "bg-gray-200 text-gray-500 dark:bg-dark-500/15 dark:text-dark-300"
                              : index === 2
                                ? "bg-warning-700/15 text-warning-700 dark:text-warning-600"
                                : "bg-gray-100 text-gray-400 dark:bg-dark-700 dark:text-dark-500",
                        )}
                      >
                        {index + 1}
                      </span>

                      {/* Avatar */}
                      <Avatar
                        name={fullName}
                        avatar={performer.avatar}
                        size="sm"
                      />

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-dark-100">
                          {fullName}
                        </p>
                        <p className="truncate text-2xs text-gray-400 dark:text-dark-500">
                          {performer.designation}
                          {performer.department
                            ? ` · ${performer.department.name}`
                            : ""}
                        </p>
                      </div>

                      {/* Rating */}
                      <RatingStars rating={performer.rating} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-gray-400 dark:text-dark-500">
                  No performance data available
                </p>
              </div>
            )}
          </CardWrapper>

          {/* ---- Top Absentees ---- */}
          <CardWrapper
            title="Top Absentees"
            subtitle="Most absent this month"
            action={
              <button className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-dark-500 dark:hover:bg-dark-700 dark:hover:text-dark-300">
                <HiOutlineEllipsisHorizontal className="h-4 w-4" />
              </button>
            }
          >
            {isLoading && !topAbsentees.length ? (
              <SkeletonTable rows={5} />
            ) : topAbsentees.length > 0 ? (
              <div className="space-y-3">
                {topAbsentees.map((absentee, index) => {
                  const fullName = `${absentee.firstName} ${absentee.lastName}`;
                  const absentRate =
                    absentee.totalDays > 0
                      ? Math.round(
                          (absentee.absentDays / absentee.totalDays) * 100,
                        )
                      : 0;

                  return (
                    <div
                      key={absentee.id}
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-dark-700/30"
                    >
                      {/* Rank */}
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-danger-500/10 text-2xs font-bold text-danger-400">
                        {index + 1}
                      </span>

                      {/* Avatar */}
                      <Avatar
                        name={fullName}
                        avatar={absentee.avatar}
                        size="sm"
                      />

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-dark-100">
                          {fullName}
                        </p>
                        <p className="truncate text-2xs text-gray-400 dark:text-dark-500">
                          {absentee.designation}
                          {absentee.department
                            ? ` · ${absentee.department.name}`
                            : ""}
                        </p>
                      </div>

                      {/* Absent days */}
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-danger-500 dark:text-danger-400 tabular-nums">
                          {absentee.absentDays}d
                        </span>
                        <span className="text-2xs text-gray-400 dark:text-dark-500 tabular-nums">
                          {absentRate}% absent
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-gray-400 dark:text-dark-500">
                  No absentee data
                </p>
              </div>
            )}
          </CardWrapper>
        </div>
      )}

      {/* ================================================================ */}
      {/* ROW 4: Attendance Summary                                        */}
      {/* ================================================================ */}
      {isAdminOrHR && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* ---- Attendance Donut Chart ---- */}
          <CardWrapper
            title="Attendance Summary"
            subtitle={`Total: ${attendanceSummary?.total ?? "—"}`}
            className="lg:col-span-2"
          >
            {attendanceChartData.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <ResponsiveContainer width={240} height={240}>
                    <PieChart>
                      <Pie
                        data={attendanceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        labelLine={false}
                        label={renderCustomPieLabel}
                        stroke="none"
                      >
                        {attendanceChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center label */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                      {attendanceSummary?.attendanceRate != null
                        ? `${Math.round(attendanceSummary.attendanceRate)}%`
                        : "—"}
                    </span>
                    <span className="text-2xs text-gray-500 dark:text-dark-400">
                      Attendance Rate
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {attendanceChartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-2xs text-gray-500 dark:text-dark-400">
                        {item.name}
                      </span>
                      <span className="ml-auto text-2xs font-medium text-gray-700 dark:text-dark-300 tabular-nums">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : isLoading ? (
              <SkeletonChart className="border-0 bg-transparent p-0" />
            ) : (
              <div className="flex h-60 items-center justify-center">
                <p className="text-sm text-gray-400 dark:text-dark-500">
                  No attendance data available
                </p>
              </div>
            )}
          </CardWrapper>

          {/* ---- Attendance Stats Grid ---- */}
          <div className="lg:col-span-3">
            <div className="grid h-full grid-cols-2 gap-4 sm:grid-cols-3">
              {/* On Time */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-success-500/10">
                  <HiOutlineClock className="h-5 w-5 text-success-500 dark:text-success-400" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {attendanceSummary?.present ?? "—"}
                </span>
                <span className="mt-0.5 text-2xs text-gray-500 dark:text-dark-400">
                  On Time
                </span>
              </div>

              {/* Late */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-warning-500/10">
                  <HiOutlineClock className="h-5 w-5 text-warning-500 dark:text-warning-400" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {attendanceSummary?.late ?? "—"}
                </span>
                <span className="mt-0.5 text-2xs text-gray-500 dark:text-dark-400">
                  Late
                </span>
              </div>

              {/* Absent */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-danger-500/10">
                  <HiOutlineUserMinus className="h-5 w-5 text-danger-500 dark:text-danger-400" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {attendanceSummary?.absent ?? "—"}
                </span>
                <span className="mt-0.5 text-2xs text-gray-500 dark:text-dark-400">
                  Absent
                </span>
              </div>

              {/* Holiday */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/10">
                  <HiOutlineCalendarDays className="h-5 w-5 text-primary-500 dark:text-primary-400" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {attendanceSummary?.holiday ?? "—"}
                </span>
                <span className="mt-0.5 text-2xs text-gray-500 dark:text-dark-400">
                  Holiday
                </span>
              </div>

              {/* On Leave */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-info-500/10">
                  <HiOutlineCalendarDays className="h-5 w-5 text-info-500 dark:text-info-400" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {attendanceSummary?.onLeave ?? "—"}
                </span>
                <span className="mt-0.5 text-2xs text-gray-500 dark:text-dark-400">
                  On Leave
                </span>
              </div>

              {/* Unmarked */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200/60 dark:bg-dark-600/30">
                  <HiOutlineExclamationTriangle className="h-5 w-5 text-gray-400 dark:text-dark-400" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {attendanceSummary?.unmarked ?? "—"}
                </span>
                <span className="mt-0.5 text-2xs text-gray-500 dark:text-dark-400">
                  Unmarked
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Employee-only: Simple stats view                                  */}
      {/* ================================================================ */}
      {!isAdminOrHR && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10">
            <HiOutlineChartBarSquare className="h-8 w-8 text-primary-500 dark:text-primary-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Employee Dashboard
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-dark-400">
            View your attendance, leave balance, and personal metrics from the
            sidebar navigation.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="/attendance"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-500"
            >
              My Attendance
            </a>
            <a
              href="/leave"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-dark-600 dark:text-dark-300 dark:hover:border-dark-500 dark:hover:text-white"
            >
              Leave Balance
            </a>
            <a
              href="/profile"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-dark-600 dark:text-dark-300 dark:hover:border-dark-500 dark:hover:text-white"
            >
              My Profile
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
