// ============================================
// Leave Management Page
// ============================================
// Displays leave requests, leave balances, and provides
// functionality to apply for leave, approve/reject requests.

import { useEffect, useState, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import {
  fetchLeaves,
  fetchMyLeaves,
  fetchMyLeaveBalances,
  applyLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  setCurrentPage,
  setFilter,
  clearErrors,
  clearSuccessFlags,
  selectLeaveList,
  selectLeaveMeta,
  selectLeaveCurrentPage,
  selectLeavePageSize,
  selectLeaveBalances,
  selectLeavesLoading,
  selectLeaveError,
  selectIsApplying,
  selectApplySuccess,
  selectApproveSuccess,
  selectRejectSuccess,
  selectCancelSuccess,
} from "@/store/slices/leaveSlice";
import { setPageTitle } from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";
import {
  HiOutlineCalendarDays,
  HiOutlinePlus,
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineClock,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle,
  HiOutlineEllipsisVertical,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineNoSymbol,
  HiOutlineFunnel,
} from "react-icons/hi2";

// ============================================
// Leave Type Labels & Colors
// ============================================

const LEAVE_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  CASUAL: { label: "Casual", color: "text-info-400", bg: "bg-info-500/10" },
  SICK: { label: "Sick", color: "text-danger-400", bg: "bg-danger-500/10" },
  EARNED: {
    label: "Earned",
    color: "text-success-400",
    bg: "bg-success-500/10",
  },
  MATERNITY: {
    label: "Maternity",
    color: "text-accent-400",
    bg: "bg-accent-500/10",
  },
  PATERNITY: {
    label: "Paternity",
    color: "text-primary-400",
    bg: "bg-primary-500/10",
  },
  UNPAID: {
    label: "Unpaid",
    color: "text-warning-400",
    bg: "bg-warning-500/10",
  },
  COMPENSATORY: {
    label: "Compensatory",
    color: "text-dark-300",
    bg: "bg-dark-600/30",
  },
};

const LEAVE_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  PENDING: {
    label: "Pending",
    color: "text-warning-400",
    bg: "bg-warning-500/10",
    dot: "bg-warning-400",
  },
  APPROVED: {
    label: "Approved",
    color: "text-success-400",
    bg: "bg-success-500/10",
    dot: "bg-success-400",
  },
  REJECTED: {
    label: "Rejected",
    color: "text-danger-400",
    bg: "bg-danger-500/10",
    dot: "bg-danger-400",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-dark-400",
    bg: "bg-dark-500/10",
    dot: "bg-dark-400",
  },
};

// ============================================
// Status Badge
// ============================================

function LeaveStatusBadge({ status }: { status: string }) {
  const config = LEAVE_STATUS_CONFIG[status] || LEAVE_STATUS_CONFIG.PENDING;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-medium",
        config.bg,
        config.color,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

// ============================================
// Leave Type Badge
// ============================================

function LeaveTypeBadge({ type }: { type: string }) {
  const config = LEAVE_TYPE_CONFIG[type] || {
    label: type,
    color: "text-dark-300",
    bg: "bg-dark-600/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-2xs font-medium",
        config.bg,
        config.color,
      )}
    >
      {config.label}
    </span>
  );
}

// ============================================
// Apply Leave Modal
// ============================================

