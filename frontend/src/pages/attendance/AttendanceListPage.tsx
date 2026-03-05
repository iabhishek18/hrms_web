// ============================================
// Attendance List Page — Complete Overhaul
// ============================================
// Provides attendance management with:
//   - Clock in/out buttons with confirmation modals
//   - Today's attendance status card with live clock
//   - Monthly attendance summary stats
//   - Attendance records table with search, filtering, sorting
//   - Calendar view for current user's monthly attendance
//   - Manual attendance entry modal (Admin/HR)
//   - Export attendance records
//   - Pagination
//   - Full light/dark theme support

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import { setPageTitle, selectResolvedTheme } from "@/store/slices/uiSlice";
import { attendanceApi } from "@/api/attendance";
import type {
  AttendanceRecord,
  TodayStatus,
  PaginationMeta,
  AttendanceSummary,
  MonthlyCalendarDay,
} from "@/api/attendance";
import { cn } from "@/utils/cn";
import toast from "react-hot-toast";
import {
  HiOutlineClock,
  HiOutlineArrowRightOnRectangle,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineCalendarDays,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronDown,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineTableCells,
  HiOutlineInformationCircle,
  HiOutlineArrowDownTray,
  HiOutlinePlusCircle,
  HiOutlineCalendar,
  HiOutlineListBullet,
  HiOutlineClipboardDocumentCheck,
  HiOutlineShieldCheck,
} from "react-icons/hi2";

// ============================================
// Types
// ============================================

type ViewMode = "table" | "calendar";

interface ConfirmModalState {
  isOpen: boolean;
  type: "clockIn" | "clockOut" | null;
}

interface ManualAttendanceForm {
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string;
  status: string;
  notes: string;
}

// ============================================
// Status Badge Component
// ============================================

