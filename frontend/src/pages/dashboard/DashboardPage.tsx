// ============================================
// Dashboard Page — Enhanced Professional UI
// ============================================
// Main dashboard view for the HRMS application.
// Features:
//   - Interactive stat cards with click navigation
//   - Clickable top performers/absentees with detail modals
//   - Quick action buttons for common tasks
//   - Recent activity feed
//   - Animated transitions and hover effects
//   - Fully responsive layout

import { useEffect, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  HiOutlineXMark,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineMapPin,
  HiOutlineCalendar,
  HiOutlineChevronRight,
  HiOutlineDocumentText,
  HiOutlineClipboardDocumentList,
  HiOutlineUserGroup,
  HiOutlinePlusCircle,
  HiOutlineArrowRight,
  HiOutlineBriefcase,
  HiOutlineCheckCircle,
  HiOutlineInformationCircle,
  HiOutlineBellAlert,
  HiOutlineShieldCheck,
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
  AreaChart,
  Area,
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
// Skeleton Loader Components
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
  onClick?: () => void;
  delay?: number;
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
  onClick,
  delay = 0,
}: StatCardProps) {
  if (loading) {
    return <SkeletonCard />;
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card transition-all duration-300 hover:border-gray-300 hover:shadow-card-hover dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none dark:hover:border-dark-600/50 dark:hover:shadow-card-dark-hover",
        "animate-fade-in-up touch-feedback",
        "p-3.5 sm:p-4 md:p-5",
        onClick &&
          "cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-ring",
      )}
    >
      {/* Background glow effect on hover */}
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-10",
          iconBg,
        )}
      />

      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-transparent to-gray-50/50 dark:to-dark-700/10" />

      <div className="relative flex items-start justify-between gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-2xs sm:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-dark-400 truncate">
            {title}
          </p>
          <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-0.5 sm:mt-1 text-2xs sm:text-xs text-gray-500 dark:text-dark-400 truncate">
              {subtitle}
            </p>
          )}

          {/* Trend indicator */}
          {trend && (
            <div className="mt-1.5 sm:mt-2 flex items-center gap-1 sm:gap-1.5 flex-wrap">
              {trend.isPositive ? (
                <div className="flex items-center gap-0.5 text-success-600 dark:text-success-400">
                  <HiOutlineArrowTrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="text-2xs sm:text-xs font-medium">
                    +{trend.value}%
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 text-danger-600 dark:text-danger-400">
                  <HiOutlineArrowTrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="text-2xs sm:text-xs font-medium">
                    -{Math.abs(trend.value)}%
                  </span>
                </div>
              )}
              <span className="text-2xs text-gray-400 dark:text-dark-500 hidden xs:inline">
                {trend.label}
              </span>
            </div>
          )}
        </div>

        {/* Icon — responsive sizing */}
        <div
          className={cn(
            "flex flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl transition-transform duration-300 group-hover:scale-110",
            "h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11",
            iconBg,
          )}
        >
          <Icon
            className={cn(
              "h-4.5 w-4.5 sm:h-5 sm:w-5 md:h-5.5 md:w-5.5",
              iconColor,
            )}
          />
        </div>
      </div>

      {/* Click hint — desktop only */}
      {onClick && (
        <div className="absolute bottom-2 right-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 hidden sm:block">
          <HiOutlineChevronRight className="h-4 w-4 text-gray-400 dark:text-dark-500" />
        </div>
      )}
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
  delay?: number;
}

function CardWrapper({
  title,
  subtitle,
  action,
  children,
  className,
  loading,
  delay = 0,
}: CardWrapperProps) {
  const animationDelay = `${delay}ms`;

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none animate-fade-in-up overflow-hidden min-w-0",
        className,
      )}
      style={{ animationDelay }}
    >
      {/* Header — responsive padding */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-dark-700/50 px-3.5 py-3 sm:px-4 sm:py-3.5 md:px-5 md:py-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-2xs sm:text-xs text-gray-500 dark:text-dark-400 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="flex-shrink-0 ml-2">{action}</div>}
      </div>

      {/* Body — responsive padding, prevent overflow */}
      <div className="p-3.5 sm:p-4 md:p-5 overflow-x-hidden">{children}</div>
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
  size?: "sm" | "md" | "lg";
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

  const sizeClass =
    size === "lg"
      ? "h-16 w-16 text-xl"
      : size === "md"
        ? "h-10 w-10 text-sm"
        : "h-8 w-8 text-xs";

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={cn(
          sizeClass,
          "rounded-full object-cover ring-2 ring-white dark:ring-dark-800",
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        colorClass,
        "flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-dark-800",
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
            "h-3.5 w-3.5 transition-colors",
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
  if (percent < 0.05) return null;
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
// Employee Detail Modal
// ============================================

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string;
    avatar?: string | null;
    department?: { id: string; name: string } | null;
    rating?: number;
    absentDays?: number;
    totalDays?: number;
    reviewPeriod?: string;
    employeeId?: string;
  } | null;
  type: "performer" | "absentee";
  isDark: boolean;
}

