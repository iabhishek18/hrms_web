// ============================================
// Employee Detail Page — Enhanced Professional UI
// ============================================
// Displays full employee profile information including:
//   - Personal details, employment info, emergency contacts
//   - Department and manager information
//   - Leave balances with visual progress bars
//   - Action buttons for edit/delete (Admin/HR)
//   - Animated transitions and interactive elements
//   - Responsive layout with consistent theme

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import { setPageTitle } from "@/store/slices/uiSlice";
import { employeeApi, EmployeeDetail } from "@/api/employees";
import { cn } from "@/utils/cn";
import {
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineMapPin,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineBriefcase,
  HiOutlineBanknotes,
  HiOutlineUser,
  HiOutlineIdentification,
  HiOutlineShieldCheck,
  HiOutlineExclamationTriangle,
  HiOutlineHeart,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineArrowPath,
} from "react-icons/hi2";

// ============================================
// Status Badge Component
// ============================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { bg: string; text: string; dot: string; label: string }
  > = {
    ACTIVE: {
      bg: "bg-success-500/10",
      text: "text-success-400",
      dot: "bg-success-400",
      label: "Active",
    },
    INACTIVE: {
      bg: "bg-gray-200 dark:bg-dark-700/50",
      text: "text-gray-500 dark:text-dark-400",
      dot: "bg-dark-500",
      label: "Inactive",
    },
    ON_LEAVE: {
      bg: "bg-warning-500/10",
      text: "text-warning-400",
      dot: "bg-warning-400",
      label: "On Leave",
    },
    TERMINATED: {
      bg: "bg-danger-500/10",
      text: "text-danger-400",
      dot: "bg-danger-400",
      label: "Terminated",
    },
    PROBATION: {
      bg: "bg-info-500/10",
      text: "text-info-400",
      dot: "bg-info-400",
      label: "Probation",
    },
  };

  const c = config[status] || config.ACTIVE;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        c.bg,
        c.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

// ============================================
// Role Badge Component
// ============================================

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    ADMIN: {
      bg: "bg-primary-500/10",
      text: "text-primary-400",
      label: "Administrator",
    },
    HR: {
      bg: "bg-accent-500/10",
      text: "text-accent-400",
      label: "HR Manager",
    },
    EMPLOYEE: {
      bg: "bg-success-500/10",
      text: "text-success-400",
      label: "Employee",
    },
  };

  const c = config[role] || config.EMPLOYEE;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        c.bg,
        c.text,
      )}
    >
      {c.label}
    </span>
  );
}

// ============================================
// Info Card Component
// ============================================

function InfoCard({
  title,
  icon: Icon,
  children,
  className,
  delay = 0,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "animate-fade-in-up rounded-xl border border-gray-200 bg-white shadow-card transition-all duration-300 hover:shadow-card-hover dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none dark:hover:shadow-card-dark-hover",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-dark-700/30 px-5 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500/10">
          <Icon className="h-4 w-4 text-primary-500 dark:text-primary-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      </div>
      <div className="space-y-3 px-5 py-4">{children}</div>
    </div>
  );
}

// ============================================
// Info Row Component
// ============================================

function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <span className="flex-shrink-0 text-xs text-gray-400 dark:text-dark-500">
        {label}
      </span>
      <span className="text-right text-sm font-medium text-gray-700 dark:text-dark-200">
        {value || <span className="text-gray-300 dark:text-dark-600">—</span>}
      </span>
    </div>
  );
}

// ============================================
// Leave Balance Card
// ============================================

