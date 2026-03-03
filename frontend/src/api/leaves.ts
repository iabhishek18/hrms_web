// ============================================
// Leave Management API Service
// ============================================
// Provides typed API functions for all leave management
// endpoints. Used by the leave Redux slice and leave pages.

import { api } from './client';

// ============================================
// Types
// ============================================

export interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  remarks: string | null;
  appliedOn: string;
  approvedOn: string | null;
  approvedBy: string | null;
  employeeId: string;
  employee: {
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
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApplyLeavePayload {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ApplyLeaveOnBehalfPayload extends ApplyLeavePayload {
  employeeId: string;
}

export interface UpdateLeaveStatusPayload {
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED';
  remarks?: string;
}

export interface LeaveBalance {
  id: string;
  leaveType: string;
  totalLeaves: number;
  usedLeaves: number;
  year: number;
  remainingLeaves?: number;
  employeeId: string;
}

export interface SetLeaveBalancePayload {
  employeeId: string;
  leaveType: string;
  totalLeaves: number;
  year: number;
}

export interface LeaveListParams {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
  leaveType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  byType: Array<{
    leaveType: string;
    count: number;
    totalDays: number;
  }>;
  byMonth: Array<{
    month: string;
    count: number;
  }>;
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
// Leave API Functions
// ============================================

export const leaveApi = {
  /**
   * GET /api/leaves
   * List all leave requests with filtering, search, and pagination.
   * Employees see only their own; Admin/HR see all.
   */
  list: (params?: LeaveListParams) =>
    api.get<{ data: LeaveRequest[]; meta: PaginationMeta }>('/leaves', params as Record<string, unknown>),

  /**
   * GET /api/leaves/:id
   * Get a single leave request by ID.
   */
  getById: (id: string) =>
    api.get<LeaveRequest>(`/leaves/${id}`),

  /**
   * GET /api/leaves/my-leaves
   * Get the authenticated employee's own leave requests.
   */
  getMyLeaves: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: LeaveRequest[]; meta: PaginationMeta }>('/leaves/my-leaves', params as Record<string, unknown>),

  /**
   * POST /api/leaves
   * Apply for leave (authenticated employee applies for themselves).
   */
  apply: (payload: ApplyLeavePayload) =>
    api.post<LeaveRequest>('/leaves', payload),

  /**
   * POST /api/leaves/on-behalf
   * Apply leave on behalf of an employee. Admin/HR only.
   */
  applyOnBehalf: (payload: ApplyLeaveOnBehalfPayload) =>
    api.post<LeaveRequest>('/leaves/on-behalf', payload),

  /**
   * PUT /api/leaves/:id/approve
   * Approve a pending leave request. Admin/HR only.
   */
  approve: (id: string, remarks?: string) =>
    api.put<LeaveRequest>(`/leaves/${id}/approve`, { remarks }),

  /**
   * PUT /api/leaves/:id/reject
   * Reject a pending leave request. Admin/HR only.
   */
  reject: (id: string, remarks?: string) =>
    api.put<LeaveRequest>(`/leaves/${id}/reject`, { remarks }),

  /**
   * PUT /api/leaves/:id/cancel
   * Cancel a leave request. Employees can cancel their own; Admin/HR can cancel any.
   */
  cancel: (id: string, remarks?: string) =>
    api.put<LeaveRequest>(`/leaves/${id}/cancel`, { remarks }),

  /**
   * PUT /api/leaves/:id/status
   * Generic status update endpoint (approve, reject, or cancel). Admin/HR only.
   */
  updateStatus: (id: string, payload: UpdateLeaveStatusPayload) =>
    api.put<LeaveRequest>(`/leaves/${id}/status`, payload),

  /**
   * DELETE /api/leaves/:id
   * Delete a leave request (only PENDING or CANCELLED can be deleted). Admin only.
   */
  delete: (id: string) =>
    api.delete<null>(`/leaves/${id}`),

  /**
   * GET /api/leaves/balance
   * Get the authenticated employee's leave balance for the current year.
   */
  getMyBalance: () =>
    api.get<LeaveBalance[]>('/leaves/balance'),

  /**
   * GET /api/leaves/balance/:employeeId
   * Get leave balance for a specific employee.
   * Employees can only view their own; Admin/HR can view any.
   */
  getBalance: (employeeId: string) =>
    api.get<LeaveBalance[]>(`/leaves/balance/${employeeId}`),

  /**
   * PUT /api/leaves/balance
   * Set or update leave balance for an employee. Admin/HR only.
   */
  setBalance: (payload: SetLeaveBalancePayload) =>
    api.put<LeaveBalance>('/leaves/balance', payload),

  /**
   * POST /api/leaves/initialize-balances
   * Initialize leave balances for all active employees for a given year.
   * Admin only.
   */
  initializeBalances: (year: number) =>
    api.post<{ count: number }>('/leaves/initialize-balances', { year }),

  /**
   * GET /api/leaves/stats
   * Get leave statistics for the dashboard. Admin/HR only.
   */
  getStats: () =>
    api.get<LeaveStats>('/leaves/stats'),
};

export default leaveApi;
