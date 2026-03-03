// ============================================
// Employee List Page
// ============================================
// Displays a paginated, searchable, filterable table of employees.
// Features:
//   - Search across name, email, designation, employee ID
//   - Filter by department, status, employment type
//   - Sort by any column
//   - Pagination with page size control
//   - Add new employee button (Admin/HR only)
//   - View, edit, delete actions per row
//   - Status badges with color coding
//   - Responsive table with horizontal scroll on mobile
//   - Loading skeletons and empty state

import { useEffect, useCallback, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import {
  fetchEmployees,
  deleteEmployee,
  setCurrentPage,
  setPageSize,
  setFilter,
  resetFilters,
  clearErrors,
  clearSuccessFlags,
  selectEmployeeList,
  selectEmployeeMeta,
  selectEmployeeCurrentPage,
  selectEmployeePageSize,
  selectEmployeeFilters,
  selectEmployeesLoading,
  selectEmployeeError,
  selectIsDeleting,
  selectDeleteSuccess,
  selectHasActiveFilters,
} from "@/store/slices/employeeSlice";
import { setPageTitle } from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineFunnel,
  HiOutlineXMark,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronUpDown,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineUsers,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineEllipsisVertical,
  HiOutlineBuildingOffice2,
  HiOutlineAdjustmentsHorizontal,
} from "react-icons/hi2";

// ============================================
// Types
// ============================================

interface ConfirmDeleteState {
  isOpen: boolean;
  employeeId: string | null;
  employeeName: string;
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
      bg: "bg-dark-500/10",
      text: "text-gray-500 dark:text-dark-400",
      dot: "bg-dark-400",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-medium",
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
// Avatar Component
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

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white",
        colorClass,
      )}
    >
      {initials}
    </div>
  );
}

// ============================================
// Skeleton Row Component
// ============================================

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-100 dark:border-dark-700/30">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-dark-700" />
          <div>
            <div className="mb-1 h-3.5 w-28 rounded bg-gray-200 dark:bg-dark-700" />
            <div className="h-2.5 w-20 rounded bg-gray-200 dark:bg-dark-700" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-16 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-20 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-dark-700" />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex gap-2">
          <div className="h-7 w-7 rounded bg-gray-200 dark:bg-dark-700" />
          <div className="h-7 w-7 rounded bg-gray-200 dark:bg-dark-700" />
          <div className="h-7 w-7 rounded bg-gray-200 dark:bg-dark-700" />
        </div>
      </td>
    </tr>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-overlay-show"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-dark-700 shadow-modal dark:bg-dark-800 dark:shadow-modal-dark animate-content-show">
        <div className="p-6">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-500/10">
            <HiOutlineExclamationTriangle className="h-7 w-7 text-danger-400" />
          </div>

          {/* Content */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delete Employee
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-dark-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {employeeName}
              </span>
              ? This action cannot be undone. All associated data including
              attendance records, leave requests, and documents will be
              permanently removed.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 rounded-xl border border-gray-300 dark:border-dark-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-dark-300 transition-colors hover:border-gray-400 hover:text-gray-900 dark:hover:border-dark-500 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-danger-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
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
    </div>
  );
}

// ============================================
// Filter Panel Component
// ============================================

