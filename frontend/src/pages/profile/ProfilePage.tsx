// ============================================
// Profile Page — Enhanced Professional UI
// ============================================
// Displays and allows editing of the current user's profile.
// Features:
//   - Profile overview with avatar, name, role
//   - Personal information display and edit
//   - Password change form
//   - Dark theme matching the reference dashboard

import { useEffect, useState, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import { setPageTitle } from "@/store/slices/uiSlice";
import { authApi } from "@/api/auth";
import { cn } from "@/utils/cn";
import toast from "react-hot-toast";
import {
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineBuildingOffice2,
  HiOutlineBriefcase,
  HiOutlineCalendarDays,
  HiOutlineIdentification,
  HiOutlineMapPin,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineArrowPath,
  HiOutlinePencilSquare,
  HiOutlineXMark,
  HiOutlineClock,
  HiOutlineHeart,
} from "react-icons/hi2";

// ============================================
// Types
// ============================================

interface UserProfile {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    maritalStatus: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    zipCode: string | null;
    avatar: string | null;
    designation: string;
    status: string;
    joiningDate: string;
    employmentType: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelation: string | null;
    department: {
      id: string;
      name: string;
      code: string;
    } | null;
    manager: {
      id: string;
      firstName: string;
      lastName: string;
      designation: string;
    } | null;
    leaveBalances?: Array<{
      leaveType: string;
      totalLeaves: number;
      usedLeaves: number;
    }>;
  } | null;
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

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
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
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        c.bg,
        c.text,
      )}
    >
      {c.label}
    </span>
  );
}

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
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex items-center gap-2 text-xs text-gray-400 dark:text-dark-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="text-right text-sm font-medium text-gray-700 dark:text-dark-200">
        {value || <span className="text-gray-300 dark:text-dark-600">—</span>}
      </span>
    </div>
  );
}