function ApplyLeaveModal({
  isOpen,
  isApplying,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  isApplying: boolean;
  onClose: () => void;
  onSubmit: (data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => void;
}) {
  const [leaveType, setLeaveType] = useState("CASUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!leaveType) newErrors.leaveType = "Leave type is required";
    if (!startDate) newErrors.startDate = "Start date is required";
    if (!endDate) newErrors.endDate = "End date is required";
    if (!reason.trim()) newErrors.reason = "Reason is required";
    if (reason.trim().length < 10)
      newErrors.reason = "Reason must be at least 10 characters";
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = "End date must be after start date";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit({ leaveType, startDate, endDate, reason: reason.trim() });
  };

  const handleClose = () => {
    setLeaveType("CASUAL");
    setStartDate("");
    setEndDate("");
    setReason("");
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-overlay-show"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-modal dark:border-dark-700 dark:bg-dark-800 dark:shadow-modal-dark animate-content-show">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-dark-700/50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Apply for Leave
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
              Fill in the details below to submit your leave request
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-dark-400 dark:hover:bg-dark-700 dark:hover:text-white"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Leave Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
              Leave Type
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700/50 dark:text-white"
            >
              {Object.entries(LEAVE_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label} Leave
                </option>
              ))}
            </select>
            {errors.leaveType && (
              <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">
                {errors.leaveType}
              </p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={cn(
                  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 dark:bg-dark-700/50 dark:text-white",
                  errors.startDate
                    ? "border-danger-500/50"
                    : "border-gray-300 dark:border-dark-600",
                )}
              />
              {errors.startDate && (
                <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">
                  {errors.startDate}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className={cn(
                  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 dark:bg-dark-700/50 dark:text-white",
                  errors.endDate
                    ? "border-danger-500/50"
                    : "border-gray-300 dark:border-dark-600",
                )}
              />
              {errors.endDate && (
                <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain the reason for your leave request…"
              className={cn(
                "w-full resize-none rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 dark:bg-dark-700/50 dark:text-white dark:placeholder-dark-500",
                errors.reason
                  ? "border-danger-500/50"
                  : "border-gray-300 dark:border-dark-600",
              )}
            />
            {errors.reason && (
              <p className="mt-1 text-xs text-danger-500 dark:text-danger-400">
                {errors.reason}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isApplying}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-dark-600 dark:text-dark-300 dark:hover:border-dark-500 dark:hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isApplying}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-500 disabled:opacity-50"
            >
              {isApplying ? (
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <HiOutlineCalendarDays className="h-4 w-4" />
                  Submit Request
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
// Leave Balance Card
// ============================================

function LeaveBalanceCard({
  leaveType,
  total,
  used,
}: {
  leaveType: string;
  total: number;
  used: number;
}) {
  const remaining = total - used;
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const config = LEAVE_TYPE_CONFIG[leaveType] || {
    label: leaveType,
    color: "text-dark-300",
    bg: "bg-dark-600/30",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-card transition-all hover:border-gray-300 dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none dark:hover:border-dark-600/50">
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("text-xs font-semibold", config.color)}>
          {config.label}
        </span>
        <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
          {remaining}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-700">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            percentage > 80
              ? "bg-danger-500"
              : percentage > 50
                ? "bg-warning-500"
                : "bg-success-500",
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-2xs text-gray-400 dark:text-dark-500">
        <span>Used: {used}</span>
        <span>Total: {total}</span>
      </div>
    </div>
  );
}

// ============================================
// Leave Action Dropdown
// ============================================

function LeaveActionDropdown({
  leaveId,
  status,
  isOwner,
  isAdminOrHR,
  onApprove,
  onReject,
  onCancel,
}: {
  leaveId: string;
  status: string;
  isOwner: boolean;
  isAdminOrHR: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const canApproveReject = isAdminOrHR && status === "PENDING";
  const canCancel =
    (isOwner || isAdminOrHR) && (status === "PENDING" || status === "APPROVED");

  if (!canApproveReject && !canCancel) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-dark-500 dark:hover:bg-dark-700 dark:hover:text-dark-300"
      >
        <HiOutlineEllipsisVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-dropdown dark:border-dark-700 dark:bg-dark-800 dark:shadow-dropdown-dark animate-scale-in">
            {canApproveReject && (
              <>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onApprove(leaveId);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-success-600 transition-colors hover:bg-success-500/10 dark:text-success-400"
                >
                  <HiOutlineCheck className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onReject(leaveId);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-600 transition-colors hover:bg-danger-500/10 dark:text-danger-400"
                >
                  <HiOutlineXMark className="h-4 w-4" />
                  Reject
                </button>
              </>
            )}
            {canCancel && (
              <>
                {canApproveReject && (
                  <div className="mx-2 my-1 h-px bg-gray-100 dark:bg-dark-700" />
                )}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onCancel(leaveId);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-warning-600 transition-colors hover:bg-warning-500/10 dark:text-warning-400"
                >
                  <HiOutlineNoSymbol className="h-4 w-4" />
                  Cancel
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Skeleton Row
// ============================================

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-100 dark:border-dark-700/30">
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-20 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-20 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-8 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-7 w-7 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
    </tr>
  );
}

// ============================================
// Avatar for leave request
// ============================================

function EmployeeAvatar({
  name,
  avatar,
}: {
  name: string;
  avatar?: string | null;
}) {
  const initials = name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white",
        colorClass,
      )}
    >
      {initials}
    </div>
  );
}

// ============================================
// Leave Page Component
// ============================================

export function LeavePage() {
  const dispatch = useAppDispatch();

  // Redux state
  const leaveList = useAppSelector(selectLeaveList);
  const meta = useAppSelector(selectLeaveMeta);
  const currentPage = useAppSelector(selectLeaveCurrentPage);
  const pageSize = useAppSelector(selectLeavePageSize);
  const balances = useAppSelector(selectLeaveBalances);
  const isLoading = useAppSelector(selectLeavesLoading);
  const error = useAppSelector(selectLeaveError);
  const isApplying = useAppSelector(selectIsApplying);
  const applySuccess = useAppSelector(selectApplySuccess);
  const approveSuccess = useAppSelector(selectApproveSuccess);
  const rejectSuccess = useAppSelector(selectRejectSuccess);
  const cancelSuccess = useAppSelector(selectCancelSuccess);
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const userId = useAppSelector((state) => state.auth.user?.id);

  const isAdminOrHR = userRole === "ADMIN" || userRole === "HR";

  // Local state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // ---- Set page title ----
  useEffect(() => {
    dispatch(setPageTitle({ title: "Leave", subtitle: "Leave Management" }));
  }, [dispatch]);

  // ---- Fetch data ----
  useEffect(() => {
    dispatch(fetchLeaves());
    dispatch(fetchMyLeaveBalances());
  }, [dispatch, currentPage, pageSize]);

  // ---- Handle filter changes ----
  useEffect(() => {
    if (statusFilter) {
      dispatch(setFilter({ key: "status", value: statusFilter }));
    } else {
      dispatch(setFilter({ key: "status", value: "" }));
    }
  }, [dispatch, statusFilter]);

  useEffect(() => {
    if (typeFilter) {
      dispatch(setFilter({ key: "leaveType", value: typeFilter }));
    } else {
      dispatch(setFilter({ key: "leaveType", value: "" }));
    }
  }, [dispatch, typeFilter]);

  // ---- Handle success states ----
  useEffect(() => {
    if (applySuccess) {
      setShowApplyModal(false);
      dispatch(clearSuccessFlags());
      dispatch(fetchLeaves());
      dispatch(fetchMyLeaveBalances());
    }
  }, [applySuccess, dispatch]);

  useEffect(() => {
    if (approveSuccess || rejectSuccess || cancelSuccess) {
      dispatch(clearSuccessFlags());
      dispatch(fetchLeaves());
    }
  }, [approveSuccess, rejectSuccess, cancelSuccess, dispatch]);

  // ---- Cleanup ----
  useEffect(() => {
    return () => {
      dispatch(clearErrors());
      dispatch(clearSuccessFlags());
    };
  }, [dispatch]);

  // ---- Handlers ----

  const handleApplyLeave = useCallback(
    (data: {
      leaveType: string;
      startDate: string;
      endDate: string;
      reason: string;
    }) => {
      dispatch(applyLeave(data));
    },
    [dispatch],
  );

  const handleApprove = useCallback(
    (id: string) => {
      dispatch(approveLeave({ id }));
    },
    [dispatch],
  );

  const handleReject = useCallback(
    (id: string) => {
      dispatch(rejectLeave({ id }));
    },
    [dispatch],
  );

  const handleCancel = useCallback(
    (id: string) => {
      dispatch(cancelLeave({ id }));
    },
    [dispatch],
  );

  const handleRefresh = useCallback(() => {
    dispatch(fetchLeaves());
    dispatch(fetchMyLeaveBalances());
  }, [dispatch]);

  const handlePageChange = useCallback(
    (page: number) => {
      dispatch(setCurrentPage(page));
    },
    [dispatch],
  );

  // ---- Format date helper ----
  const formatDate = (dateStr: string): string => {
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
  };

  // ---- Derived values ----
  const totalPages = meta?.totalPages ?? 0;
  const total = meta?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================================================================ */}
      {/* Page Header                                                       */}
      {/* ================================================================ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            Leave Management
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-400">
            {isAdminOrHR
              ? "Manage leave requests for all employees"
              : "View your leave balance and manage leave requests"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-300 dark:hover:border-dark-600 dark:hover:text-white disabled:opacity-50"
          >
            <HiOutlineArrowPath
              className={cn("h-4 w-4", isLoading && "animate-spin")}
            />
          </button>
          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-500 hover:shadow-primary-500/30"
          >
            <HiOutlinePlus className="h-4 w-4" />
            <span className="hidden sm:inline">Apply Leave</span>
            <span className="sm:hidden">Apply</span>
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Leave Balance Cards                                               */}
      {/* ================================================================ */}
      {balances.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-dark-200">
            Leave Balance
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {balances.map((balance) => (
              <LeaveBalanceCard
                key={balance.id || `${balance.leaveType}-${balance.year}`}
                leaveType={balance.leaveType}
                total={balance.totalLeaves}
                used={balance.usedLeaves}
              />
            ))}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* Filters                                                           */}
      {/* ================================================================ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-dark-400">
          <HiOutlineFunnel className="h-3.5 w-3.5" />
          Filters:
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 outline-none transition-colors focus:border-primary-500 dark:border-dark-600 dark:bg-dark-700/50 dark:text-dark-300"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Leave type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 outline-none transition-colors focus:border-primary-500 dark:border-dark-600 dark:bg-dark-700/50 dark:text-dark-300"
        >
          <option value="">All Types</option>
          {Object.entries(LEAVE_TYPE_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {(statusFilter || typeFilter) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setTypeFilter("");
            }}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-dark-600 dark:text-dark-400 dark:hover:border-dark-500 dark:hover:text-white"
          >
            <HiOutlineXMark className="h-3 w-3" />
            Clear
          </button>
        )}

        {/* Result count */}
        <span className="ml-auto text-xs text-gray-400 dark:text-dark-500">
          {total} request{total !== 1 ? "s" : ""} found
        </span>
      </div>

      {/* ================================================================ */}
      {/* Leave Requests Table                                              */}
      {/* ================================================================ */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/30 dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            {/* Header */}
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-dark-700/50 dark:bg-dark-800/50">
                {isAdminOrHR && (
                  <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                    Employee
                  </th>
                )}
                <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                  Leave Type
                </th>
                <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                  Start Date
                </th>
                <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                  End Date
                </th>
                <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                  Days
                </th>
                <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                  Reason
                </th>
                <th className="px-4 py-3 text-right text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {/* Loading state */}
              {isLoading &&
                leaveList.length === 0 &&
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}

              {/* Error state */}
              {error && !isLoading && leaveList.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdminOrHR ? 8 : 7}
                    className="px-4 py-12 text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-500/10">
                        <HiOutlineExclamationTriangle className="h-6 w-6 text-danger-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Failed to load leave requests
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-400">
                        {error}
                      </p>
                      <button
                        onClick={handleRefresh}
                        className="mt-1 flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-500"
                      >
                        <HiOutlineArrowPath className="h-3.5 w-3.5" />
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!isLoading && !error && leaveList.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdminOrHR ? 8 : 7}
                    className="px-4 py-16 text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-dark-700/50">
                        <HiOutlineCalendarDays className="h-8 w-8 text-gray-400 dark:text-dark-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          No leave requests found
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                          {statusFilter || typeFilter
                            ? "Try adjusting your filter criteria."
                            : "Apply for your first leave request."}
                        </p>
                      </div>
                      {!statusFilter && !typeFilter && (
                        <button
                          onClick={() => setShowApplyModal(true)}
                          className="mt-1 flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-500"
                        >
                          <HiOutlinePlus className="h-3.5 w-3.5" />
                          Apply for Leave
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Leave request rows */}
              {leaveList.map((leave) => {
                const employeeName = leave.employee
                  ? `${leave.employee.firstName} ${leave.employee.lastName}`
                  : "Unknown";
                const isOwner =
                  leave.employee?.id === userId || leave.employeeId === userId;

                return (
                  <tr
                    key={leave.id}
                    className={cn(
                      "border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-dark-700/30 dark:hover:bg-dark-700/20",
                      isLoading && "opacity-50",
                    )}
                  >
                    {/* Employee (Admin/HR only) */}
                    {isAdminOrHR && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <EmployeeAvatar
                            name={employeeName}
                            avatar={leave.employee?.avatar}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-dark-100">
                              {employeeName}
                            </p>
                            <p className="truncate text-2xs text-gray-400 dark:text-dark-500">
                              {leave.employee?.designation || ""}
                              {leave.employee?.department
                                ? ` · ${leave.employee.department.name}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Leave Type */}
                    <td className="px-4 py-3.5">
                      <LeaveTypeBadge type={leave.leaveType} />
                    </td>

                    {/* Start Date */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-700 dark:text-dark-300 tabular-nums">
                        {formatDate(leave.startDate)}
                      </span>
                    </td>

                    {/* End Date */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-700 dark:text-dark-300 tabular-nums">
                        {formatDate(leave.endDate)}
                      </span>
                    </td>

                    {/* Total Days */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-gray-800 dark:text-dark-200 tabular-nums">
                        {leave.totalDays}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <LeaveStatusBadge status={leave.status} />
                    </td>

                    {/* Reason */}
                    <td className="max-w-[200px] px-4 py-3.5">
                      <p
                        className="truncate text-sm text-gray-500 dark:text-dark-400"
                        title={leave.reason}
                      >
                        {leave.reason}
                      </p>
                      {leave.remarks && (
                        <p
                          className="mt-0.5 truncate text-2xs text-gray-400 dark:text-dark-500 italic"
                          title={leave.remarks}
                        >
                          Remark: {leave.remarks}
                        </p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end">
                        <LeaveActionDropdown
                          leaveId={leave.id}
                          status={leave.status}
                          isOwner={isOwner}
                          isAdminOrHR={isAdminOrHR}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onCancel={handleCancel}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-dark-700/30">
            <span className="text-xs text-gray-500 dark:text-dark-400">
              Showing page{" "}
              <span className="font-medium text-gray-800 dark:text-dark-200">
                {currentPage}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-800 dark:text-dark-200">
                {totalPages}
              </span>{" "}
              ({total} total)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-dark-600 dark:text-dark-400 dark:hover:border-dark-500 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <HiOutlineChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                      page === currentPage
                        ? "bg-primary-600 text-white"
                        : "border border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-900 dark:border-dark-600 dark:text-dark-400 dark:hover:border-dark-500 dark:hover:text-white",
                    )}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-dark-600 dark:text-dark-400 dark:hover:border-dark-500 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <HiOutlineChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Apply Leave Modal                                                 */}
      {/* ================================================================ */}
      <ApplyLeaveModal
        isOpen={showApplyModal}
        isApplying={isApplying}
        onClose={() => setShowApplyModal(false)}
        onSubmit={handleApplyLeave}
      />
    </div>
  );
}

export default LeavePage;