function EmployeeDetailModal({
  isOpen,
  onClose,
  employee,
  type,
  isDark,
}: EmployeeModalProps) {
  const navigate = useNavigate();

  if (!isOpen || !employee) return null;

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const absentRate =
    employee.totalDays && employee.totalDays > 0
      ? Math.round(((employee.absentDays || 0) / employee.totalDays) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-overlay-show"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-2xl border shadow-modal animate-scale-in",
          isDark
            ? "border-dark-700 bg-dark-800 shadow-modal-dark"
            : "border-gray-200 bg-white",
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            "absolute right-3 top-3 z-10 rounded-lg p-1.5 transition-colors",
            isDark
              ? "text-dark-400 hover:bg-dark-700 hover:text-white"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
          )}
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>

        {/* Header with gradient */}
        <div
          className={cn(
            "relative px-6 pb-6 pt-8",
            type === "performer"
              ? "bg-gradient-to-br from-primary-500/10 via-accent-500/5 to-transparent dark:from-primary-500/20 dark:via-accent-500/10"
              : "bg-gradient-to-br from-danger-500/10 via-warning-500/5 to-transparent dark:from-danger-500/20 dark:via-warning-500/10",
          )}
        >
          <div className="flex items-start gap-4">
            <Avatar name={fullName} avatar={employee.avatar} size="lg" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {fullName}
              </h3>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-400">
                {employee.designation}
              </p>
              {employee.department && (
                <span
                  className={cn(
                    "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    isDark
                      ? "bg-dark-700 text-dark-300"
                      : "bg-gray-100 text-gray-600",
                  )}
                >
                  <HiOutlineBuildingOffice2 className="h-3 w-3" />
                  {employee.department.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-5">
          {type === "performer" && employee.rating != null && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-dark-400">
                  Performance Rating
                </span>
                <RatingStars rating={employee.rating} />
              </div>

              {/* Rating bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500 dark:text-dark-400">
                    Score
                  </span>
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400 tabular-nums">
                    {employee.rating.toFixed(1)}/5.0
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-1000"
                    style={{ width: `${(employee.rating / 5) * 100}%` }}
                  />
                </div>
              </div>

              {employee.reviewPeriod && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-dark-400">
                    Review Period
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-200">
                    {employee.reviewPeriod}
                  </span>
                </div>
              )}

              {/* Performance badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {employee.rating >= 4.5 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-500/10 px-2.5 py-1 text-xs font-medium text-warning-600 dark:text-warning-400">
                    <HiOutlineStar className="h-3 w-3 fill-current" />
                    Star Performer
                  </span>
                )}
                {employee.rating >= 4.0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-500/10 px-2.5 py-1 text-xs font-medium text-success-600 dark:text-success-400">
                    <HiOutlineCheckCircle className="h-3 w-3" />
                    Exceeds Expectations
                  </span>
                )}
                {employee.rating >= 3.0 && employee.rating < 4.0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-info-500/10 px-2.5 py-1 text-xs font-medium text-info-600 dark:text-info-400">
                    <HiOutlineCheckCircle className="h-3 w-3" />
                    Meets Expectations
                  </span>
                )}
              </div>
            </div>
          )}

          {type === "absentee" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={cn(
                    "rounded-xl p-3 text-center",
                    isDark ? "bg-dark-700/50" : "bg-danger-50",
                  )}
                >
                  <span className="text-2xl font-bold text-danger-600 dark:text-danger-400 tabular-nums">
                    {employee.absentDays || 0}
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                    Days Absent
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-xl p-3 text-center",
                    isDark ? "bg-dark-700/50" : "bg-gray-50",
                  )}
                >
                  <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {employee.totalDays || 0}
                  </span>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                    Working Days
                  </p>
                </div>
              </div>

              {/* Absent rate bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500 dark:text-dark-400">
                    Absence Rate
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      absentRate > 20
                        ? "text-danger-600 dark:text-danger-400"
                        : absentRate > 10
                          ? "text-warning-600 dark:text-warning-400"
                          : "text-success-600 dark:text-success-400",
                    )}
                  >
                    {absentRate}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-700">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      absentRate > 20
                        ? "bg-gradient-to-r from-danger-400 to-danger-600"
                        : absentRate > 10
                          ? "bg-gradient-to-r from-warning-400 to-warning-600"
                          : "bg-gradient-to-r from-success-400 to-success-600",
                    )}
                    style={{ width: `${Math.min(absentRate, 100)}%` }}
                  />
                </div>
              </div>

              {/* Status indicator */}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg p-3",
                  absentRate > 20
                    ? isDark
                      ? "bg-danger-500/10"
                      : "bg-danger-50"
                    : absentRate > 10
                      ? isDark
                        ? "bg-warning-500/10"
                        : "bg-warning-50"
                      : isDark
                        ? "bg-success-500/10"
                        : "bg-success-50",
                )}
              >
                <HiOutlineExclamationTriangle
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    absentRate > 20
                      ? "text-danger-500"
                      : absentRate > 10
                        ? "text-warning-500"
                        : "text-success-500",
                  )}
                />
                <span className="text-xs text-gray-600 dark:text-dark-300">
                  {absentRate > 20
                    ? "High absence rate — consider scheduling a check-in meeting"
                    : absentRate > 10
                      ? "Moderate absence rate — monitor for patterns"
                      : "Absence rate within acceptable range"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className={cn(
            "flex items-center justify-between border-t px-6 py-4",
            isDark
              ? "border-dark-700 bg-dark-800/50"
              : "border-gray-100 bg-gray-50/50",
          )}
        >
          <button
            onClick={onClose}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isDark
                ? "text-dark-300 hover:bg-dark-700 hover:text-white"
                : "text-gray-600 hover:bg-gray-200 hover:text-gray-900",
            )}
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              navigate(`/employees/${employee.id}`);
            }}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/25"
          >
            View Full Profile
            <HiOutlineArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Quick Action Button