function FilterPanel({
  isOpen,
  filters,
  onFilterChange,
  onReset,
  onClose,
}: {
  isOpen: boolean;
  filters: {
    departmentId: string;
    status: string;
    employmentType: string;
    gender: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const statuses = [
    { value: "", label: "All Statuses" },
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "ON_LEAVE", label: "On Leave" },
    { value: "TERMINATED", label: "Terminated" },
    { value: "PROBATION", label: "Probation" },
  ];

  const employmentTypes = [
    { value: "", label: "All Types" },
    { value: "Full-Time", label: "Full-Time" },
    { value: "Part-Time", label: "Part-Time" },
    { value: "Contract", label: "Contract" },
    { value: "Intern", label: "Intern" },
  ];

  const genders = [
    { value: "", label: "All Genders" },
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHER", label: "Other" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none p-4 animate-fade-in-down">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Filters
        </h4>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-500 dark:text-dark-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-700 dark:hover:text-dark-200"
        >
          <HiOutlineXMark className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Status Filter */}
        <div>
          <label className="mb-1 block text-2xs font-medium text-gray-500 dark:text-dark-400">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange("status", e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-dark-600 bg-gray-200 px-3 py-2 text-sm text-gray-700 dark:bg-dark-700/50 dark:text-dark-200 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Employment Type Filter */}
        <div>
          <label className="mb-1 block text-2xs font-medium text-gray-500 dark:text-dark-400">
            Employment Type
          </label>
          <select
            value={filters.employmentType}
            onChange={(e) => onFilterChange("employmentType", e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-dark-600 bg-gray-200 px-3 py-2 text-sm text-gray-700 dark:bg-dark-700/50 dark:text-dark-200 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
          >
            {employmentTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Gender Filter */}
        <div>
          <label className="mb-1 block text-2xs font-medium text-gray-500 dark:text-dark-400">
            Gender
          </label>
          <select
            value={filters.gender}
            onChange={(e) => onFilterChange("gender", e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-dark-600 bg-gray-200 px-3 py-2 text-sm text-gray-700 dark:bg-dark-700/50 dark:text-dark-200 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20"
          >
            {genders.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filters */}
        <div className="flex items-end">
          <button
            onClick={onReset}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-dark-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-dark-300 transition-colors hover:border-gray-400 hover:text-gray-900 dark:hover:border-dark-500 dark:hover:text-white"
          >
            <HiOutlineXMark className="h-3.5 w-3.5" />
            Reset All
          </button>
        </div>
      </div>
    </div>
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
  onPageSizeChange,
}: {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  // Calculate visible page numbers
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [1];

    if (currentPage > 3) {
      pages.push("ellipsis");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("ellipsis");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      {/* Showing X of Y */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-dark-400">
          Showing{" "}
          <span className="font-medium text-gray-700 dark:text-dark-200">
            {startItem}-{endItem}
          </span>{" "}
          of{" "}
          <span className="font-medium text-gray-700 dark:text-dark-200">
            {total}
          </span>{" "}
          employees
        </span>

        {/* Page size selector */}
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-md border border-gray-300 dark:border-dark-600 bg-gray-200 px-2 py-1 text-xs text-gray-600 dark:bg-dark-700/50 dark:text-dark-300 outline-none focus:border-primary-500"
        >
          {[5, 10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 dark:border-dark-600 text-gray-500 dark:text-dark-400 transition-colors hover:border-gray-400 hover:text-gray-900 dark:hover:border-dark-500 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <HiOutlineChevronLeft className="h-3.5 w-3.5" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) => {
          if (page === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex h-8 w-8 items-center justify-center text-xs text-gray-400 dark:text-dark-500"
              >
                …
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                page === currentPage
                  ? "bg-primary-600 text-white"
                  : "border border-gray-300 dark:border-dark-600 text-gray-500 dark:text-dark-400 hover:border-gray-400 hover:text-gray-900 dark:hover:border-dark-500 dark:hover:text-white",
              )}
            >
              {page}
            </button>
          );
        })}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 dark:border-dark-600 text-gray-500 dark:text-dark-400 transition-colors hover:border-gray-400 hover:text-gray-900 dark:hover:border-dark-500 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <HiOutlineChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ============================================
// Sort Header Component
// ============================================

function SortHeader({
  label,
  field,
  currentSortBy,
  currentSortOrder,
  onSort,
}: {
  label: string;
  field: string;
  currentSortBy: string;
  currentSortOrder: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const isActive = currentSortBy === field;

  return (
    <button
      onClick={() => onSort(field)}
      className="group inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400 transition-colors hover:text-gray-700 dark:hover:text-dark-200"
    >
      {label}
      <span className="ml-0.5">
        {isActive ? (
          currentSortOrder === "asc" ? (
            <HiOutlineChevronUp className="h-3 w-3 text-primary-400" />
          ) : (
            <HiOutlineChevronDown className="h-3 w-3 text-primary-400" />
          )
        ) : (
          <HiOutlineChevronUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </span>
    </button>
  );
}

// ============================================
// Action Dropdown Component
// ============================================

function ActionDropdown({
  onView,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-md p-1.5 text-gray-400 dark:text-dark-500 transition-colors hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-600 dark:hover:text-dark-300"
      >
        <HiOutlineEllipsisVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800 py-1 shadow-dropdown-dark animate-scale-in">
            <button
              onClick={() => {
                setIsOpen(false);
                onView();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-dark-300 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-dark-700 dark:hover:text-white"
            >
              <HiOutlineEye className="h-4 w-4" />
              View Details
            </button>
            {canEdit && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-dark-300 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-dark-700 dark:hover:text-white"
              >
                <HiOutlinePencilSquare className="h-4 w-4" />
                Edit
              </button>
            )}
            {canDelete && (
              <>
                <div className="mx-2 my-1 h-px bg-gray-200 dark:bg-dark-700" />
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onDelete();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-400 transition-colors hover:bg-danger-500/10"
                >
                  <HiOutlineTrash className="h-4 w-4" />
                  Delete
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
// Employee List Page Component
// ============================================

export function EmployeeListPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Redux state
  const employees = useAppSelector(selectEmployeeList);
  const meta = useAppSelector(selectEmployeeMeta);
  const currentPage = useAppSelector(selectEmployeeCurrentPage);
  const pageSize = useAppSelector(selectEmployeePageSize);
  const filters = useAppSelector(selectEmployeeFilters);
  const isLoading = useAppSelector(selectEmployeesLoading);
  const error = useAppSelector(selectEmployeeError);
  const isDeleting = useAppSelector(selectIsDeleting);
  const deleteSuccess = useAppSelector(selectDeleteSuccess);
  const hasActiveFilters = useAppSelector(selectHasActiveFilters);
  const userRole = useAppSelector((state) => state.auth.user?.role);

  const isAdminOrHR = userRole === "ADMIN" || userRole === "HR";
  const isAdmin = userRole === "ADMIN";

  // Local state
  const [searchInput, setSearchInput] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({
    isOpen: false,
    employeeId: null,
    employeeName: "",
  });

  // Debounced search timer ref
  const [searchTimer, setSearchTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  // ---- Set Page Title ----
  useEffect(() => {
    dispatch(
      setPageTitle({ title: "Employees", subtitle: "Employee Management" }),
    );
  }, [dispatch]);

  // ---- Fetch employees on mount and when filters/pagination change ----
  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch, currentPage, pageSize, filters]);

  // ---- Handle delete success ----
  useEffect(() => {
    if (deleteSuccess) {
      setConfirmDelete({ isOpen: false, employeeId: null, employeeName: "" });
      dispatch(clearSuccessFlags());
      // Refetch the current page
      dispatch(fetchEmployees());
    }
  }, [deleteSuccess, dispatch]);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      dispatch(clearErrors());
      dispatch(clearSuccessFlags());
    };
  }, [dispatch]);

  // ---- Handlers ----

  // Search with debounce
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);

      // Clear previous timer
      if (searchTimer) {
        clearTimeout(searchTimer);
      }

      // Set new timer (300ms debounce)
      const timer = setTimeout(() => {
        dispatch(setFilter({ key: "search", value }));
      }, 300);

      setSearchTimer(timer);
    },
    [dispatch, searchTimer],
  );

  // Filter change
  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      dispatch(setFilter({ key: key as any, value }));
    },
    [dispatch],
  );

  // Reset filters
  const handleResetFilters = useCallback(() => {
    dispatch(resetFilters());
    setSearchInput("");
    setShowFilters(false);
  }, [dispatch]);

  // Sort handler
  const handleSort = useCallback(
    (field: string) => {
      if (filters.sortBy === field) {
        // Toggle sort order
        dispatch(
          setFilter({
            key: "sortOrder",
            value: filters.sortOrder === "asc" ? "desc" : "asc",
          }),
        );
      } else {
        dispatch(setFilter({ key: "sortBy", value: field }));
        dispatch(setFilter({ key: "sortOrder", value: "asc" }));
      }
    },
    [dispatch, filters.sortBy, filters.sortOrder],
  );

  // Pagination handlers
  const handlePageChange = useCallback(
    (page: number) => {
      dispatch(setCurrentPage(page));
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [dispatch],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      dispatch(setPageSize(size));
    },
    [dispatch],
  );

  // Navigation handlers
  const handleViewEmployee = useCallback(
    (id: string) => {
      navigate(`/employees/${id}`);
    },
    [navigate],
  );

  const handleEditEmployee = useCallback(
    (id: string) => {
      navigate(`/employees/${id}/edit`);
    },
    [navigate],
  );

  const handleAddEmployee = useCallback(() => {
    navigate("/employees/new");
  }, [navigate]);

  // Delete handlers
  const handleDeleteClick = useCallback((id: string, name: string) => {
    setConfirmDelete({
      isOpen: true,
      employeeId: id,
      employeeName: name,
    });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (confirmDelete.employeeId) {
      dispatch(deleteEmployee(confirmDelete.employeeId));
    }
  }, [dispatch, confirmDelete.employeeId]);

  const handleCancelDelete = useCallback(() => {
    setConfirmDelete({ isOpen: false, employeeId: null, employeeName: "" });
  }, []);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  // Format date helper
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
  const activeFilterCount = [
    filters.departmentId,
    filters.status,
    filters.employmentType,
    filters.gender,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ================================================================ */}
      {/* Page Header                                                       */}
      {/* ================================================================ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            Employees
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-400">
            Manage your team members and their information
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white dark:border-dark-700 dark:bg-dark-800 px-3 py-2 text-sm font-medium text-gray-600 dark:text-dark-300 transition-colors hover:border-gray-400 hover:text-gray-900 dark:hover:border-dark-600 dark:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <HiOutlineArrowPath
              className={cn("h-4 w-4", isLoading && "animate-spin")}
            />
          </button>

          {/* Add Employee button (Admin/HR only) */}
          {isAdminOrHR && (
            <button
              onClick={handleAddEmployee}
              className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-500 hover:shadow-primary-500/30"
            >
              <HiOutlinePlus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Employee</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Search & Filter Bar                                               */}
      {/* ================================================================ */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <HiOutlineMagnifyingGlass className="h-4 w-4 text-gray-400 dark:text-dark-500" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, email, ID, or designation…"
            className="w-full rounded-lg border border-gray-300 bg-white dark:border-dark-700 dark:bg-dark-800/50 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-dark-500 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 hover:border-gray-400 dark:hover:border-dark-600"
          />
          {searchInput && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:text-dark-300"
            >
              <HiOutlineXMark className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors",
            showFilters || hasActiveFilters
              ? "border-primary-500/30 bg-primary-500/10 text-primary-400"
              : "border-gray-300 dark:border-dark-700 bg-white dark:bg-dark-800/50 text-gray-600 dark:text-dark-300 hover:border-gray-400 dark:hover:border-dark-600 hover:text-gray-900 dark:hover:text-white",
          )}
        >
          <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-600 px-1.5 text-2xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ================================================================ */}
      {/* Filter Panel (collapsible)                                        */}
      {/* ================================================================ */}
      <FilterPanel
        isOpen={showFilters}
        filters={{
          departmentId: filters.departmentId,
          status: filters.status,
          employmentType: filters.employmentType,
          gender: filters.gender,
        }}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onClose={() => setShowFilters(false)}
      />

      {/* ================================================================ */}
      {/* Employee Table                                                     */}
      {/* ================================================================ */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-dark-700/50 dark:bg-dark-800/30">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            {/* ---- Table Header ---- */}
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-dark-700/50 dark:bg-dark-800/50">
                <th className="px-4 py-3 text-left">
                  <SortHeader
                    label="Employee"
                    field="firstName"
                    currentSortBy={filters.sortBy}
                    currentSortOrder={filters.sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader
                    label="ID"
                    field="employeeId"
                    currentSortBy={filters.sortBy}
                    currentSortOrder={filters.sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                    Department
                  </span>
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader
                    label="Designation"
                    field="designation"
                    currentSortBy={filters.sortBy}
                    currentSortOrder={filters.sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader
                    label="Status"
                    field="status"
                    currentSortBy={filters.sortBy}
                    currentSortOrder={filters.sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-left">
                  <SortHeader
                    label="Joined"
                    field="joiningDate"
                    currentSortBy={filters.sortBy}
                    currentSortOrder={filters.sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>

            {/* ---- Table Body ---- */}
            <tbody>
              {/* Loading state */}
              {isLoading && employees.length === 0 && (
                <>
                  {Array.from({ length: pageSize }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </>
              )}

              {/* Error state */}
              {error && !isLoading && employees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-500/10">
                        <HiOutlineExclamationTriangle className="h-6 w-6 text-danger-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Failed to load employees
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                          {error}
                        </p>
                      </div>
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
              {!isLoading && !error && employees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-200 dark:bg-dark-700/50">
                        <HiOutlineUsers className="h-8 w-8 text-gray-400 dark:text-dark-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {hasActiveFilters
                            ? "No employees match your filters"
                            : "No employees found"}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                          {hasActiveFilters
                            ? "Try adjusting your search or filter criteria."
                            : "Get started by adding your first employee."}
                        </p>
                      </div>
                      {hasActiveFilters ? (
                        <button
                          onClick={handleResetFilters}
                          className="mt-1 flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-dark-600 px-4 py-2 text-xs font-medium text-dark-300 transition-colors hover:border-gray-400 hover:text-gray-900 dark:hover:border-dark-500 dark:hover:text-white"
                        >
                          <HiOutlineXMark className="h-3.5 w-3.5" />
                          Clear Filters
                        </button>
                      ) : (
                        isAdminOrHR && (
                          <button
                            onClick={handleAddEmployee}
                            className="mt-1 flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-500"
                          >
                            <HiOutlinePlus className="h-3.5 w-3.5" />
                            Add Employee
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Employee rows */}
              {employees.map((employee) => {
                const fullName = `${employee.firstName} ${employee.lastName}`;

                return (
                  <tr
                    key={employee.id}
                    className={cn(
                      "border-b border-gray-100 dark:border-dark-700/30 transition-colors hover:bg-gray-50 dark:hover:bg-dark-700/20",
                      isLoading && "opacity-50",
                    )}
                  >
                    {/* Employee Name & Avatar */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar
                          name={fullName}
                          avatar={employee.avatar}
                        />
                        <div className="min-w-0">
                          <button
                            onClick={() => handleViewEmployee(employee.id)}
                            className="truncate text-sm font-medium text-gray-900 dark:text-dark-100 transition-colors hover:text-primary-500 dark:hover:text-primary-400"
                          >
                            {fullName}
                          </button>
                          <div className="flex items-center gap-2 text-2xs text-gray-400 dark:text-dark-500">
                            <span className="flex items-center gap-0.5">
                              <HiOutlineEnvelope className="h-3 w-3" />
                              <span className="truncate max-w-[160px]">
                                {employee.email}
                              </span>
                            </span>
                            {employee.phone && (
                              <span className="hidden items-center gap-0.5 xl:flex">
                                <HiOutlinePhone className="h-3 w-3" />
                                {employee.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex rounded-md bg-gray-200 dark:bg-dark-700/50 px-2 py-0.5 text-xs font-mono font-medium text-gray-600 dark:text-dark-300">
                        {employee.employeeId}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3.5">
                      {employee.department ? (
                        <div className="flex items-center gap-1.5">
                          <HiOutlineBuildingOffice2 className="h-3.5 w-3.5 text-gray-400 dark:text-dark-500" />
                          <span className="text-sm text-gray-600 dark:text-dark-300">
                            {employee.department.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-dark-600 italic">
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Designation */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600 dark:text-dark-300">
                        {employee.designation}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge status={employee.status} />
                    </td>

                    {/* Joining Date */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-500 dark:text-dark-400 tabular-nums">
                        {formatDate(employee.joiningDate)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end">
                        <ActionDropdown
                          onView={() => handleViewEmployee(employee.id)}
                          onEdit={() => handleEditEmployee(employee.id)}
                          onDelete={() =>
                            handleDeleteClick(employee.id, fullName)
                          }
                          canEdit={isAdminOrHR}
                          canDelete={isAdmin}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ---- Table Footer / Pagination ---- */}
        {total > 0 && (
          <div className="border-t border-gray-100 dark:border-dark-700/30 px-4 py-3">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Delete Confirmation Modal                                         */}
      {/* ================================================================ */}
      <ConfirmDeleteModal
        isOpen={confirmDelete.isOpen}
        employeeName={confirmDelete.employeeName}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

export default EmployeeListPage;