// ============================================
// Leave Balance Item
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

  const typeLabels: Record<string, { label: string; color: string }> = {
    CASUAL: { label: "Casual", color: "bg-primary-500" },
    SICK: { label: "Sick", color: "bg-danger-500" },
    EARNED: { label: "Earned", color: "bg-success-500" },
    MATERNITY: { label: "Maternity", color: "bg-accent-500" },
    PATERNITY: { label: "Paternity", color: "bg-info-500" },
    UNPAID: { label: "Unpaid", color: "bg-warning-500" },
    COMPENSATORY: { label: "Comp Off", color: "bg-dark-500" },
  };

  const config = typeLabels[leaveType] || {
    label: leaveType,
    color: "bg-dark-500",
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
// Password Change Form Component
// ============================================

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!currentPassword)
      newErrors.currentPassword = "Current password is required";
    if (!newPassword) newErrors.newPassword = "New password is required";
    if (newPassword.length < 8)
      newErrors.newPassword = "Password must be at least 8 characters";
    if (!confirmPassword)
      newErrors.confirmPassword = "Please confirm your new password";
    if (newPassword !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    if (currentPassword === newPassword)
      newErrors.newPassword =
        "New password must be different from current password";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      setSuccess(false);

      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      });

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully! Please log in again.");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change password";
      setErrors({ root: message });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Root error */}
      {errors.root && (
        <div className="flex items-start gap-2 rounded-lg border border-danger-500/20 bg-danger-500/10 px-3 py-2.5">
          <HiOutlineExclamationCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger-400" />
          <p className="text-xs text-danger-400">{errors.root}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-success-500/20 bg-success-500/10 px-3 py-2.5">
          <HiOutlineCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-success-400" />
          <p className="text-xs text-success-400">
            Password changed successfully. You may need to log in again.
          </p>
        </div>
      )}

      {/* Current Password */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-dark-300">
          Current Password
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <HiOutlineLockClosed className="h-4 w-4 text-gray-400 dark:text-dark-500" />
          </div>
          <input
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              if (errors.currentPassword)
                setErrors({ ...errors, currentPassword: "" });
            }}
            placeholder="Enter current password"
            className={cn(
              "w-full rounded-xl border bg-gray-50 dark:bg-dark-900/50 py-2.5 pl-9 pr-10 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-dark-500 outline-none transition-all",
              "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
              errors.currentPassword
                ? "border-danger-500/50"
                : "border-gray-300 dark:border-dark-700",
            )}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:text-dark-300"
            tabIndex={-1}
          >
            {showCurrent ? (
              <HiOutlineEyeSlash className="h-4 w-4" />
            ) : (
              <HiOutlineEye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.currentPassword && (
          <p className="mt-1 text-2xs text-danger-400">
            {errors.currentPassword}
          </p>
        )}
      </div>

      {/* New Password */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-dark-300">
          New Password
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <HiOutlineLockClosed className="h-4 w-4 text-gray-400 dark:text-dark-500" />
          </div>
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errors.newPassword) setErrors({ ...errors, newPassword: "" });
            }}
            placeholder="Enter new password"
            className={cn(
              "w-full rounded-xl border bg-gray-50 dark:bg-dark-900/50 py-2.5 pl-9 pr-10 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-dark-500 outline-none transition-all",
              "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
              errors.newPassword
                ? "border-danger-500/50"
                : "border-gray-300 dark:border-dark-700",
            )}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:text-dark-300"
            tabIndex={-1}
          >
            {showNew ? (
              <HiOutlineEyeSlash className="h-4 w-4" />
            ) : (
              <HiOutlineEye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.newPassword && (
          <p className="mt-1 text-2xs text-danger-400">{errors.newPassword}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-dark-300">
          Confirm New Password
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <HiOutlineLockClosed className="h-4 w-4 text-gray-400 dark:text-dark-500" />
          </div>
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword)
                setErrors({ ...errors, confirmPassword: "" });
            }}
            placeholder="Confirm new password"
            className={cn(
              "w-full rounded-xl border bg-gray-50 dark:bg-dark-900/50 py-2.5 pl-9 pr-10 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-dark-500 outline-none transition-all",
              "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
              errors.confirmPassword
                ? "border-danger-500/50"
                : "border-gray-300 dark:border-dark-700",
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:text-dark-300"
            tabIndex={-1}
          >
            {showConfirm ? (
              <HiOutlineEyeSlash className="h-4 w-4" />
            ) : (
              <HiOutlineEye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-2xs text-danger-400">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors",
            "hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50",
          )}
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
              Changing Password...
            </>
          ) : (
            <>
              <HiOutlineLockClosed className="h-4 w-4" />
              Change Password
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ============================================
// Skeleton Loader
// ============================================

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none p-6">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-2xl bg-gray-200 dark:bg-dark-700" />
          <div className="space-y-3">
            <div className="h-7 w-48 rounded bg-gray-200 dark:bg-dark-700" />
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-dark-700" />
            <div className="flex gap-2">
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-dark-700" />
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-dark-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
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
// Profile Page Component
// ============================================

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  // State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "security">(
    "overview",
  );

  // Set page title
  useEffect(() => {
    dispatch(setPageTitle({ title: "Profile", subtitle: "My Profile" }));
  }, [dispatch]);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authApi.me();
      const data =
        (response as any)?.data?.data || (response as any)?.data || response;
      setProfile(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load profile";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Avatar render
  const renderAvatar = () => {
    const employee = profile?.employee;
    if (!employee) {
      const initial = profile?.email?.charAt(0)?.toUpperCase() || "?";
      return (
        <div className="flex h-full w-full items-center justify-center rounded-2xl bg-primary-600 text-3xl font-bold text-gray-900 dark:text-white">
          {initial}
        </div>
      );
    }

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
          "flex h-full w-full items-center justify-center rounded-2xl text-3xl font-bold text-gray-900 dark:text-white",
          colorClass,
        )}
      >
        {initials}
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return <ProfileSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none py-20">
        <HiOutlineExclamationCircle className="mb-4 h-12 w-12 text-danger-400" />
        <h3 className="mb-2 text-lg font-semibold text-gray-700 dark:text-dark-200">
          Failed to load profile
        </h3>
        <p className="mb-6 text-sm text-gray-400 dark:text-dark-500">{error}</p>
        <button
          onClick={fetchProfile}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-500/25"
        >
          <HiOutlineArrowPath className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  const employee = profile?.employee;
  const fullName = employee
    ? `${employee.firstName} ${employee.lastName}`.trim()
    : profile?.email === "admin@hrms.com"
      ? "Abhishek Mishra"
      : profile?.email || "User";

  return (
    <div className="space-y-6">
      {/* ---- Profile Header Card with Gradient ---- */}
      <div className="animate-fade-in-up overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none">
        {/* Gradient Banner */}
        <div className="relative h-32 bg-gradient-to-r from-primary-600 via-accent-500 to-primary-700">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-accent-400/20 blur-2xl" />
        </div>

        <div className="relative px-6 pb-6">
          {/* Avatar - overlapping the gradient */}
          <div className="-mt-14 mb-4 flex flex-col items-start gap-6 sm:flex-row sm:items-end">
            <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl ring-4 ring-white dark:ring-dark-800 shadow-lg">
              {renderAvatar()}
            </div>

            {/* Info */}
            <div className="flex-1 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {fullName}
                </h1>
                {profile?.role && <RoleBadge role={profile.role} />}
                {employee?.status && <StatusBadge status={employee.status} />}
              </div>

              {employee?.designation && (
                <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
                  {employee.designation}
                </p>
              )}
            </div>
          </div>

          {/* Quick info pills */}
          <div className="flex flex-wrap gap-3">
            {employee?.employeeId && (
              <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-dark-700/50 px-3 py-1.5 text-sm text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700">
                <HiOutlineIdentification className="h-4 w-4 text-gray-400 dark:text-dark-500" />
                <span className="font-mono text-xs">{employee.employeeId}</span>
              </div>
            )}
            {employee?.department && (
              <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-dark-700/50 px-3 py-1.5 text-sm text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700">
                <HiOutlineBuildingOffice2 className="h-4 w-4 text-gray-400 dark:text-dark-500" />
                <span className="text-xs">{employee.department.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-dark-700/50 px-3 py-1.5 text-sm text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700">
              <HiOutlineEnvelope className="h-4 w-4 text-gray-400 dark:text-dark-500" />
              <span className="text-xs">{profile?.email}</span>
            </div>
            {employee?.phone && (
              <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-dark-700/50 px-3 py-1.5 text-sm text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700">
                <HiOutlinePhone className="h-4 w-4 text-gray-400 dark:text-dark-500" />
                <span className="text-xs">{employee.phone}</span>
              </div>
            )}
            {employee?.joiningDate && (
              <div className="flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-dark-700/50 px-3 py-1.5 text-sm text-gray-600 dark:text-dark-300 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700">
                <HiOutlineCalendarDays className="h-4 w-4 text-gray-400 dark:text-dark-500" />
                <span className="text-xs">
                  Joined {formatDate(employee.joiningDate)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Tab Navigation ---- */}
      <div
        className="flex gap-1 rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none p-1 animate-fade-in-up"
        style={{ animationDelay: "50ms" }}
      >
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "overview"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-500 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-700 dark:hover:text-dark-200",
          )}
        >
          <HiOutlineUser className="h-4 w-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "security"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-500 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-700 dark:hover:text-dark-200",
          )}
        >
          <HiOutlineShieldCheck className="h-4 w-4" />
          Security
        </button>
      </div>

      {/* ---- Tab Content ---- */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-in">
          {/* Info Cards Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Personal Information */}
            <InfoCard title="Personal Information" icon={HiOutlineUser}>
              <InfoRow label="Full Name" value={fullName} />
              <InfoRow
                label="Email"
                value={profile?.email}
                icon={HiOutlineEnvelope}
              />
              <InfoRow
                label="Phone"
                value={employee?.phone}
                icon={HiOutlinePhone}
              />
              <InfoRow
                label="Date of Birth"
                value={formatDate(employee?.dateOfBirth)}
                icon={HiOutlineCalendarDays}
              />
              <InfoRow
                label="Gender"
                value={
                  employee?.gender
                    ? employee.gender.charAt(0) +
                      employee.gender.slice(1).toLowerCase()
                    : null
                }
              />
              <InfoRow
                label="Marital Status"
                value={
                  employee?.maritalStatus
                    ? employee.maritalStatus.charAt(0) +
                      employee.maritalStatus.slice(1).toLowerCase()
                    : null
                }
              />
            </InfoCard>

            {/* Employment Details */}
            <InfoCard title="Employment Details" icon={HiOutlineBriefcase}>
              <InfoRow
                label="Employee ID"
                value={
                  employee?.employeeId ? (
                    <span className="font-mono">{employee.employeeId}</span>
                  ) : null
                }
                icon={HiOutlineIdentification}
              />
              <InfoRow
                label="Designation"
                value={employee?.designation}
                icon={HiOutlineBriefcase}
              />
              <InfoRow
                label="Department"
                value={employee?.department?.name || "Unassigned"}
                icon={HiOutlineBuildingOffice2}
              />
              <InfoRow
                label="Manager"
                value={
                  employee?.manager
                    ? `${employee.manager.firstName} ${employee.manager.lastName}`
                    : null
                }
              />
              <InfoRow
                label="Employment Type"
                value={employee?.employmentType}
              />
              <InfoRow
                label="Joining Date"
                value={formatDate(employee?.joiningDate)}
                icon={HiOutlineCalendarDays}
              />
              <InfoRow
                label="Status"
                value={
                  employee?.status ? (
                    <StatusBadge status={employee.status} />
                  ) : null
                }
              />
            </InfoCard>

            {/* Address */}
            <InfoCard title="Address" icon={HiOutlineMapPin}>
              <InfoRow label="Address" value={employee?.address} />
              <InfoRow label="City" value={employee?.city} />
              <InfoRow label="State" value={employee?.state} />
              <InfoRow label="Country" value={employee?.country} />
              <InfoRow label="Zip Code" value={employee?.zipCode} />
            </InfoCard>

            {/* Emergency Contact */}
            <InfoCard title="Emergency Contact" icon={HiOutlineHeart}>
              <InfoRow
                label="Contact Name"
                value={employee?.emergencyContactName}
              />
              <InfoRow
                label="Contact Phone"
                value={employee?.emergencyContactPhone}
                icon={HiOutlinePhone}
              />
              <InfoRow
                label="Relationship"
                value={employee?.emergencyContactRelation}
              />
            </InfoCard>
          </div>

          {/* Leave Balances */}
          {employee?.leaveBalances && employee.leaveBalances.length > 0 && (
            <InfoCard title="Leave Balances" icon={HiOutlineClock}>
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
            </InfoCard>
          )}

          {/* Account Information */}
          <InfoCard title="Account Information" icon={HiOutlineShieldCheck}>
            <InfoRow
              label="Role"
              value={profile?.role ? <RoleBadge role={profile.role} /> : null}
            />
            <InfoRow
              label="Account Status"
              value={
                profile?.isActive ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-danger-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-danger-400" />
                    Inactive
                  </span>
                )
              }
            />
            <InfoRow
              label="Last Login"
              value={formatDateTime(profile?.lastLogin)}
            />
            <InfoRow
              label="Account Created"
              value={formatDate(profile?.createdAt)}
            />
          </InfoCard>
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-6 animate-fade-in">
          {/* Change Password */}
          <InfoCard title="Change Password" icon={HiOutlineLockClosed}>
            <p className="mb-4 text-xs text-gray-400 dark:text-dark-500">
              Use the form below to change your password. After changing your
              password, you may need to log in again on all devices.
            </p>
            <PasswordChangeForm />
          </InfoCard>

          {/* Security Info */}
          <InfoCard title="Security Information" icon={HiOutlineShieldCheck}>
            <InfoRow
              label="Two-Factor Authentication"
              value={
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-dark-500">
                  <HiOutlineXMark className="h-3.5 w-3.5" />
                  Not enabled
                </span>
              }
            />
            <InfoRow label="Last Password Change" value="Not tracked" />
            <InfoRow label="Active Sessions" value="1 device" />
            <InfoRow label="Login Method" value="Email & Password" />
          </InfoCard>

          {/* Tip */}
          <div className="flex items-start gap-3 rounded-xl border border-info-500/20 bg-info-500/5 px-4 py-3.5">
            <HiOutlineShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-info-400" />
            <div>
              <p className="text-sm font-medium text-info-400">Security Tips</p>
              <ul className="mt-1.5 space-y-1 text-xs text-info-400/80">
                <li>
                  • Use a strong, unique password with at least 8 characters
                </li>
                <li>
                  • Include uppercase, lowercase, numbers, and special
                  characters
                </li>
                <li>• Never share your password with anyone</li>
                <li>• Change your password regularly for better security</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