// ============================================

function QuickActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  color = "bg-primary-600",
  isDark = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
  color?: string;
  isDark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2.5 sm:gap-3 rounded-xl border p-2.5 sm:p-3 md:p-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] touch-feedback focus-ring",
        isDark
          ? "border-dark-700/50 bg-dark-800/50 hover:border-dark-600"
          : "border-gray-200 bg-white hover:border-gray-300",
      )}
      style={{ minHeight: "44px" }}
    >
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl transition-transform duration-300 group-hover:scale-110",
          "h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10",
          color,
        )}
      >
        <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
          {label}
        </p>
        <p className="text-2xs text-gray-500 dark:text-dark-400 truncate hidden xs:block">
          {description}
        </p>
      </div>
      <HiOutlineChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-dark-500 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100 hidden sm:block" />
    </button>
  );
}

// ============================================
// Recent Activity Item
// ============================================

function ActivityItem({
  action,
  details,
  time,
  type,
  isDark,
}: {
  action: string;
  details: string;
  time: string;
  type: "success" | "info" | "warning" | "danger";
  isDark: boolean;
}) {
  const iconMap = {
    success: HiOutlineCheckCircle,
    info: HiOutlineInformationCircle,
    warning: HiOutlineBellAlert,
    danger: HiOutlineExclamationTriangle,
  };
  const colorMap = {
    success: "text-success-500 bg-success-500/10",
    info: "text-info-500 bg-info-500/10",
    warning: "text-warning-500 bg-warning-500/10",
    danger: "text-danger-500 bg-danger-500/10",
  };

  const Icon = iconMap[type];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg px-3 py-2.5 transition-colors",
        isDark ? "hover:bg-dark-700/30" : "hover:bg-gray-50",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
          colorMap[type],
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-dark-100">
          {action}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-400 line-clamp-2">
          {details}
        </p>
        <p className="mt-1 text-2xs text-gray-400 dark:text-dark-500">{time}</p>
      </div>
    </div>
  );
}