const ATTENDANCE_STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  PRESENT: {
    bg: "bg-success-500/10",
    text: "text-success-600 dark:text-success-400",
    dot: "bg-success-500 dark:bg-success-400",
    label: "Present",
  },
  ABSENT: {
    bg: "bg-danger-500/10",
    text: "text-danger-600 dark:text-danger-400",
    dot: "bg-danger-500 dark:bg-danger-400",
    label: "Absent",
  },
  LATE: {
    bg: "bg-warning-500/10",
    text: "text-warning-600 dark:text-warning-400",
    dot: "bg-warning-500 dark:bg-warning-400",
    label: "Late",
  },
  HALF_DAY: {
    bg: "bg-info-500/10",
    text: "text-info-600 dark:text-info-400",
    dot: "bg-info-500 dark:bg-info-400",
    label: "Half Day",
  },
  ON_LEAVE: {
    bg: "bg-accent-500/10",
    text: "text-accent-600 dark:text-accent-400",
    dot: "bg-accent-500 dark:bg-accent-400",
    label: "On Leave",
  },
  HOLIDAY: {
    bg: "bg-primary-500/10",
    text: "text-primary-600 dark:text-primary-400",
    dot: "bg-primary-500 dark:bg-primary-400",
    label: "Holiday",
  },
  WEEKEND: {
    bg: "bg-gray-100 dark:bg-dark-700/50",
    text: "text-gray-500 dark:text-dark-400",
    dot: "bg-gray-400 dark:bg-dark-500",
    label: "Weekend",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = ATTENDANCE_STATUS_CONFIG[status] || {
    bg: "bg-gray-100 dark:bg-gray-500/10",
    text: "text-gray-600 dark:text-gray-400",
    dot: "bg-gray-400",
    label: status,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        config.bg,
        config.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

// ============================================
// Employee Avatar
// ============================================

function EmployeeAvatar({
  firstName,
  lastName,
  avatar,
  size = "sm",
}: {
  firstName: string;
  lastName: string;
  avatar: string | null;
  size?: "sm" | "md";
}) {
  const initials =
    `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();

  let hash = 0;
  const name = `${firstName}${lastName}`;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-primary-600",
    "bg-accent-600",
    "bg-success-600",
    "bg-info-600",
    "bg-warning-600",
    "bg-danger-600",
  ];
  const colorClass = colors[Math.abs(hash) % colors.length];
  const sizeClass = size === "md" ? "h-9 w-9 text-sm" : "h-8 w-8 text-xs";

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`${firstName} ${lastName}`}
        className={cn("rounded-full object-cover", sizeClass)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-white",
        colorClass,
        sizeClass,
      )}
    >
      {initials}
    </div>
  );
}

// ============================================
// Skeleton Row
// ============================================

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse border-b border-gray-100 dark:border-dark-700/30">
      {cols >= 7 && (
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-dark-700" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-dark-700" />
              <div className="h-2.5 w-20 rounded bg-gray-200 dark:bg-dark-700" />
            </div>
          </div>
        </td>
      )}
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-20 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-16 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-16 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-12 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
    </tr>
  );
}

// ============================================
// Pagination Component
// ============================================

function Pagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, currentPage + 1);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 dark:border-dark-700/50 px-4 py-3.5 sm:flex-row">
      <p className="text-xs text-gray-500 dark:text-dark-500">
        Showing{" "}
        <span className="font-medium text-gray-700 dark:text-dark-300">
          {startItem}
        </span>
        {" – "}
        <span className="font-medium text-gray-700 dark:text-dark-300">
          {endItem}
        </span>{" "}
        of{" "}
        <span className="font-medium text-gray-700 dark:text-dark-300">
          {total}
        </span>{" "}
        records
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-dark-200 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous page"
        >
          <HiOutlineChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((page, index) =>
          typeof page === "string" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1.5 text-xs text-gray-400 dark:text-dark-500"
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors",
                page === currentPage
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-dark-200",
              )}
            >
              {page}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-dark-200 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next page"
        >
          <HiOutlineChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// Confirmation Modal
// ============================================

function ConfirmActionModal({
  isOpen,
  type,
  isProcessing,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  type: "clockIn" | "clockOut" | null;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen || !type) return null;

  const isClockIn = type === "clockIn";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-overlay-show"
        onClick={!isProcessing ? onCancel : undefined}
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-modal dark:border-dark-700 dark:bg-dark-800 dark:shadow-modal-dark animate-content-show">
        <div className="p-6 text-center">
          {/* Icon */}
          <div
            className={cn(
              "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full",
              isClockIn ? "bg-success-500/10" : "bg-danger-500/10",
            )}
          >
            {isClockIn ? (
              <HiOutlineArrowRightOnRectangle className="h-7 w-7 text-success-500" />
            ) : (
              <HiOutlineArrowLeftOnRectangle className="h-7 w-7 text-danger-500" />
            )}
          </div>

          <h3 className="mb-1.5 text-lg font-semibold text-gray-900 dark:text-white">
            {isClockIn ? "Confirm Clock In" : "Confirm Clock Out"}
          </h3>
          <p className="mb-1 text-sm text-gray-500 dark:text-dark-400">
            {isClockIn
              ? "You're about to clock in for today."
              : "You're about to clock out for today."}
          </p>
          <p className="mb-6 text-xs text-gray-400 dark:text-dark-500">
            Current time:{" "}
            <span className="font-mono font-medium text-gray-600 dark:text-dark-300">
              {new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </span>
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-dark-600 dark:text-dark-300 dark:hover:border-dark-500 dark:hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50",
                isClockIn
                  ? "bg-success-600 hover:bg-success-500"
                  : "bg-danger-600 hover:bg-danger-500",
              )}
            >
              {isProcessing ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Processing…
                </>
              ) : (
                <>
                  {isClockIn ? (
                    <HiOutlineArrowRightOnRectangle className="h-4 w-4" />
                  ) : (
                    <HiOutlineArrowLeftOnRectangle className="h-4 w-4" />
                  )}
                  {isClockIn ? "Clock In" : "Clock Out"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Manual Attendance Modal (Admin/HR)
// ============================================

function ManualAttendanceModal({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: ManualAttendanceForm) => void;
}) {
  const [form, setForm] = useState<ManualAttendanceForm>({
    employeeId: "",
    date: new Date().toISOString().split("T")[0],
    clockIn: "09:00",
    clockOut: "18:00",
    status: "PRESENT",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof ManualAttendanceForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.employeeId.trim())
      newErrors.employeeId = "Employee ID is required";
    if (!form.date) newErrors.date = "Date is required";
    if (!form.status) newErrors.status = "Status is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(form);
  };

  const handleClose = () => {
    setForm({
      employeeId: "",
      date: new Date().toISOString().split("T")[0],
      clockIn: "09:00",
      clockOut: "18:00",
      status: "PRESENT",
      notes: "",
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-overlay-show"
        onClick={!isSubmitting ? handleClose : undefined}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-modal dark:border-dark-700 dark:bg-dark-800 dark:shadow-modal-dark animate-content-show">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-dark-700/50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mark Attendance
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
              Manually create an attendance record for an employee
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-white"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Employee ID */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
              Employee ID <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              value={form.employeeId}
              onChange={(e) => updateField("employeeId", e.target.value)}
              placeholder="Enter employee ID"
              className={cn(
                "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:bg-dark-700/50 dark:text-white dark:placeholder-dark-500",
                errors.employeeId
                  ? "border-danger-500/50"
                  : "border-gray-300 dark:border-dark-600",
              )}
            />
            {errors.employeeId && (
              <p className="mt-1 text-xs text-danger-500">
                {errors.employeeId}
              </p>
            )}
          </div>

          {/* Date & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
                Date <span className="text-danger-500">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
                className={cn(
                  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:bg-dark-700/50 dark:text-white dark:[color-scheme:dark]",
                  errors.date
                    ? "border-danger-500/50"
                    : "border-gray-300 dark:border-dark-600",
                )}
              />
              {errors.date && (
                <p className="mt-1 text-xs text-danger-500">{errors.date}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
                Status <span className="text-danger-500">*</span>
              </label>
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                className={cn(
                  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:bg-dark-700/50 dark:text-white",
                  errors.status
                    ? "border-danger-500/50"
                    : "border-gray-300 dark:border-dark-600",
                )}
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="HOLIDAY">Holiday</option>
              </select>
            </div>
          </div>

          {/* Clock In & Out */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
                Clock In Time
              </label>
              <input
                type="time"
                value={form.clockIn}
                onChange={(e) => updateField("clockIn", e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700/50 dark:text-white dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
                Clock Out Time
              </label>
              <input
                type="time"
                value={form.clockOut}
                onChange={(e) => updateField("clockOut", e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700/50 dark:text-white dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={2}
              placeholder="Optional notes…"
              className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700/50 dark:text-white dark:placeholder-dark-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-dark-600 dark:text-dark-300 dark:hover:border-dark-500 dark:hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Submitting…
                </>
              ) : (
                <>
                  <HiOutlineClipboardDocumentCheck className="h-4 w-4" />
                  Mark Attendance
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Calendar View Component
// ============================================

function CalendarView({
  calendarDays,
  isLoading,
  month,
  year,
  onPrevMonth,
  onNextMonth,
}: {
  calendarDays: MonthlyCalendarDay[];
  isLoading: boolean;
  month: number;
  year: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const monthName = new Date(year, month - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build grid: fill leading blanks + calendar days
  const calendarMap = useMemo(() => {
    const map: Record<string, MonthlyCalendarDay> = {};
    calendarDays.forEach((day) => {
      const d = new Date(day.date);
      const key = d.getDate().toString();
      map[key] = day;
    });
    return map;
  }, [calendarDays]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getStatusColor = (status: string | null): string => {
    if (!status) return "";
    const colors: Record<string, string> = {
      PRESENT:
        "bg-success-500/15 text-success-700 dark:text-success-400 border-success-500/30",
      ABSENT:
        "bg-danger-500/15 text-danger-700 dark:text-danger-400 border-danger-500/30",
      LATE: "bg-warning-500/15 text-warning-700 dark:text-warning-400 border-warning-500/30",
      HALF_DAY:
        "bg-info-500/15 text-info-700 dark:text-info-400 border-info-500/30",
      ON_LEAVE:
        "bg-accent-500/15 text-accent-700 dark:text-accent-400 border-accent-500/30",
      HOLIDAY:
        "bg-primary-500/15 text-primary-700 dark:text-primary-400 border-primary-500/30",
      WEEKEND:
        "bg-gray-100 text-gray-500 dark:bg-dark-700/50 dark:text-dark-500 border-gray-200 dark:border-dark-600",
    };
    return colors[status] || "";
  };

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;
  const canGoNext =
    year < today.getFullYear() ||
    (year === today.getFullYear() && month < today.getMonth() + 1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-dark-700/50">
        <button
          onClick={onPrevMonth}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-dark-200"
          aria-label="Previous month"
        >
          <HiOutlineChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {monthName}
        </h3>
        <button
          onClick={onNextMonth}
          disabled={!canGoNext}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-dark-200 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next month"
        >
          <HiOutlineChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday Headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-1.5 text-center text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day Grid */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-lg bg-gray-100 dark:bg-dark-700/50"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Leading blank cells */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`blank-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayData = calendarMap[dayNum.toString()];
              const isToday = isCurrentMonth && today.getDate() === dayNum;
              const statusColors = dayData
                ? getStatusColor(dayData.status)
                : "";

              return (
                <div
                  key={dayNum}
                  className={cn(
                    "group relative flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition-all",
                    isToday
                      ? "border-primary-500 bg-primary-500/10 font-bold ring-1 ring-primary-500/30"
                      : dayData?.status
                        ? statusColors
                        : "border-transparent text-gray-400 dark:text-dark-600",
                    !isToday && dayData?.status && "font-medium",
                  )}
                  title={
                    dayData
                      ? `${dayData.status || "No record"}${dayData.clockIn ? ` | In: ${formatTime(dayData.clockIn)}` : ""}${dayData.clockOut ? ` | Out: ${formatTime(dayData.clockOut)}` : ""}${dayData.totalHours ? ` | ${formatHours(dayData.totalHours)}` : ""}`
                      : undefined
                  }
                >
                  <span>{dayNum}</span>
                  {dayData?.status && (
                    <span
                      className={cn(
                        "mt-0.5 h-1 w-1 rounded-full",
                        ATTENDANCE_STATUS_CONFIG[dayData.status]?.dot ||
                          "bg-gray-400",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-gray-100 pt-3 dark:border-dark-700/50">
          {Object.entries(ATTENDANCE_STATUS_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", config.dot)} />
              <span className="text-2xs text-gray-500 dark:text-dark-400">
                {config.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return "0m";
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatCurrentTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function downloadCSV(records: AttendanceRecord[], isAdminOrHR: boolean) {
  const headers = isAdminOrHR
    ? ["Employee", "Date", "Clock In", "Clock Out", "Hours", "Status", "Notes"]
    : ["Date", "Clock In", "Clock Out", "Hours", "Status", "Notes"];

  const rows = records.map((r) => {
    const base = [
      formatDate(r.date),
      r.clockIn ? formatTime(r.clockIn) : "",
      r.clockOut ? formatTime(r.clockOut) : "",
      r.totalHours != null ? formatHours(r.totalHours) : "",
      r.status || "",
      (r.notes || "").replace(/,/g, ";"),
    ];
    if (isAdminOrHR) {
      const name = r.employee
        ? `${r.employee.firstName} ${r.employee.lastName}`
        : "—";
      base.unshift(name);
    }
    return base;
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// Attendance List Page Component
// ============================================

export function AttendanceListPage() {
  const dispatch = useAppDispatch();

  // Auth & theme state
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const isAdminOrHR = userRole === "ADMIN" || userRole === "HR";
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isDark = resolvedTheme === "dark";

  // State: Today's status
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [isTodayLoading, setIsTodayLoading] = useState(true);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(formatCurrentTime());

  // State: Attendance list
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State: Monthly summary
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);

  // State: Calendar
  const [calendarDays, setCalendarDays] = useState<MonthlyCalendarDay[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // State: Filters & UI
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // State: Modals
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    type: null,
  });
  const [showManualModal, setShowManualModal] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Debounce search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // Set page title
  useEffect(() => {
    dispatch(
      setPageTitle({ title: "Attendance", subtitle: "Attendance Management" }),
    );
  }, [dispatch]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatCurrentTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch today's status
  const fetchTodayStatus = useCallback(async () => {
    try {
      setIsTodayLoading(true);
      const response = await attendanceApi.getTodayStatus();
      const raw =
        (response as any)?.data?.data || (response as any)?.data || response;

      const normalized: TodayStatus = {
        id: raw.id ?? null,
        date: raw.date ?? new Date().toISOString(),
        clockIn: raw.clockIn ?? raw.clockInTime ?? null,
        clockOut: raw.clockOut ?? raw.clockOutTime ?? null,
        totalHours: raw.totalHours ?? null,
        status: raw.status ?? null,
        notes: raw.notes ?? null,
        isClockedIn:
          raw.isClockedIn ??
          raw.hasClockedIn ??
          !!(raw.clockIn || raw.clockInTime),
        isClockedOut:
          raw.isClockedOut ??
          raw.hasClockedOut ??
          !!(raw.clockOut || raw.clockOutTime),
      };

      setTodayStatus(normalized);
    } catch (err: any) {
      console.warn("Failed to load today status:", err?.message);
    } finally {
      setIsTodayLoading(false);
    }
  }, []);

  // Fetch attendance records
  const fetchRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: Record<string, any> = {
        page: currentPage,
        limit: pageSize,
        sortBy: "date",
        sortOrder: "desc",
      };
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      if (debouncedSearch && isAdminOrHR) params.search = debouncedSearch;

      const response = await attendanceApi.list(params);
      const responseData = (response as any)?.data || (response as any) || {};

      setRecords(responseData.data || []);
      setMeta(
        responseData.meta || {
          page: currentPage,
          limit: pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load attendance records";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    statusFilter,
    dateFilter,
    debouncedSearch,
    isAdminOrHR,
  ]);

  // Fetch monthly summary
  const fetchSummary = useCallback(async () => {
    try {
      setIsSummaryLoading(true);
      const now = new Date();
      const response = await attendanceApi.getMySummary({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });
      const raw =
        (response as any)?.data?.data || (response as any)?.data || response;
      setSummary(raw);
    } catch (err: any) {
      console.warn("Failed to load summary:", err?.message);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  // Fetch calendar data
  const fetchCalendar = useCallback(async () => {
    try {
      setIsCalendarLoading(true);
      const response = await attendanceApi.getMyCalendar({
        year: calendarYear,
        month: calendarMonth,
      });
      const raw =
        (response as any)?.data?.data || (response as any)?.data || response;
      setCalendarDays(Array.isArray(raw) ? raw : []);
    } catch (err: any) {
      console.warn("Failed to load calendar:", err?.message);
      setCalendarDays([]);
    } finally {
      setIsCalendarLoading(false);
    }
  }, [calendarYear, calendarMonth]);

  // Initial data fetch
  useEffect(() => {
    fetchTodayStatus();
    fetchSummary();
  }, [fetchTodayStatus, fetchSummary]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (viewMode === "calendar") {
      fetchCalendar();
    }
  }, [viewMode, fetchCalendar]);

  // Clock in handler
  const handleClockIn = async () => {
    try {
      setIsClockingIn(true);
      await attendanceApi.clockIn({ notes: "", location: "" });
      toast.success("Clocked in successfully!");
      setConfirmModal({ isOpen: false, type: null });
      await fetchTodayStatus();
      await fetchRecords();
      await fetchSummary();
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to clock in";
      toast.error(message);
    } finally {
      setIsClockingIn(false);
    }
  };

  // Clock out handler
  const handleClockOut = async () => {
    try {
      setIsClockingOut(true);
      await attendanceApi.clockOut({ notes: "" });
      toast.success("Clocked out successfully!");
      setConfirmModal({ isOpen: false, type: null });
      await fetchTodayStatus();
      await fetchRecords();
      await fetchSummary();
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || "Failed to clock out";
      toast.error(message);
    } finally {
      setIsClockingOut(false);
    }
  };

  // Manual attendance handler
  const handleManualAttendance = async (data: ManualAttendanceForm) => {
    try {
      setIsSubmittingManual(true);
      await attendanceApi.createManual({
        employeeId: data.employeeId,
        date: data.date,
        clockIn: data.clockIn || undefined,
        clockOut: data.clockOut || undefined,
        status: data.status,
        notes: data.notes || undefined,
      });
      toast.success("Attendance marked successfully!");
      setShowManualModal(false);
      await fetchRecords();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to mark attendance";
      toast.error(message);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Page change handler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset filters
  const handleResetFilters = () => {
    setStatusFilter("");
    setDateFilter("");
    setSearchQuery("");
    setDebouncedSearch("");
    setCurrentPage(1);
  };

  // Calendar nav
  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  // Refresh all data
  const handleRefresh = () => {
    fetchTodayStatus();
    fetchRecords();
    fetchSummary();
    if (viewMode === "calendar") fetchCalendar();
  };

  // Computed values
  const totalPages = meta?.totalPages || 0;
  const total = meta?.total || 0;
  const hasActiveFilters = !!statusFilter || !!dateFilter || !!debouncedSearch;
  const isClockedIn = todayStatus?.isClockedIn && !todayStatus?.isClockedOut;
  const isClockedOut = todayStatus?.isClockedOut;

  // Summary stats for cards
  const summaryStats = useMemo(() => {
    return [
      {
        label: "Present",
        value: summary?.present ?? "—",
        icon: HiOutlineCheckCircle,
        color: "bg-success-500/10",
        iconColor: "text-success-500",
        textColor: "text-success-600 dark:text-success-400",
      },
      {
        label: "Absent",
        value: summary?.absent ?? "—",
        icon: HiOutlineXCircle,
        color: "bg-danger-500/10",
        iconColor: "text-danger-500",
        textColor: "text-danger-600 dark:text-danger-400",
      },
      {
        label: "Late",
        value: summary?.late ?? "—",
        icon: HiOutlineClock,
        color: "bg-warning-500/10",
        iconColor: "text-warning-500",
        textColor: "text-warning-600 dark:text-warning-400",
      },
      {
        label: "On Leave",
        value: summary?.onLeave ?? "—",
        icon: HiOutlineCalendarDays,
        color: "bg-accent-500/10",
        iconColor: "text-accent-500",
        textColor: "text-accent-600 dark:text-accent-400",
      },
    ];
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* Page Header                                                       */}
      {/* ================================================================ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Attendance
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
            Track and manage daily attendance records
            {total > 0 && (
              <span className="ml-1 text-gray-400 dark:text-dark-500">
                · {total} record{total !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-gray-300 bg-white p-0.5 dark:border-dark-600 dark:bg-dark-800">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                viewMode === "table"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200",
              )}
            >
              <HiOutlineListBullet className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                viewMode === "calendar"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-200",
              )}
            >
              <HiOutlineCalendar className="h-3.5 w-3.5" />
              Calendar
            </button>
          </div>

          {/* Export button */}
          {records.length > 0 && viewMode === "table" && (
            <button
              onClick={() => downloadCSV(records, isAdminOrHR)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700 dark:hover:text-dark-100"
              title="Export as CSV"
            >
              <HiOutlineArrowDownTray className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          {/* Manual attendance (Admin/HR) */}
          {isAdminOrHR && (
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-500 hover:shadow-primary-500/30"
            >
              <HiOutlinePlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Mark Attendance</span>
            </button>
          )}

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700 dark:hover:text-dark-100"
            title="Refresh data"
          >
            <HiOutlineArrowPath
              className={cn("h-4 w-4", isLoading && "animate-spin")}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Today's Attendance + Quick Stats                                  */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Clock In/Out Card */}
        <div
          className={cn(
            "rounded-xl border p-5 lg:col-span-1",
            "border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none",
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10">
                <HiOutlineClock className="h-4 w-4 text-primary-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Today's Attendance
              </h3>
            </div>
            {todayStatus?.status && <StatusBadge status={todayStatus.status} />}
          </div>

          {/* Current time display */}
          <div className="mb-5 text-center">
            <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
              {currentTime}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-500">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Status details */}
          {isTodayLoading ? (
            <div className="mb-5 space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-9 animate-pulse rounded-lg bg-gray-100 dark:bg-dark-700/50"
                />
              ))}
            </div>
          ) : (
            todayStatus && (
              <div className="mb-5 space-y-2">
                {todayStatus.clockIn && (
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-900/50">
                    <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-400">
                      <HiOutlineArrowRightOnRectangle className="h-3.5 w-3.5 text-success-500" />
                      Clock In
                    </span>
                    <span className="text-xs font-medium text-gray-800 dark:text-dark-200">
                      {formatTime(todayStatus.clockIn)}
                    </span>
                  </div>
                )}
                {todayStatus.clockOut && (
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-900/50">
                    <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-400">
                      <HiOutlineArrowLeftOnRectangle className="h-3.5 w-3.5 text-danger-500" />
                      Clock Out
                    </span>
                    <span className="text-xs font-medium text-gray-800 dark:text-dark-200">
                      {formatTime(todayStatus.clockOut)}
                    </span>
                  </div>
                )}
                {todayStatus.totalHours != null &&
                  todayStatus.totalHours > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-dark-900/50">
                      <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-400">
                        <HiOutlineClock className="h-3.5 w-3.5 text-info-500" />
                        Total Hours
                      </span>
                      <span className="text-xs font-medium text-gray-800 dark:text-dark-200">
                        {formatHours(todayStatus.totalHours)}
                      </span>
                    </div>
                  )}
              </div>
            )
          )}

          {/* Clock In/Out Buttons */}
          <div className="flex gap-3">
            {!isClockedIn && !isClockedOut && (
              <button
                onClick={() =>
                  setConfirmModal({ isOpen: true, type: "clockIn" })
                }
                disabled={isClockingIn || isTodayLoading}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all",
                  "bg-success-600 hover:bg-success-500 active:bg-success-700",
                  "shadow-lg shadow-success-600/20 hover:shadow-success-500/30",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
                )}
              >
                <HiOutlineArrowRightOnRectangle className="h-4.5 w-4.5" />
                Clock In
              </button>
            )}

            {isClockedIn && !isClockedOut && (
              <button
                onClick={() =>
                  setConfirmModal({ isOpen: true, type: "clockOut" })
                }
                disabled={isClockingOut}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all",
                  "bg-danger-600 hover:bg-danger-500 active:bg-danger-700",
                  "shadow-lg shadow-danger-600/20 hover:shadow-danger-500/30",
                  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
                )}
              >
                <HiOutlineArrowLeftOnRectangle className="h-4.5 w-4.5" />
                Clock Out
              </button>
            )}

            {isClockedOut && (
              <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-success-500/20 bg-success-500/10 px-4 py-3 text-sm font-medium text-success-600 dark:text-success-400">
                <HiOutlineCheckCircle className="h-4.5 w-4.5" />
                Today's attendance completed
              </div>
            )}
          </div>
        </div>

        {/* Monthly Summary Stats */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          {summaryStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-card transition-all hover:shadow-lg dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none dark:hover:border-dark-600/50"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    stat.color,
                  )}
                >
                  <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                </div>
                <div className="min-w-0 flex-1">
                  {isSummaryLoading ? (
                    <div className="h-6 w-10 animate-pulse rounded bg-gray-200 dark:bg-dark-700" />
                  ) : (
                    <p
                      className={cn(
                        "text-xl font-bold tabular-nums",
                        stat.textColor,
                      )}
                    >
                      {stat.value}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-dark-400">
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Attendance Rate */}
          {summary && (
            <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
                    <HiOutlineShieldCheck className="h-5 w-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-dark-200">
                      Monthly Attendance Rate
                    </p>
                    <p className="text-xs text-gray-400 dark:text-dark-500">
                      {new Date().toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">
                    {summary.attendanceRate != null
                      ? `${Math.round(summary.attendanceRate)}%`
                      : "—"}
                  </p>
                </div>
              </div>
              {summary.attendanceRate != null && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-700">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      summary.attendanceRate >= 90
                        ? "bg-success-500"
                        : summary.attendanceRate >= 75
                          ? "bg-warning-500"
                          : "bg-danger-500",
                    )}
                    style={{
                      width: `${Math.min(summary.attendanceRate, 100)}%`,
                    }}
                  />
                </div>
              )}
              {summary.averageHours != null && (
                <p className="mt-2 text-xs text-gray-500 dark:text-dark-400">
                  Avg. hours/day:{" "}
                  <span className="font-medium text-gray-700 dark:text-dark-200">
                    {formatHours(summary.averageHours)}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Calendar View                                                     */}
      {/* ================================================================ */}
      {viewMode === "calendar" && (
        <CalendarView
          calendarDays={calendarDays}
          isLoading={isCalendarLoading}
          month={calendarMonth}
          year={calendarYear}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
      )}

      {/* ================================================================ */}
      {/* Table View: Filter Bar + Table                                    */}
      {/* ================================================================ */}
      {viewMode === "table" && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              {/* Search (Admin/HR only) */}
              {isAdminOrHR && (
                <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-dark-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by employee name…"
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-900/50 dark:text-white dark:placeholder-dark-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setDebouncedSearch("");
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:text-dark-500 dark:hover:text-dark-300"
                    >
                      <HiOutlineXMark className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Date filter */}
              <div className="relative">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-900/50 dark:text-white dark:[color-scheme:dark]"
                />
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-900/50 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="HOLIDAY">Holiday</option>
                </select>
                <HiOutlineChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-dark-500" />
              </div>

              {/* Reset filters */}
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700 dark:border-dark-600 dark:text-dark-400 dark:hover:border-dark-500 dark:hover:text-dark-200"
                >
                  <HiOutlineXMark className="h-3.5 w-3.5" />
                  Clear Filters
                </button>
              )}
            </div>

            {/* Results count */}
            <p className="text-xs text-gray-500 dark:text-dark-400">
              {total} record{total !== 1 ? "s" : ""}
              {hasActiveFilters && " (filtered)"}
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="mx-4 mb-4 flex items-start gap-3 rounded-lg border border-danger-500/20 bg-danger-500/10 px-4 py-3">
              <HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-danger-700 dark:text-danger-400">
                  {error}
                </p>
              </div>
              <button
                onClick={fetchRecords}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-danger-600 transition-colors hover:bg-danger-500/10 dark:text-danger-400"
              >
                Retry
              </button>
            </div>
          )}

          {/* Attendance Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-y border-gray-200 dark:border-dark-700/50">
                  {isAdminOrHR && (
                    <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-500">
                      Employee
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-500">
                    Clock In
                  </th>
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-500">
                    Clock Out
                  </th>
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-500">
                    Hours
                  </th>
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-500">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} cols={isAdminOrHR ? 7 : 6} />
                  ))
                ) : records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdminOrHR ? 7 : 6}
                      className="px-4 py-16 text-center"
                    >
                      <div className="flex flex-col items-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-700/50">
                          <HiOutlineCalendarDays className="h-7 w-7 text-gray-400 dark:text-dark-500" />
                        </div>
                        <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-dark-300">
                          No attendance records found
                        </h3>
                        <p className="max-w-sm text-xs text-gray-500 dark:text-dark-500">
                          {hasActiveFilters
                            ? "Try adjusting your filters to see more results."
                            : "Attendance records will appear here once employees start clocking in."}
                        </p>
                        {hasActiveFilters && (
                          <button
                            onClick={handleResetFilters}
                            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary-600 transition-colors hover:text-primary-500 dark:text-primary-400"
                          >
                            <HiOutlineXMark className="h-3.5 w-3.5" />
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((record) => {
                    const employee = record.employee;
                    const fullName = employee
                      ? `${employee.firstName} ${employee.lastName}`
                      : "—";

                    return (
                      <tr
                        key={record.id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-dark-700/30 dark:hover:bg-dark-800/30"
                      >
                        {/* Employee column (Admin/HR only) */}
                        {isAdminOrHR && (
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              {employee ? (
                                <EmployeeAvatar
                                  firstName={employee.firstName}
                                  lastName={employee.lastName}
                                  avatar={employee.avatar}
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-400 dark:bg-dark-700 dark:text-dark-500">
                                  ?
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900 dark:text-dark-100">
                                  {fullName}
                                </p>
                                {employee?.designation && (
                                  <p className="truncate text-2xs text-gray-500 dark:text-dark-500">
                                    {employee.designation}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Date */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-gray-800 dark:text-dark-200">
                            {formatDate(record.date)}
                          </p>
                        </td>

                        {/* Clock In */}
                        <td className="px-4 py-3.5">
                          {record.clockIn ? (
                            <span className="font-mono text-sm text-success-600 dark:text-success-400">
                              {formatTime(record.clockIn)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-300 dark:text-dark-600">
                              —
                            </span>
                          )}
                        </td>

                        {/* Clock Out */}
                        <td className="px-4 py-3.5">
                          {record.clockOut ? (
                            <span className="font-mono text-sm text-danger-600 dark:text-danger-400">
                              {formatTime(record.clockOut)}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-300 dark:text-dark-600">
                              —
                            </span>
                          )}
                        </td>

                        {/* Hours */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-medium tabular-nums text-gray-800 dark:text-dark-200">
                            {formatHours(record.totalHours)}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={record.status} />
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-3.5">
                          <p
                            className="max-w-[200px] truncate text-xs text-gray-500 dark:text-dark-500"
                            title={record.notes || undefined}
                          >
                            {record.notes || "—"}
                          </p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && records.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* Info Tip                                                          */}
      {/* ================================================================ */}
      <div className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-dark-700/50 dark:bg-dark-800/30">
        <HiOutlineInformationCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-dark-500" />
        <span className="text-xs leading-relaxed text-gray-500 dark:text-dark-400">
          {isAdminOrHR
            ? "As an Admin/HR, you can view all employee attendance records, mark manual attendance, and export data. Use the search bar and filters to narrow down results."
            : "Your attendance records are shown here. Use the Clock In/Out buttons to mark your daily attendance, and switch to Calendar view to see your monthly overview."}
        </span>
      </div>

      {/* ================================================================ */}
      {/* Modals                                                            */}
      {/* ================================================================ */}

      {/* Clock In/Out Confirmation Modal */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        isProcessing={
          confirmModal.type === "clockIn" ? isClockingIn : isClockingOut
        }
        onConfirm={
          confirmModal.type === "clockIn" ? handleClockIn : handleClockOut
        }
        onCancel={() => setConfirmModal({ isOpen: false, type: null })}
      />

      {/* Manual Attendance Modal (Admin/HR) */}
      <ManualAttendanceModal
        isOpen={showManualModal}
        isSubmitting={isSubmittingManual}
        onClose={() => setShowManualModal(false)}
        onSubmit={handleManualAttendance}
      />
    </div>
  );
}

export default AttendanceListPage;
