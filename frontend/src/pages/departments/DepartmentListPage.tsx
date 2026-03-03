// ============================================
// Department List Page
// ============================================
// Displays departments in a card grid layout with:
//   - Department name, code, description
//   - Employee count per department
//   - Active/inactive status indicator
//   - Add, edit, delete actions (Admin/HR)
//   - Search filtering
//   - Dark theme matching the reference dashboard

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import { setPageTitle, selectResolvedTheme } from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";
import { api } from "@/api/client";
import toast from "react-hot-toast";
import {
  HiOutlineBuildingOffice2,
  HiOutlinePlusCircle,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineUsers,
  HiOutlineArrowPath,
  HiOutlineExclamationTriangle,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineInformationCircle,
} from "react-icons/hi2";

// ============================================
// Types
// ============================================

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  headId: string | null;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Department Colors — consistent color based on index
// ============================================

const DEPARTMENT_COLORS = [
  {
    bg: "bg-primary-500/10",
    text: "text-primary-400",
    border: "border-primary-500/20",
    icon: "text-primary-500",
  },
  {
    bg: "bg-accent-500/10",
    text: "text-accent-400",
    border: "border-accent-500/20",
    icon: "text-accent-500",
  },
  {
    bg: "bg-success-500/10",
    text: "text-success-400",
    border: "border-success-500/20",
    icon: "text-success-500",
  },
  {
    bg: "bg-info-500/10",
    text: "text-info-400",
    border: "border-info-500/20",
    icon: "text-info-500",
  },
  {
    bg: "bg-warning-500/10",
    text: "text-warning-400",
    border: "border-warning-500/20",
    icon: "text-warning-500",
  },
  {
    bg: "bg-danger-500/10",
    text: "text-danger-400",
    border: "border-danger-500/20",
    icon: "text-danger-500",
  },
];

function getDepartmentColor(index: number) {
  return DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length];
}

// ============================================
// Skeleton Card
// ============================================

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-dark-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 rounded bg-gray-200 dark:bg-dark-700" />
          <div className="h-3 w-16 rounded bg-gray-200 dark:bg-dark-700" />
        </div>
      </div>
      <div className="mb-4 h-3 w-full rounded bg-gray-200 dark:bg-dark-700" />
      <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-dark-700" />
      <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-dark-700/50 pt-4">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-dark-700" />
        <div className="h-4 w-16 rounded bg-gray-200 dark:bg-dark-700" />
      </div>
    </div>
  );
}

// ============================================
// Add/Edit Department Modal
// ============================================