// ============================================
// Dashboard Page Component
// ============================================

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
  const userName = useAppSelector((state) =>
    state.auth.user?.employee
      ? `${state.auth.user.employee.firstName} ${state.auth.user.employee.lastName}`.trim()
      : state.auth.user?.email === "admin@hrms.com"
        ? "Abhishek Mishra"
        : state.auth.user?.email?.split("@")[0] || "User",
  );

  const isAdminOrHR = userRole === "ADMIN" || userRole === "HR";

  // Modal state for employee details
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [modalType, setModalType] = useState<"performer" | "absentee">(
    "performer",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chartTimeRange, setChartTimeRange] = useState<string>("6months");

  // ---- Set Page Title ----
  useEffect(() => {
    dispatch(setPageTitle({ title: "Dashboard" }));
  }, [dispatch]);

  // ---- Fetch Dashboard Data ----
  useEffect(() => {
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

  // ---- Handlers ----
  const handleRefresh = useCallback(() => {
    if (isAdminOrHR) {
      dispatch(fetchFullDashboard({ force: true }));
    } else {
      dispatch(fetchDashboardStats());
    }
  }, [dispatch, isAdminOrHR]);

  const handleOpenEmployeeModal = useCallback(
    (employee: any, type: "performer" | "absentee") => {
      setSelectedEmployee(employee);
      setModalType(type);
      setIsModalOpen(true);
    },
    [],
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedEmployee(null), 300);
  }, []);

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

  // Get current greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // ---- Error State ----
  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
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
          className="mt-6 flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/25"
        >
          <HiOutlineArrowPath className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 md:space-y-8 min-w-0">
      {/* ---- Welcome Header ---- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl md:text-2xl truncate">
            {greeting}, {userName} 👋
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500 dark:text-dark-400">
            {isAdminOrHR
              ? "Here's what's happening with your team today."
              : "Here's your personal dashboard overview."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          {/* Date display — hidden on mobile, compact on tablet */}
          <div
            className={cn(
              "hidden items-center gap-2 rounded-lg border px-2.5 py-2 text-xs md:text-sm md:flex",
              isDark
                ? "border-dark-700 bg-dark-800/50 text-dark-300"
                : "border-gray-200 bg-white text-gray-600",
            )}
          >
            <HiOutlineCalendar className="h-4 w-4 text-gray-400 dark:text-dark-500 flex-shrink-0" />
            <span className="whitespace-nowrap">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 rounded-lg border px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium transition-all",
              isDark
                ? "border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-600 hover:text-white active:bg-dark-700"
                : "border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900 active:bg-gray-100 shadow-sm",
              isLoading && "cursor-not-allowed opacity-50",
            )}
            style={{ minHeight: "40px" }}
          >
            <HiOutlineArrowPath
              className={cn("h-4 w-4", isLoading && "animate-spin")}
            />
            <span className="hidden xs:inline">
              {isLoading ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* ROW 1: Overview Stat Cards — responsive grid                     */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-4 min-w-0">
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
          onClick={() => navigate("/employees")}
          delay={0}
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
          onClick={() => navigate("/attendance")}
          delay={50}
        />

        <StatCard
          title="On Leave"
          value={stats?.onLeaveToday ?? "—"}
          subtitle={`${stats?.pendingLeaveRequests ?? 0} pending requests`}
          icon={HiOutlineCalendarDays}
          iconBg="bg-warning-500/10"
          iconColor="text-warning-400"
          loading={isLoading && !stats}
          onClick={() => navigate("/leave")}
          delay={100}
        />

        <StatCard
          title="Departments"
          value={stats?.totalDepartments ?? "—"}
          subtitle={`${stats?.totalEmployees ? Math.round(stats.totalEmployees / Math.max(stats.totalDepartments ?? 1, 1)) : "—"} avg per dept`}
          icon={HiOutlineBuildingOffice2}
          iconBg="bg-accent-500/10"
          iconColor="text-accent-400"
          loading={isLoading && !stats}
          onClick={isAdminOrHR ? () => navigate("/departments") : undefined}
          delay={150}
        />
      </div>

      {/* ================================================================ */}
      {/* ROW 1.5: Quick Actions (Admin/HR)                                */}
      {/* ================================================================ */}
      {isAdminOrHR && (
        <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <h3 className="mb-2 sm:mb-3 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 min-w-0">
            <QuickActionButton
              icon={HiOutlineUserPlus}
              label="Add Employee"
              description="Register new team member"
              onClick={() => navigate("/employees")}
              color="bg-primary-600"
              isDark={isDark}
            />
            <QuickActionButton
              icon={HiOutlineClipboardDocumentList}
              label="Leave Requests"
              description={`${stats?.pendingLeaveRequests ?? 0} pending approvals`}
              onClick={() => navigate("/leave")}
              color="bg-warning-600"
              isDark={isDark}
            />
            <QuickActionButton
              icon={HiOutlineCalendarDays}
              label="Mark Attendance"
              description="Manage today's attendance"
              onClick={() => navigate("/attendance")}
              color="bg-success-600"
              isDark={isDark}
            />
            <QuickActionButton
              icon={HiOutlineBuildingOffice2}
              label="Departments"
              description="Manage departments"
              onClick={() => navigate("/departments")}
              color="bg-accent-600"
              isDark={isDark}
            />
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* ROW 2: Department Breakdown + Performance Report (Charts)         */}
      {/* ================================================================ */}
      {isAdminOrHR && (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-5 min-w-0">
          {/* ---- Department Breakdown (Donut Chart) ---- */}
          <CardWrapper
            title="By Department"
            subtitle="Employee distribution"
            className="lg:col-span-2"
            loading={isLoading && !departmentChartData.length}
            delay={250}
            action={
              <button
                onClick={() => navigate("/departments")}
                className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-dark-500 dark:hover:bg-dark-700 dark:hover:text-dark-300 hidden sm:block"
                title="View all departments"
              >
                <HiOutlineArrowRight className="h-4 w-4" />
              </button>
            }
          >
            {departmentChartData.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[260px] mx-auto">
                  <ResponsiveContainer
                    width="100%"
                    height={200}
                    className="sm:!h-[240px]"
                  >
                    <PieChart>
                      <Pie
                        data={departmentChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="30%"
                        outerRadius="50%"
                        paddingAngle={3}
                        dataKey="value"
                        labelLine={false}
                        label={renderCustomPieLabel}
                        stroke="none"
                        animationBegin={300}
                        animationDuration={1000}
                      >
                        {departmentChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Interactive Legend — scrollable on mobile */}
                <div className="mt-3 flex flex-wrap justify-center gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 max-w-full overflow-x-auto no-scrollbar px-1">
                  {departmentChartData.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => navigate("/departments")}
                      className="flex items-center gap-1 sm:gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700/50 flex-shrink-0"
                      style={{ minHeight: "32px" }}
                    >
                      <span
                        className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-2xs text-gray-500 dark:text-dark-400 whitespace-nowrap">
                        {item.name}{" "}
                        <span className="font-medium text-gray-700 dark:text-dark-300">
                          ({item.value})
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-40 sm:h-60 flex-col items-center justify-center gap-2">
                <HiOutlineBuildingOffice2 className="h-6 w-6 sm:h-8 sm:w-8 text-gray-300 dark:text-dark-600" />
                <p className="text-xs sm:text-sm text-gray-400 dark:text-dark-500">
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
            delay={300}
            action={
              <div className="flex items-center gap-1">
                {[
                  { key: "all", label: "All" },
                  { key: "6months", label: "6M" },
                  { key: "year", label: "1Y" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setChartTimeRange(item.key)}
                    className={cn(
                      "rounded-md px-2 sm:px-2.5 py-1 text-2xs font-medium transition-colors",
                      chartTimeRange === item.key
                        ? "bg-gray-200 text-gray-700 dark:bg-dark-700 dark:text-dark-300"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-dark-500 dark:hover:bg-dark-700 dark:hover:text-dark-300",
                    )}
                    style={{ minHeight: "28px" }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          >
            <ResponsiveContainer
              width="100%"
              height={220}
              className="sm:!h-[260px]"
            >
              <BarChart
                data={barChartData}
                margin={{ top: 5, right: 8, left: -15, bottom: 5 }}
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
                  tick={{ fill: isDark ? "#64748b" : "#6b7280", fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? "#64748b" : "#6b7280", fontSize: 10 }}
                  width={35}
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
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                  animationDuration={1200}
                />
                <Bar
                  dataKey="late"
                  name="Late"
                  fill="#f59e0b"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                  animationDuration={1200}
                  animationBegin={200}
                />
                <Bar
                  dataKey="absent"
                  name="Absent"
                  fill="#ef4444"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                  animationDuration={1200}
                  animationBegin={400}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Chart legend — responsive spacing */}
            <div className="mt-3 sm:mt-4 flex justify-center gap-4 sm:gap-6">
              {[
                { color: "#22c55e", label: "Present" },
                { color: "#f59e0b", label: "Late" },
                { color: "#ef4444", label: "Absent" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-1 sm:gap-1.5"
                >
                  <span
                    className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full flex-shrink-0"
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
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 min-w-0">
          {/* ---- Top Performers ---- */}
          <CardWrapper
            title="Top Performers"
            subtitle="Highest rated employees"
            delay={350}
            action={
              <button
                onClick={() => navigate("/employees")}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-medium text-primary-500 transition-colors hover:bg-primary-500/10 dark:text-primary-400"
              >
                View All
                <HiOutlineArrowRight className="h-3 w-3" />
              </button>
            }
          >
            {isLoading && !topPerformers.length ? (
              <SkeletonTable rows={5} />
            ) : topPerformers.length > 0 ? (
              <div className="space-y-1">
                {topPerformers.map((performer, index) => {
                  const fullName =
                    performer.firstName && performer.lastName
                      ? `${performer.firstName} ${performer.lastName}`
                      : (performer as any).employeeName || "Unknown Employee";
                  return (
                    <button
                      key={performer.id}
                      onClick={() =>
                        handleOpenEmployeeModal(performer, "performer")
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-all duration-200",
                        "hover:bg-gray-50 dark:hover:bg-dark-700/30",
                        "hover:shadow-sm",
                        "group/item",
                      )}
                    >
                      {/* Rank */}
                      <span
                        className={cn(
                          "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-transform duration-300 group-hover/item:scale-110",
                          index === 0
                            ? "bg-gradient-to-br from-warning-400 to-warning-600 text-white shadow-sm shadow-warning-500/30"
                            : index === 1
                              ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white dark:from-dark-400 dark:to-dark-500"
                              : index === 2
                                ? "bg-gradient-to-br from-warning-600 to-warning-800 text-white"
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
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-dark-100 group-hover/item:text-primary-600 dark:group-hover/item:text-primary-400 transition-colors">
                          {fullName}
                        </p>
                        <p className="truncate text-2xs text-gray-400 dark:text-dark-500">
                          {performer.designation}
                          {performer.department
                            ? ` · ${typeof performer.department === "string" ? performer.department : performer.department.name}`
                            : ""}
                        </p>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-1.5">
                        <RatingStars rating={performer.rating} />
                        <HiOutlineChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-dark-600 opacity-0 transition-all duration-200 group-hover/item:opacity-100 group-hover/item:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <HiOutlineStar className="h-8 w-8 text-gray-300 dark:text-dark-600" />
                <p className="text-sm text-gray-400 dark:text-dark-500">
                  No performance data available
                </p>
                <p className="text-2xs text-gray-400 dark:text-dark-500">
                  Performance reviews will appear here
                </p>
              </div>
            )}
          </CardWrapper>

          {/* ---- Top Absentees ---- */}
          <CardWrapper
            title="Top Absentees"
            subtitle="Most absent this month"
            delay={400}
            action={
              <button
                onClick={() => navigate("/attendance")}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-2xs font-medium text-primary-500 transition-colors hover:bg-primary-500/10 dark:text-primary-400"
              >
                View All
                <HiOutlineArrowRight className="h-3 w-3" />
              </button>
            }
          >
            {isLoading && !topAbsentees.length ? (
              <SkeletonTable rows={5} />
            ) : topAbsentees.length > 0 ? (
              <div className="space-y-1">
                {topAbsentees.map((absentee, index) => {
                  const fullName =
                    absentee.firstName && absentee.lastName
                      ? `${absentee.firstName} ${absentee.lastName}`
                      : (absentee as any).employeeName || "Unknown Employee";
                  const absentRate =
                    absentee.totalDays > 0
                      ? Math.round(
                          (absentee.absentDays / absentee.totalDays) * 100,
                        )
                      : 0;

                  return (
                    <button
                      key={absentee.id}
                      onClick={() =>
                        handleOpenEmployeeModal(absentee, "absentee")
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-all duration-200",
                        "hover:bg-gray-50 dark:hover:bg-dark-700/30",
                        "hover:shadow-sm",
                        "group/item",
                      )}
                    >
                      {/* Rank */}
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-danger-500/10 text-xs font-bold text-danger-500 dark:text-danger-400 transition-transform duration-300 group-hover/item:scale-110">
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
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-dark-100 group-hover/item:text-primary-600 dark:group-hover/item:text-primary-400 transition-colors">
                          {fullName}
                        </p>
                        <p className="truncate text-2xs text-gray-400 dark:text-dark-500">
                          {absentee.designation}
                          {absentee.department
                            ? ` · ${typeof absentee.department === "string" ? absentee.department : absentee.department.name}`
                            : ""}
                        </p>
                      </div>

                      {/* Absent days */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-semibold text-danger-500 dark:text-danger-400 tabular-nums">
                            {absentee.absentDays}d
                          </span>
                          <span className="text-2xs text-gray-400 dark:text-dark-500 tabular-nums">
                            {absentRate}% absent
                          </span>
                        </div>
                        <HiOutlineChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-dark-600 opacity-0 transition-all duration-200 group-hover/item:opacity-100 group-hover/item:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <HiOutlineCalendarDays className="h-8 w-8 text-gray-300 dark:text-dark-600" />
                <p className="text-sm text-gray-400 dark:text-dark-500">
                  No absentee data
                </p>
                <p className="text-2xs text-gray-400 dark:text-dark-500">
                  Absentee records will appear here
                </p>
              </div>
            )}
          </CardWrapper>
        </div>
      )}

      {/* ================================================================ */}
      {/* ROW 4: Attendance Summary + Recent Activity                       */}
      {/* ================================================================ */}
      {isAdminOrHR && (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-5 min-w-0">
          {/* ---- Attendance Donut Chart ---- */}
          <CardWrapper
            title="Attendance Summary"
            subtitle={`Total: ${attendanceSummary?.total ?? "—"}`}
            className="lg:col-span-2"
            delay={450}
          >
            {attendanceChartData.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="relative w-full max-w-[240px] mx-auto">
                  <ResponsiveContainer width="100%" aspect={1}>
                    <PieChart>
                      <Pie
                        data={attendanceChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius="25%"
                        outerRadius="40%"
                        paddingAngle={3}
                        dataKey="value"
                        labelLine={false}
                        label={renderCustomPieLabel}
                        stroke="none"
                        animationBegin={500}
                        animationDuration={1000}
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
                <div className="mt-3 grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2">
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
              <div className="flex h-60 flex-col items-center justify-center gap-2">
                <HiOutlineChartBarSquare className="h-8 w-8 text-gray-300 dark:text-dark-600" />
                <p className="text-sm text-gray-400 dark:text-dark-500">
                  No attendance data available
                </p>
              </div>
            )}
          </CardWrapper>

          {/* ---- Attendance Stats Grid + Recent Activity ---- */}
          <div className="space-y-4 sm:space-y-5 lg:col-span-3">
            {/* Mini stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 min-w-0">
              {[
                {
                  label: "On Time",
                  value: attendanceSummary?.present ?? "—",
                  icon: HiOutlineClock,
                  color: "success",
                },
                {
                  label: "Late",
                  value: attendanceSummary?.late ?? "—",
                  icon: HiOutlineClock,
                  color: "warning",
                },
                {
                  label: "Absent",
                  value: attendanceSummary?.absent ?? "—",
                  icon: HiOutlineUserMinus,
                  color: "danger",
                },
                {
                  label: "Holiday",
                  value: attendanceSummary?.holiday ?? "—",
                  icon: HiOutlineCalendarDays,
                  color: "primary",
                },
                {
                  label: "On Leave",
                  value: attendanceSummary?.onLeave ?? "—",
                  icon: HiOutlineCalendarDays,
                  color: "info",
                },
                {
                  label: "Unmarked",
                  value: attendanceSummary?.unmarked ?? "—",
                  icon: HiOutlineExclamationTriangle,
                  color: "neutral",
                },
              ].map((stat) => {
                const colorConfig: Record<
                  string,
                  { bg: string; iconColor: string; ring: string }
                > = {
                  success: {
                    bg: "bg-success-500/10",
                    iconColor: "text-success-500 dark:text-success-400",
                    ring: "ring-success-500/20",
                  },
                  warning: {
                    bg: "bg-warning-500/10",
                    iconColor: "text-warning-500 dark:text-warning-400",
                    ring: "ring-warning-500/20",
                  },
                  danger: {
                    bg: "bg-danger-500/10",
                    iconColor: "text-danger-500 dark:text-danger-400",
                    ring: "ring-danger-500/20",
                  },
                  primary: {
                    bg: "bg-primary-500/10",
                    iconColor: "text-primary-500 dark:text-primary-400",
                    ring: "ring-primary-500/20",
                  },
                  info: {
                    bg: "bg-info-500/10",
                    iconColor: "text-info-500 dark:text-info-400",
                    ring: "ring-info-500/20",
                  },
                  neutral: {
                    bg: "bg-gray-200/60 dark:bg-dark-600/30",
                    iconColor: "text-gray-400 dark:text-dark-400",
                    ring: "ring-gray-200",
                  },
                };

                const colors = colorConfig[stat.color] || colorConfig.neutral;
                const Icon = stat.icon;

                return (
                  <div
                    key={stat.label}
                    className={cn(
                      "group flex flex-col items-center justify-center rounded-xl border p-3 sm:p-4 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer min-w-0",
                      isDark
                        ? "border-dark-700/50 bg-dark-800/50 hover:border-dark-600"
                        : "border-gray-200 bg-white hover:border-gray-300",
                    )}
                    onClick={() => navigate("/attendance")}
                  >
                    <div
                      className={cn(
                        "mb-1.5 sm:mb-2 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110",
                        colors.bg,
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 sm:h-5 sm:w-5",
                          colors.iconColor,
                        )}
                      />
                    </div>
                    <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                      {stat.value}
                    </span>
                    <span className="mt-0.5 text-2xs text-gray-500 dark:text-dark-400 text-center truncate w-full">
                      {stat.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Recent Activity */}
            <CardWrapper
              title="Recent Activity"
              subtitle="Latest system updates"
              delay={500}
              action={
                <span className="text-2xs text-gray-400 dark:text-dark-500">
                  Auto-refreshed
                </span>
              }
            >
              <div className="space-y-1 -mx-2">
                <ActivityItem
                  action="Leave request approved"
                  details="Annual leave for Dec 25-26 was approved by HR Manager"
                  time="2 hours ago"
                  type="success"
                  isDark={isDark}
                />
                <ActivityItem
                  action="New employee onboarded"
                  details="A new team member has joined the Engineering department"
                  time="5 hours ago"
                  type="info"
                  isDark={isDark}
                />
                <ActivityItem
                  action="Attendance alert"
                  details="3 employees haven't clocked in today — follow up recommended"
                  time="Today, 10:30 AM"
                  type="warning"
                  isDark={isDark}
                />
                <ActivityItem
                  action="Performance review due"
                  details="Q4 reviews for 12 employees are due by end of month"
                  time="Yesterday"
                  type="danger"
                  isDark={isDark}
                />
              </div>
            </CardWrapper>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Employee-only: Enhanced Simple Stats View                         */}
      {/* ================================================================ */}
      {!isAdminOrHR && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Quick Links */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <button
              onClick={() => navigate("/attendance")}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                isDark
                  ? "border-dark-700/50 bg-dark-800/50 hover:border-primary-500/30"
                  : "border-gray-200 bg-white hover:border-primary-300",
              )}
            >
              <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary-500/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 transition-transform duration-300 group-hover:scale-110">
                  <HiOutlineClock className="h-6 w-6 text-primary-500 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  My Attendance
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
                  Clock in/out and view your attendance history
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400">
                  Go to Attendance
                  <HiOutlineArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate("/leave")}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                isDark
                  ? "border-dark-700/50 bg-dark-800/50 hover:border-warning-500/30"
                  : "border-gray-200 bg-white hover:border-warning-300",
              )}
            >
              <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-warning-500/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-warning-500/10 transition-transform duration-300 group-hover:scale-110">
                  <HiOutlineCalendarDays className="h-6 w-6 text-warning-500 dark:text-warning-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Leave Balance
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
                  View balance, apply for leave, and track requests
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-warning-600 dark:text-warning-400">
                  Manage Leave
                  <HiOutlineArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate("/profile")}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                isDark
                  ? "border-dark-700/50 bg-dark-800/50 hover:border-accent-500/30"
                  : "border-gray-200 bg-white hover:border-accent-300",
              )}
            >
              <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-accent-500/5 transition-transform duration-500 group-hover:scale-150" />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-500/10 transition-transform duration-300 group-hover:scale-110">
                  <HiOutlineShieldCheck className="h-6 w-6 text-accent-500 dark:text-accent-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  My Profile
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
                  Update your personal information and settings
                </p>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-accent-600 dark:text-accent-400">
                  View Profile
                  <HiOutlineArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </button>
          </div>

          {/* Help banner */}
          <div
            className={cn(
              "flex items-center gap-4 rounded-xl border p-5",
              isDark
                ? "border-dark-700/50 bg-gradient-to-r from-primary-900/20 to-dark-800/50"
                : "border-primary-100 bg-gradient-to-r from-primary-50 to-white",
            )}
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500/10">
              <HiOutlineInformationCircle className="h-6 w-6 text-primary-500 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Need Help?
              </h4>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                Contact your HR department for any questions about your
                employment, benefits, or company policies.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Employee Detail Modal                                            */}
      {/* ================================================================ */}
      <EmployeeDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        employee={selectedEmployee}
        type={modalType}
        isDark={isDark}
      />
    </div>
  );
}

// Default export for lazy loading
export default DashboardPage;
