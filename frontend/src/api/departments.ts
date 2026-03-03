// ============================================
// Department API Service
// ============================================
// Provides typed API functions for all department management
// endpoints. Used by the department Redux slice and department pages.

import { api } from './client';

// ============================================
// Types
// ============================================

export interface Department {
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

export interface DepartmentDetail extends Department {
  employees: DepartmentEmployee[];
}

export interface DepartmentEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  status: string;
  avatar: string | null;
  joiningDate: string;
}

export interface DepartmentListParams {
  isActive?: boolean;
  search?: string;
}

export interface CreateDepartmentPayload {
  name: string;
  code: string;
  description?: string;
  headId?: string;
  isActive?: boolean;
}

export type UpdateDepartmentPayload = Partial<CreateDepartmentPayload>;

export interface DepartmentEmployeeListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ============================================
// Department API Functions
// ============================================

export const departmentApi = {
  /**
   * GET /api/departments
   * List all departments with employee counts.
   * Optionally filter by active status or search term.
   */
  list: (params?: DepartmentListParams) =>
    api.get<Department[]>('/departments', params as Record<string, unknown>),

  /**
   * GET /api/departments/:id
   * Get a single department by ID with its employees list.
   */
  getById: (id: string) =>
    api.get<DepartmentDetail>(`/departments/${id}`),

  /**
   * POST /api/departments
   * Create a new department. Admin/HR only.
   *
   * Body:
   *   - name: string (required, unique)
   *   - code: string (required, unique, uppercase)
   *   - description: string (optional)
   *   - headId: UUID (optional)
   *   - isActive: boolean (optional, default true)
   */
  create: (payload: CreateDepartmentPayload) =>
    api.post<Department>('/departments', payload),

  /**
   * PUT /api/departments/:id
   * Update an existing department. Supports partial updates. Admin/HR only.
   */
  update: (id: string, payload: UpdateDepartmentPayload) =>
    api.put<Department>(`/departments/${id}`, payload),

  /**
   * PATCH /api/departments/:id
   * Alias for PUT — same partial update behavior.
   */
  patch: (id: string, payload: UpdateDepartmentPayload) =>
    api.patch<Department>(`/departments/${id}`, payload),

  /**
   * DELETE /api/departments/:id
   * Delete a department. Employees in the department become unassigned.
   * Admin only.
   */
  delete: (id: string) =>
    api.delete<null>(`/departments/${id}`),

  /**
   * GET /api/departments/:id/employees
   * List employees in a specific department with pagination.
   *
   * Query Parameters:
   *   - page: number (default: 1)
   *   - limit: number (default: 20, max: 100)
   *   - status: EmployeeStatus (optional)
   *   - search: string (optional)
   */
  getEmployees: (id: string, params?: DepartmentEmployeeListParams) =>
    api.get<{ data: DepartmentEmployee[]; meta: PaginationMeta }>(
      `/departments/${id}/employees`,
      params as Record<string, unknown>,
    ),

  /**
   * PUT /api/departments/:id with isActive toggle
   * Convenience method to activate or deactivate a department.
   */
  toggleActive: (id: string, isActive: boolean) =>
    api.put<Department>(`/departments/${id}`, { isActive }),
};

export default departmentApi;