interface DepartmentFormData {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

function DepartmentModal({
  isOpen,
  onClose,
  onSave,
  department,
  isSaving,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DepartmentFormData) => void;
  department: Department | null;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: "",
    code: "",
    description: "",
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (department) {
        setFormData({
          name: department.name,
          code: department.code,
          description: department.description || "",
          isActive: department.isActive,
        });
      } else {
        setFormData({
          name: "",
          code: "",
          description: "",
          isActive: true,
        });
      }
      setErrors({});
    }
  }, [isOpen, department]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Department name is required";
    if (!formData.code.trim()) newErrors.code = "Department code is required";
    if (formData.code.length > 10)
      newErrors.code = "Code must be 10 characters or less";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      ...formData,
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description.trim(),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800 p-6 shadow-modal dark:shadow-modal-dark animate-scale-in">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {department ? "Edit Department" : "Add New Department"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 dark:text-dark-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-700 dark:hover:text-dark-200"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
              Department Name <span className="text-danger-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: "" });
              }}
              placeholder="e.g., Engineering"
              className={cn(
                "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all",
                "bg-gray-50 text-gray-900 placeholder-gray-400 dark:bg-dark-900/50 dark:text-white dark:placeholder-dark-500",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                errors.name
                  ? "border-danger-500/50"
                  : "border-gray-300 dark:border-dark-700",
              )}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-danger-400">{errors.name}</p>
            )}
          </div>

          {/* Code */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
              Department Code <span className="text-danger-400">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  code: e.target.value.toUpperCase(),
                });
                if (errors.code) setErrors({ ...errors, code: "" });
              }}
              placeholder="e.g., ENG"
              maxLength={10}
              className={cn(
                "w-full rounded-xl border px-4 py-2.5 text-sm font-mono outline-none transition-all uppercase",
                "bg-gray-50 text-gray-900 placeholder-gray-400 dark:bg-dark-900/50 dark:text-white dark:placeholder-dark-500",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
                errors.code
                  ? "border-danger-500/50"
                  : "border-gray-300 dark:border-dark-700",
              )}
            />
            {errors.code && (
              <p className="mt-1 text-xs text-danger-400">{errors.code}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Brief description of the department"
              rows={3}
              className="w-full rounded-xl border border-gray-300 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-dark-500 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, isActive: !formData.isActive })
              }
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-800",
                formData.isActive
                  ? "bg-primary-600"
                  : "bg-gray-300 dark:bg-dark-600",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  formData.isActive ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
            <span className="text-sm text-gray-600 dark:text-dark-300">
              {formData.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-200 transition-colors hover:bg-gray-50 dark:hover:bg-dark-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-500 disabled:opacity-50"
            >
              {isSaving ? (
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
                  Saving...
                </>
              ) : (
                <>{department ? "Update" : "Create"} Department</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Confirm Delete Modal
// ============================================

function ConfirmDeleteModal({
  isOpen,
  departmentName,
  employeeCount,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  departmentName: string;
  employeeCount: number;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-800 p-6 shadow-modal dark:shadow-modal-dark animate-scale-in">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-500/10">
          <HiOutlineExclamationTriangle className="h-6 w-6 text-danger-400" />
        </div>

        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          Delete Department
        </h3>
        <p className="mb-2 text-sm text-gray-500 dark:text-dark-400">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-700 dark:text-dark-200">
            {departmentName}
          </span>
          ?
        </p>
        {employeeCount > 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning-500/20 bg-warning-500/10 px-3 py-2">
            <HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning-400" />
            <p className="text-xs text-warning-600 dark:text-warning-400">
              This department has{" "}
              <span className="font-semibold">{employeeCount}</span> employee
              {employeeCount > 1 ? "s" : ""}. They will be unassigned from this
              department.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-4">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-200 transition-colors hover:bg-gray-50 dark:hover:bg-dark-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg bg-danger-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger-500 disabled:opacity-50"
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
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Department List Page Component
// ============================================

export function DepartmentListPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const userRole = useAppSelector((state) => state.auth.user?.role);
  const isAdminOrHR = userRole === "ADMIN" || userRole === "HR";
  const isAdmin = userRole === "ADMIN";
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const isDark = resolvedTheme === "dark";

  // State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Set page title
  useEffect(() => {
    dispatch(
      setPageTitle({ title: "Departments", subtitle: "Department Management" }),
    );
  }, [dispatch]);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<Department[]>(
        "/departments",
        searchQuery ? { search: searchQuery } : undefined,
      );
      const data =
        (response as any)?.data?.data ||
        (response as any)?.data ||
        response ||
        [];
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load departments";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Create/Update department
  const handleSave = async (data: DepartmentFormData) => {
    try {
      setIsSaving(true);

      if (editingDepartment) {
        // Update
        await api.put(`/departments/${editingDepartment.id}`, data);
        toast.success(`Department "${data.name}" updated successfully`);
      } else {
        // Create
        await api.post("/departments", data);
        toast.success(`Department "${data.name}" created successfully`);
      }

      setShowModal(false);
      setEditingDepartment(null);
      fetchDepartments();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save department";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete department
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await api.delete(`/departments/${deleteTarget.id}`);
      toast.success(`Department "${deleteTarget.name}" deleted successfully`);
      setDeleteTarget(null);
      fetchDepartments();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to delete department";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit handler
  const handleEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setShowModal(true);
  };

  // Add handler
  const handleAdd = () => {
    setEditingDepartment(null);
    setShowModal(true);
  };

  // Filter departments by search
  const filteredDepartments = departments.filter((dept) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      dept.name.toLowerCase().includes(q) ||
      dept.code.toLowerCase().includes(q) ||
      (dept.description && dept.description.toLowerCase().includes(q))
    );
  });

  // Stats
  const totalEmployees = departments.reduce(
    (sum, d) => sum + (d.employeeCount || 0),
    0,
  );
  const activeDepartments = departments.filter((d) => d.isActive).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ---- Page Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Departments
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
            Manage organizational departments and teams
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDepartments}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              isDark
                ? "border-dark-700 bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-dark-100"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm",
            )}
            title="Refresh"
          >
            <HiOutlineArrowPath
              className={cn("h-4 w-4", isLoading && "animate-spin")}
            />
          </button>

          {isAdminOrHR && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-500 shadow-lg shadow-primary-600/20"
            >
              <HiOutlinePlusCircle className="h-4 w-4" />
              Add Department
            </button>
          )}
        </div>
      </div>

      {/* ---- Summary Stats ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
              <HiOutlineBuildingOffice2 className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {departments.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-400">
                Total Departments
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-500/10">
              <HiOutlineCheckCircle className="h-5 w-5 text-success-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeDepartments}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-400">
                Active Departments
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-500/10">
              <HiOutlineUsers className="h-5 w-5 text-info-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalEmployees}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-400">
                Total Employees
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Search Bar ---- */}
      <div className="relative max-w-md">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <HiOutlineMagnifyingGlass className="h-4 w-4 text-gray-400 dark:text-dark-500" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search departments..."
          className={cn(
            "w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none transition-all",
            "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
            isDark
              ? "border-dark-700 bg-dark-800/50 text-white placeholder-dark-500"
              : "border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm",
          )}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:hover:text-dark-300"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ---- Error State ---- */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-danger-500/20 bg-danger-500/10 px-4 py-3.5">
          <HiOutlineExclamationTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-400" />
          <div>
            <p className="text-sm font-medium text-danger-600 dark:text-danger-400">
              Failed to load departments
            </p>
            <p className="mt-0.5 text-xs text-danger-500 dark:text-danger-400/80">
              {error}
            </p>
          </div>
          <button
            onClick={fetchDepartments}
            className="ml-auto text-xs font-medium text-danger-600 dark:text-danger-400 hover:text-danger-500 dark:hover:text-danger-300"
          >
            Retry
          </button>
        </div>
      )}

      {/* ---- Department Grid ---- */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800/50 dark:shadow-none py-16">
          <HiOutlineBuildingOffice2 className="mb-4 h-12 w-12 text-gray-300 dark:text-dark-600" />
          <h3 className="mb-1 text-lg font-medium text-gray-600 dark:text-dark-300">
            {searchQuery ? "No departments found" : "No departments yet"}
          </h3>
          <p className="mb-6 text-sm text-gray-400 dark:text-dark-500">
            {searchQuery
              ? `No departments match "${searchQuery}". Try a different search term.`
              : "Get started by creating your first department."}
          </p>
          {!searchQuery && isAdminOrHR && (
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-500"
            >
              <HiOutlinePlusCircle className="h-4 w-4" />
              Add Department
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDepartments.map((dept, index) => {
            const color = getDepartmentColor(index);

            return (
              <div
                key={dept.id}
                className={cn(
                  "group relative rounded-xl border p-5 transition-all duration-200",
                  isDark ? "bg-dark-800/50" : "bg-white shadow-card",
                  dept.isActive
                    ? isDark
                      ? "border-dark-700/50 hover:border-dark-600 hover:shadow-card-dark-hover"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-card-hover"
                    : isDark
                      ? "border-dark-700/30 opacity-60 hover:opacity-80"
                      : "border-gray-100 opacity-60 hover:opacity-80",
                )}
              >
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        color.bg,
                      )}
                    >
                      <HiOutlineBuildingOffice2
                        className={cn("h-5 w-5", color.icon)}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {dept.name}
                      </h3>
                      <p className={cn("text-2xs font-mono", color.text)}>
                        {dept.code}
                      </p>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium",
                      dept.isActive
                        ? "bg-success-500/10 text-success-600 dark:text-success-400"
                        : isDark
                          ? "bg-dark-700/50 text-dark-500"
                          : "bg-gray-100 text-gray-400",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        dept.isActive
                          ? "bg-success-400"
                          : isDark
                            ? "bg-dark-500"
                            : "bg-gray-400",
                      )}
                    />
                    {dept.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Description */}
                <p className="mb-4 line-clamp-2 text-xs text-gray-500 dark:text-dark-400 leading-relaxed min-h-[2.5rem]">
                  {dept.description || "No description provided."}
                </p>

                {/* Footer */}
                <div
                  className={cn(
                    "flex items-center justify-between border-t pt-3",
                    isDark ? "border-dark-700/30" : "border-gray-100",
                  )}
                >
                  <button
                    onClick={() =>
                      navigate(`/employees?departmentId=${dept.id}`)
                    }
                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-dark-400 transition-colors hover:text-primary-500 dark:hover:text-primary-400"
                  >
                    <HiOutlineUsers className="h-3.5 w-3.5" />
                    <span className="font-medium">
                      {dept.employeeCount || 0}
                    </span>
                    <span>
                      employee{(dept.employeeCount || 0) !== 1 ? "s" : ""}
                    </span>
                  </button>

                  {/* Action buttons */}
                  {isAdminOrHR && (
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => handleEdit(dept)}
                        className={cn(
                          "rounded-md p-1.5 transition-colors",
                          isDark
                            ? "text-dark-400 hover:bg-dark-700 hover:text-primary-400"
                            : "text-gray-400 hover:bg-gray-100 hover:text-primary-500",
                        )}
                        title="Edit department"
                      >
                        <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleteTarget(dept)}
                          className={cn(
                            "rounded-md p-1.5 transition-colors",
                            isDark
                              ? "text-dark-400 hover:bg-dark-700 hover:text-danger-400"
                              : "text-gray-400 hover:bg-gray-100 hover:text-danger-500",
                          )}
                          title="Delete department"
                        >
                          <HiOutlineTrash className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Info tip ---- */}
      {!isLoading && filteredDepartments.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-dark-500">
          <HiOutlineInformationCircle className="h-3.5 w-3.5" />
          <span>
            Showing {filteredDepartments.length} of {departments.length}{" "}
            department
            {departments.length !== 1 ? "s" : ""}.
            {searchQuery && " Clear the search to see all departments."}
          </span>
        </div>
      )}

      {/* ---- Add/Edit Modal ---- */}
      <DepartmentModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingDepartment(null);
        }}
        onSave={handleSave}
        department={editingDepartment}
        isSaving={isSaving}
      />

      {/* ---- Delete Confirmation Modal ---- */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        departmentName={deleteTarget?.name || ""}
        employeeCount={deleteTarget?.employeeCount || 0}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default DepartmentListPage;