function LeaveBalanceItem({
  leaveType,
  totalLeaves,
  usedLeaves,
}: {
  leaveType: string;
  totalLeaves: number;
  usedLeaves: number;
}) {
  const remaining = totalLeaves - usedLeaves;
  const percentage = totalLeaves > 0 ? (usedLeaves / totalLeaves) * 100 : 0;

  const typeLabels: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    CASUAL: {
      label: "Casual",
      color: "bg-primary-500",
      bg: "bg-primary-500/10",
    },
    SICK: { label: "Sick", color: "bg-danger-500", bg: "bg-danger-500/10" },
    EARNED: {
      label: "Earned",
      color: "bg-success-500",
      bg: "bg-success-500/10",
    },
    MATERNITY: {
      label: "Maternity",
      color: "bg-accent-500",
      bg: "bg-accent-500/10",
    },
    PATERNITY: {
      label: "Paternity",
      color: "bg-info-500",
      bg: "bg-info-500/10",
    },
    UNPAID: {
      label: "Unpaid",
      color: "bg-warning-500",
      bg: "bg-warning-500/10",
    },
    COMPENSATORY: {
      label: "Comp Off",
      color: "bg-dark-500",
      bg: "bg-dark-500/10",
    },
  };

  const config = typeLabels[leaveType] || {
    label: leaveType,
    color: "bg-dark-500",
    bg: "bg-dark-500/10",
  };

  return (
    <div className="rounded-lg border border-gray-100 dark:border-dark-700/30 bg-gray-50 dark:bg-dark-900/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-dark-300">
          {config.label}
        </span>
        <span className="text-xs text-gray-400 dark:text-dark-500">
          {usedLeaves}/{totalLeaves}
        </span>
      </div>
      {/* Progress bar */}
      <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-700">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            config.color,
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-2xs text-gray-400 dark:text-dark-500">
          Used: {usedLeaves}
        </span>
        <span className="text-2xs font-medium text-gray-600 dark:text-dark-300">
          Remaining: {remaining}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Skeleton Loader
// ============================================

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start gap-6">
        <div className="h-24 w-24 rounded-2xl bg-gray-200 dark:bg-dark-700" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-48 rounded bg-gray-200 dark:bg-dark-700" />
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-dark-700" />
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-dark-700" />
            <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-dark-700" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none p-5"
          >
            <div className="mb-4 h-5 w-32 rounded bg-gray-200 dark:bg-dark-700" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="flex justify-between">
                  <div className="h-4 w-24 rounded bg-gray-200 dark:bg-dark-700" />
                  <div className="h-4 w-32 rounded bg-gray-200 dark:bg-dark-700" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Confirm Delete Modal
// ============================================

function ConfirmDeleteModal({
  isOpen,
  employeeName,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  employeeName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800 p-6 shadow-modal dark:shadow-modal-dark animate-scale-in">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-500/10">
          <HiOutlineExclamationTriangle className="h-6 w-6 text-danger-400" />
        </div>

        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          Delete Employee
        </h3>
        <p className="mb-6 text-sm text-gray-500 dark:text-dark-400">
          Are you sure you want to permanently delete{" "}
          <span className="font-medium text-gray-700 dark:text-dark-200">
            {employeeName}
          </span>
          ? This action cannot be undone and will also delete all associated
          records (attendance, leave requests, documents).
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-gray-300 dark:border-dark-600 bg-dark-700 px-4 py-2 text-sm font-medium text-dark-200 transition-colors hover:bg-dark-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg bg-danger-600 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white transition-colors hover:bg-danger-500 disabled:opacity-50"
          >
            {isDeleting ? (
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
                Deleting...
              </>
            ) : (
              <>
                <HiOutlineTrash className="h-4 w-4" />
                Delete Employee
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Employee Detail Page Component
// ============================================

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const userRole = useAppSelector((state) => state.auth.user?.role);
  const isAdminOrHR = userRole === "ADMIN" || userRole === "HR";
  const isAdmin = userRole === "ADMIN";

  // Local state
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---- Set page title ----
  useEffect(() => {
    dispatch(
      setPageTitle({
        title: "Employee Details",
        subtitle: "Employee Management",
      }),
    );
  }, [dispatch]);

  // ---- Fetch employee data ----
  const fetchEmployee = useCallback(async () => {
    if (!id) {
      setError("Employee ID is required");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await employeeApi.getById(id);
      const data =
        (response as any)?.data?.data || (response as any)?.data || response;
      setEmployee(data);

      // Update page title with employee name
      if (data?.firstName && data?.lastName) {
        dispatch(
          setPageTitle({
            title: `${data.firstName} ${data.lastName}`,
            subtitle: "Employee Details",
          }),
        );
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load employee details";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id, dispatch]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  // ---- Delete handler ----
  const handleDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await employeeApi.delete(id);
      navigate("/employees", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete employee");
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // ---- Format date helper ----
  const formatDate = (dateStr: string | null | undefined): string => {
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
  };

  // ---- Format currency helper ----
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // ---- Avatar ----
  const renderAvatar = () => {
    if (!employee) return null;

    const initials =
      `${employee.firstName?.charAt(0) || ""}${employee.lastName?.charAt(0) || ""}`.toUpperCase();

    if (employee.avatar) {
      return (
        <img
          src={employee.avatar}
          alt={`${employee.firstName} ${employee.lastName}`}
          className="h-full w-full rounded-2xl object-cover"
        />
      );
    }

    // Generate a consistent color based on the name
    let hash = 0;
    const name = `${employee.firstName}${employee.lastName}`;
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

    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center rounded-2xl text-2xl font-bold text-gray-900 dark:text-white",
          colorClass,
        )}
      >
        {initials}
      </div>
    );
  };

  // ---- Loading State ----
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link
            to="/employees"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800 px-3 py-2 text-sm font-medium text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-50 dark:hover:bg-dark-700"
          >
            <HiOutlineArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
        <DetailSkeleton />
      </div>
    );
  }

  // ---- Error State ----
  if (error || !employee) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link
            to="/employees"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800 px-3 py-2 text-sm font-medium text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-50 dark:hover:bg-dark-700"
          >
            <HiOutlineArrowLeft className="h-4 w-4" />
            Back to Employees
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-500/10">
            <HiOutlineExclamationTriangle className="h-8 w-8 text-danger-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-700 dark:text-dark-200">
            {error || "Employee not found"}
          </h3>
          <p className="mb-6 max-w-sm text-center text-sm text-gray-400 dark:text-dark-500">
            The employee record could not be loaded. It may have been deleted or
            you may not have permission to view it.
          </p>
          <button
            onClick={fetchEmployee}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/25"
          >
            <HiOutlineArrowPath className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---- Main Render ----
  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <div className="space-y-6">
      {/* ---- Top Action Bar ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <Link
          to="/employees"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800 px-3 py-2 text-sm font-medium text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-50 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-white self-start"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Back to Employees
        </Link>

        {isAdminOrHR && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => navigate(`/employees/${id}?edit=true`)}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/25"
            >
              <HiOutlinePencilSquare className="h-4 w-4" />
              Edit
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-2 text-sm font-medium text-danger-400 transition-all hover:bg-danger-500/20 hover:shadow-sm"
              >
                <HiOutlineTrash className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---- Employee Header Card with Gradient ---- */}
      <div className="animate-fade-in-up overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none">
        {/* Gradient Banner */}
        <div className="relative h-28 bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute -bottom-2 -left-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-accent-400/20 blur-2xl" />
        </div>

        <div className="relative px-6 pb-6">
          {/* Avatar - overlapping the gradient */}
          <div className="-mt-14 mb-4 flex flex-col items-start gap-6 sm:flex-row sm:items-end">
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl ring-4 ring-white dark:ring-dark-800 shadow-lg">
              {renderAvatar()}
            </div>

            {/* Employee Info */}
            <div className="flex-1 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {fullName}
                </h1>
                <StatusBadge status={employee.status} />
                {employee.user?.role && <RoleBadge role={employee.user.role} />}
              </div>

              <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
                {employee.designation}
              </p>
            </div>
          </div>

          {/* Quick info pills */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-dark-700/50 px-3 py-1.5 text-sm text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700">
              <HiOutlineIdentification className="h-4 w-4 text-gray-400 dark:text-dark-500" />
              <span className="font-mono text-xs">{employee.employeeId}</span>
            </div>
            {employee.department && (
              <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-dark-700/50 px-3 py-1.5 text-sm text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700">
                <HiOutlineBuildingOffice2 className="h-4 w-4 text-gray-400 dark:text-dark-500" />
                <span>{employee.department.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-dark-700/50 px-3 py-1.5 text-sm text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700">
              <HiOutlineEnvelope className="h-4 w-4 text-gray-400 dark:text-dark-500" />
              <a
                href={`mailto:${employee.email}`}
                className="text-xs text-primary-500 hover:text-primary-400 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {employee.email}
              </a>
            </div>
            {employee.phone && (
              <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-dark-700/50 px-3 py-1.5 text-sm text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700">
                <HiOutlinePhone className="h-4 w-4 text-gray-400 dark:text-dark-500" />
                <span className="text-xs">{employee.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-dark-700/50 px-3 py-1.5 text-sm text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700">
              <HiOutlineCalendarDays className="h-4 w-4 text-gray-400 dark:text-dark-500" />
              <span className="text-xs">
                Joined {formatDate(employee.joiningDate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Info Cards Grid ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <InfoCard title="Personal Information" icon={HiOutlineUser}>
          <InfoRow label="Full Name" value={fullName} />
          <InfoRow label="Email" value={employee.email} />
          <InfoRow label="Phone" value={employee.phone} />
          <InfoRow
            label="Date of Birth"
            value={formatDate(employee.dateOfBirth)}
          />
          <InfoRow
            label="Gender"
            value={
              employee.gender
                ? employee.gender.charAt(0) +
                  employee.gender.slice(1).toLowerCase()
                : null
            }
          />
          <InfoRow
            label="Marital Status"
            value={
              employee.maritalStatus
                ? employee.maritalStatus.charAt(0) +
                  employee.maritalStatus.slice(1).toLowerCase()
                : null
            }
          />
        </InfoCard>

        {/* Employment Details */}
        <InfoCard title="Employment Details" icon={HiOutlineBriefcase}>
          <InfoRow label="Employee ID" value={employee.employeeId} />
          <InfoRow label="Designation" value={employee.designation} />
          <InfoRow
            label="Department"
            value={employee.department?.name || "Unassigned"}
          />
          <InfoRow
            label="Manager"
            value={
              employee.manager
                ? `${employee.manager.firstName} ${employee.manager.lastName}`
                : null
            }
          />
          <InfoRow label="Employment Type" value={employee.employmentType} />
          <InfoRow
            label="Joining Date"
            value={formatDate(employee.joiningDate)}
          />
          <InfoRow
            label="Confirmation Date"
            value={formatDate(employee.confirmationDate)}
          />
          <InfoRow
            label="Status"
            value={<StatusBadge status={employee.status} />}
          />
        </InfoCard>

        {/* Address */}
        <InfoCard title="Address" icon={HiOutlineMapPin}>
          <InfoRow label="Address" value={employee.address} />
          <InfoRow label="City" value={employee.city} />
          <InfoRow label="State" value={employee.state} />
          <InfoRow label="Country" value={employee.country} />
          <InfoRow label="Zip Code" value={employee.zipCode} />
        </InfoCard>

        {/* Financial Information */}
        <InfoCard title="Financial Information" icon={HiOutlineBanknotes}>
          <InfoRow label="Salary" value={formatCurrency(employee.salary)} />
          <InfoRow label="Bank Name" value={employee.bankName} />
          <InfoRow
            label="Account Number"
            value={
              employee.bankAccountNo
                ? `****${employee.bankAccountNo.slice(-4)}`
                : null
            }
          />
          <InfoRow label="IFSC Code" value={employee.bankIfscCode} />
        </InfoCard>

        {/* Emergency Contact */}
        <InfoCard title="Emergency Contact" icon={HiOutlineHeart}>
          <InfoRow label="Contact Name" value={employee.emergencyContactName} />
          <InfoRow
            label="Contact Phone"
            value={employee.emergencyContactPhone}
          />
          <InfoRow
            label="Relationship"
            value={employee.emergencyContactRelation}
          />
        </InfoCard>

        {/* Account Information */}
        <InfoCard title="Account Information" icon={HiOutlineShieldCheck}>
          <InfoRow
            label="Account Status"
            value={
              employee.user ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium",
                    employee.user.isActive
                      ? "text-success-400"
                      : "text-danger-400",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      employee.user.isActive
                        ? "bg-success-400"
                        : "bg-danger-400",
                    )}
                  />
                  {employee.user.isActive ? "Active" : "Inactive"}
                </span>
              ) : (
                <span className="text-gray-400 dark:text-dark-500 text-xs">
                  No user account
                </span>
              )
            }
          />
          {employee.user && (
            <>
              <InfoRow
                label="Role"
                value={<RoleBadge role={employee.user.role} />}
              />
              <InfoRow
                label="Last Login"
                value={
                  employee.user.lastLogin
                    ? formatDate(employee.user.lastLogin)
                    : "Never"
                }
              />
              <InfoRow label="Login Email" value={employee.user.email} />
            </>
          )}
          <InfoRow
            label="Record Created"
            value={formatDate(employee.createdAt)}
          />
          <InfoRow
            label="Last Updated"
            value={formatDate(employee.updatedAt)}
          />
        </InfoCard>
      </div>

      {/* ---- Leave Balances ---- */}
      {employee.leaveBalances && employee.leaveBalances.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-500/10">
              <HiOutlineClock className="h-4 w-4 text-warning-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-100">
              Leave Balances ({new Date().getFullYear()})
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {employee.leaveBalances.map((balance) => (
              <LeaveBalanceItem
                key={balance.leaveType}
                leaveType={balance.leaveType}
                totalLeaves={balance.totalLeaves}
                usedLeaves={balance.usedLeaves}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- Quick Actions ---- */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-500/10">
            <HiOutlineDocumentText className="h-4 w-4 text-info-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-100">
            Quick Actions
          </h3>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/attendance?employeeId=${id}`}
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-dark-700 bg-dark-900/50 px-4 py-2.5 text-sm font-medium text-dark-300 transition-colors hover:bg-dark-700 hover:text-gray-900 dark:text-dark-100"
          >
            <HiOutlineClock className="h-4 w-4" />
            View Attendance
          </Link>
          <Link
            to={`/leave?employeeId=${id}`}
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-dark-700 bg-dark-900/50 px-4 py-2.5 text-sm font-medium text-dark-300 transition-colors hover:bg-dark-700 hover:text-gray-900 dark:text-dark-100"
          >
            <HiOutlineCalendarDays className="h-4 w-4" />
            View Leave Requests
          </Link>
          {employee.email && (
            <a
              href={`mailto:${employee.email}`}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-dark-700 bg-dark-900/50 px-4 py-2.5 text-sm font-medium text-dark-300 transition-colors hover:bg-dark-700 hover:text-gray-900 dark:text-dark-100"
            >
              <HiOutlineEnvelope className="h-4 w-4" />
              Send Email
            </a>
          )}
          {employee.phone && (
            <a
              href={`tel:${employee.phone}`}
              className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-dark-700 bg-dark-900/50 px-4 py-2.5 text-sm font-medium text-dark-300 transition-colors hover:bg-dark-700 hover:text-gray-900 dark:text-dark-100"
            >
              <HiOutlinePhone className="h-4 w-4" />
              Call
            </a>
          )}
        </div>
      </div>

      {/* ---- Delete Confirmation Modal ---- */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        employeeName={fullName}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}

export default EmployeeDetailPage;
