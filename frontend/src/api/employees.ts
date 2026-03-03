// ============================================
// Employee API Service
// ============================================
// Provides typed API functions for all employee management
// endpoints. Used by the employee Redux slice and employee pages.

import { api } from './client';

// ============================================
// Types
// ============================================

export interface EmployeeListParams {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  status?: string;
  employmentType?: string;
  gender?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeListItem {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  designation: string;
  status: string;
  avatar: string | null;
  joiningDate: string;
  employmentType: string | null;
  department: {
    id: string;
    name: string;
  } | null;
}

export interface EmployeeDetail {
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
  confirmationDate: string | null;
  terminationDate: string | null;
  salary: number | null;
  employmentType: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  bankName: string | null;
  bankAccountNo: string | null;
  bankIfscCode: string | null;
  createdAt: string;
  updatedAt: string;
  departmentId: string | null;
  department: {
    id: string;
    name: string;
    code: string;
  } | null;
  managerId: string | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string;
  } | null;
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLogin: string | null;
  } | null;
  leaveBalances?: Array<{
    leaveType: string;
    totalLeaves: number;
    usedLeaves: number;
  }>;
}

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  designation: string;
  departmentId?: string;
  managerId?: string;
  status?: string;
  joiningDate: string;
  confirmationDate?: string;
  salary?: number;
  employmentType?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfscCode?: string;
  createUserAccount?: boolean;
  password?: string;
  role?: string;
}

export type UpdateEmployeePayload = Partial<Omit<CreateEmployeePayload, 'createUserAccount' | 'password' | 'role'>>;

export interface EmployeeSearchResult {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  avatar: string | null;
  department: {
    id: string;
    name: string;
  } | null;
}

export interface EmployeeStatsSummary {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  terminated: number;
  probation: number;
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    count: number;
  }>;
  byGender: Array<{
    gender: string;
    count: number;
  }>;
  byEmploymentType: Array<{
    type: string;
    count: number;
  }>;
}

export interface DepartmentCount {
  departmentId: string;
  departmentName: string;
  count: number;
  color?: string;
}

export interface TopPerformer {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  avatar: string | null;
  department: {
    id: string;
    name: string;
  } | null;
  rating: number;
  reviewPeriod: string;
}

export interface TopAbsentee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  avatar: string | null;
  department: {
    id: string;
    name: string;
  } | null;
  absentDays: number;
  totalDays: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface EmployeeListResponse {
  data: EmployeeListItem[];
  meta: PaginationMeta;
}

// ============================================
// Employee API Functions
// ============================================

export const employeeApi = {
  /**
   * GET /api/employees
   * List employees with search, filter, sort, and pagination.
   */
  list: (params?: EmployeeListParams) =>
    api.get<{ data: EmployeeListItem[]; meta: PaginationMeta }>('/employees', params as Record<string, unknown>),

  /**
   * GET /api/employees/:id
   * Get a single employee by UUID with full details.
   */
  getById: (id: string) =>
    api.get<EmployeeDetail>(`/employees/${id}`),

  /**
   * POST /api/employees
   * Create a new employee record. Restricted to Admin/HR.
   */
  create: (payload: CreateEmployeePayload) =>
    api.post<EmployeeDetail>('/employees', payload),

  /**
   * PUT /api/employees/:id
   * Update an existing employee. Supports partial updates.
   */
  update: (id: string, payload: UpdateEmployeePayload) =>
    api.put<EmployeeDetail>(`/employees/${id}`, payload),

  /**
   * DELETE /api/employees/:id
   * Permanently delete an employee and associated data.
   * Restricted to Admin only.
   */
  delete: (id: string) =>
    api.delete<null>(`/employees/${id}`),

  /**
   * GET /api/employees/search?q=...&limit=...
   * Quick search / autocomplete across employee name, email, and ID.
   */
  search: (query: string, limit: number = 10) =>
    api.get<EmployeeSearchResult[]>('/employees/search', { q: query, limit }),

  /**
   * GET /api/employees/stats
   * Aggregated employee statistics (totals, by department, by gender, etc.)
   */
  stats: () =>
    api.get<EmployeeStatsSummary>('/employees/stats'),

  /**
   * GET /api/employees/recent
   * Recently joined employees list.
   */
  recent: (limit: number = 5) =>
    api.get<EmployeeListItem[]>('/employees/recent', { limit }),

  /**
   * GET /api/employees/top-performers
   * Employees with the highest performance ratings.
   */
  topPerformers: (limit: number = 5) =>
    api.get<TopPerformer[]>('/employees/top-performers', { limit }),

  /**
   * GET /api/employees/top-absentees
   * Employees with the most absences this month.
   */
  topAbsentees: (limit: number = 5) =>
    api.get<TopAbsentee[]>('/employees/top-absentees', { limit }),

  /**
   * GET /api/employees/department-count
   * Employee count grouped by department.
   */
  departmentCount: () =>
    api.get<DepartmentCount[]>('/employees/department-count'),

  /**
   * GET /api/employees/birthdays
   * Employees with birthdays in the current month.
   */
  birthdays: () =>
    api.get<EmployeeListItem[]>('/employees/birthdays'),

  /**
   * GET /api/employees/by-user/:userId
   * Get employee record by associated user account ID.
   */
  getByUserId: (userId: string) =>
    api.get<EmployeeDetail>(`/employees/by-user/${userId}`),

  /**
   * GET /api/employees/by-emp-id/:employeeId
   * Get employee record by human-readable employee ID (e.g., EMP-0042).
   */
  getByEmployeeId: (employeeId: string) =>
    api.get<EmployeeDetail>(`/employees/by-emp-id/${employeeId}`),
};

export default employeeApi;
