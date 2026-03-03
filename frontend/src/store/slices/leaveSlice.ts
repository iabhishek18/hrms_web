// ============================================
// Leave Redux Slice
// ============================================
// Manages leave management state including leave requests,
// balances, filters, pagination, and CRUD operations.
// Uses createAsyncThunk for API calls.

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import { leaveApi } from "@/api/leaves";
import type {
  LeaveRequest,
  ApplyLeavePayload,
  LeaveBalance,
  LeaveListParams,
  LeaveStats,
  PaginationMeta,
} from "@/api/leaves";

// ============================================
// Types
// ============================================

export interface LeaveFilters {
  search: string;
  employeeId: string;
  leaveType: string;
  status: string;
  startDate: string;
  endDate: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface LeaveState {
  // List
  list: LeaveRequest[];
  meta: PaginationMeta | null;
  currentPage: number;
  pageSize: number;

  // My leaves (for employee view)
  myLeaves: LeaveRequest[];
  myLeavesMeta: PaginationMeta | null;

  // Selected leave request (for detail view)
  selectedLeave: LeaveRequest | null;
  isSelectedLoading: boolean;

  // Balances
  balances: LeaveBalance[];
  isBalancesLoading: boolean;

  // Stats
  stats: LeaveStats | null;
  isStatsLoading: boolean;

  // Filters
  filters: LeaveFilters;

  // Loading states
  isLoading: boolean;
  isApplying: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  isCancelling: boolean;

  // Error states
  error: string | null;
  applyError: string | null;
  approveError: string | null;

  // Success flags
  applySuccess: boolean;
  approveSuccess: boolean;
  rejectSuccess: boolean;
  cancelSuccess: boolean;
}

// ============================================
// Default Filters
// ============================================

const defaultFilters: LeaveFilters = {
  search: "",
  employeeId: "",
  leaveType: "",
  status: "",
  startDate: "",
  endDate: "",
  sortBy: "appliedOn",
  sortOrder: "desc",
};

// ============================================
// Initial State
// ============================================

const initialState: LeaveState = {
  list: [],
  meta: null,
  currentPage: 1,
  pageSize: 10,

  myLeaves: [],
  myLeavesMeta: null,

  selectedLeave: null,
  isSelectedLoading: false,

  balances: [],
  isBalancesLoading: false,

  stats: null,
  isStatsLoading: false,

  filters: { ...defaultFilters },

  isLoading: false,
  isApplying: false,
  isApproving: false,
  isRejecting: false,
  isCancelling: false,

  error: null,
  applyError: null,
  approveError: null,

  applySuccess: false,
  approveSuccess: false,
  rejectSuccess: false,
  cancelSuccess: false,
};

// ============================================
// Async Thunks
// ============================================

/**
 * Fetch all leave requests with filtering and pagination.
 * Admin/HR see all; employees see only their own.
 */
export const fetchLeaves = createAsyncThunk<
  { data: LeaveRequest[]; meta: PaginationMeta },
  LeaveListParams | undefined,
  { rejectValue: string; state: RootState }
>("leaves/fetchLeaves", async (params, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const { filters, currentPage, pageSize } = state.leaves;

    const queryParams: LeaveListParams = {
      page: params?.page ?? currentPage,
      limit: params?.limit ?? pageSize,
      employeeId: (params?.employeeId ?? filters.employeeId) || undefined,
      leaveType: (params?.leaveType ?? filters.leaveType) || undefined,
      status: (params?.status ?? filters.status) || undefined,
      startDate: (params?.startDate ?? filters.startDate) || undefined,
      endDate: (params?.endDate ?? filters.endDate) || undefined,
      sortBy: params?.sortBy ?? filters.sortBy,
      sortOrder: params?.sortOrder ?? filters.sortOrder,
    };

    // Remove undefined values
    Object.keys(queryParams).forEach((key) => {
      if ((queryParams as any)[key] === undefined) {
        delete (queryParams as any)[key];
      }
    });

    const response = await leaveApi.list(queryParams);
    const responseData = response.data.data;

    if (responseData && "data" in responseData && "meta" in responseData) {
      return {
        data: (responseData as any).data as LeaveRequest[],
        meta: (responseData as any).meta as PaginationMeta,
      };
    }

    if (Array.isArray(responseData)) {
      return {
        data: responseData,
        meta: (response.data as any).meta || {
          page: 1,
          limit: 10,
          total: (responseData as any[]).length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    return {
      data: responseData as unknown as LeaveRequest[],
      meta: (response.data as any).meta || {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch leave requests";
    return rejectWithValue(message);
  }
});

/**
 * Fetch the authenticated employee's own leave requests.
 */
export const fetchMyLeaves = createAsyncThunk<
  { data: LeaveRequest[]; meta: PaginationMeta },
  { page?: number; limit?: number } | undefined,
  { rejectValue: string }
>("leaves/fetchMyLeaves", async (params, { rejectWithValue }) => {
  try {
    const response = await leaveApi.getMyLeaves(params);
    const responseData = response.data.data;

    if (responseData && "data" in responseData && "meta" in responseData) {
      return {
        data: (responseData as any).data as LeaveRequest[],
        meta: (responseData as any).meta as PaginationMeta,
      };
    }

    if (Array.isArray(responseData)) {
      return {
        data: responseData,
        meta: (response.data as any).meta || {
          page: 1,
          limit: 10,
          total: (responseData as any[]).length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    return {
      data: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch your leave requests";
    return rejectWithValue(message);
  }
});

/**
 * Fetch a single leave request by ID.
 */
export const fetchLeaveById = createAsyncThunk<
  LeaveRequest,
  string,
  { rejectValue: string }
>("leaves/fetchLeaveById", async (id, { rejectWithValue }) => {
  try {
    const response = await leaveApi.getById(id);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch leave request details";
    return rejectWithValue(message);
  }
});

/**
 * Apply for leave (authenticated employee applies for themselves).
 */
export const applyLeave = createAsyncThunk<
  LeaveRequest,
  ApplyLeavePayload,
  { rejectValue: string }
>("leaves/applyLeave", async (payload, { rejectWithValue }) => {
  try {
    const response = await leaveApi.apply(payload);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to apply for leave";
    return rejectWithValue(message);
  }
});

/**
 * Approve a pending leave request. Admin/HR only.
 */
export const approveLeave = createAsyncThunk<
  LeaveRequest,
  { id: string; remarks?: string },
  { rejectValue: string }
>("leaves/approveLeave", async ({ id, remarks }, { rejectWithValue }) => {
  try {
    const response = await leaveApi.approve(id, remarks);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to approve leave request";
    return rejectWithValue(message);
  }
});

/**
 * Reject a pending leave request. Admin/HR only.
 */
export const rejectLeave = createAsyncThunk<
  LeaveRequest,
  { id: string; remarks?: string },
  { rejectValue: string }
>("leaves/rejectLeave", async ({ id, remarks }, { rejectWithValue }) => {
  try {
    const response = await leaveApi.reject(id, remarks);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to reject leave request";
    return rejectWithValue(message);
  }
});

/**
 * Cancel a leave request.
 */
export const cancelLeave = createAsyncThunk<
  LeaveRequest,
  { id: string; remarks?: string },
  { rejectValue: string }
>("leaves/cancelLeave", async ({ id, remarks }, { rejectWithValue }) => {
  try {
    const response = await leaveApi.cancel(id, remarks);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to cancel leave request";
    return rejectWithValue(message);
  }
});

/**
 * Fetch leave balances for the current user.
 */
export const fetchMyLeaveBalances = createAsyncThunk<
  LeaveBalance[],
  void,
  { rejectValue: string }
>("leaves/fetchMyLeaveBalances", async (_, { rejectWithValue }) => {
  try {
    const response = await leaveApi.getMyBalance();
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch leave balances";
    return rejectWithValue(message);
  }
});

/**
 * Fetch leave balances for a specific employee.
 */
export const fetchLeaveBalances = createAsyncThunk<
  LeaveBalance[],
  string,
  { rejectValue: string }
>("leaves/fetchLeaveBalances", async (employeeId, { rejectWithValue }) => {
  try {
    const response = await leaveApi.getBalance(employeeId);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch leave balances";
    return rejectWithValue(message);
  }
});

/**
 * Fetch leave statistics for the dashboard. Admin/HR only.
 */
export const fetchLeaveStats = createAsyncThunk<
  LeaveStats,
  void,
  { rejectValue: string }
>("leaves/fetchLeaveStats", async (_, { rejectWithValue }) => {
  try {
    const response = await leaveApi.getStats();
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch leave statistics";
    return rejectWithValue(message);
  }
});

// ============================================
// Leave Slice
// ============================================

const leaveSlice = createSlice({
  name: "leaves",
  initialState,
  reducers: {
    /**
     * Set the current page number for pagination.
     */
    setCurrentPage(state, action: PayloadAction<number>) {
      state.currentPage = action.payload;
    },

    /**
     * Set the page size (items per page).
     */
    setPageSize(state, action: PayloadAction<number>) {
      state.pageSize = action.payload;
      state.currentPage = 1;
    },

    /**
     * Update a single filter field and reset to page 1.
     */
    setFilter(
      state,
      action: PayloadAction<{ key: keyof LeaveFilters; value: string }>,
    ) {
      const { key, value } = action.payload;
      (state.filters as any)[key] = value;
      state.currentPage = 1;
    },

    /**
     * Set multiple filters at once.
     */
    setFilters(state, action: PayloadAction<Partial<LeaveFilters>>) {
      state.filters = { ...state.filters, ...action.payload };
      state.currentPage = 1;
    },

    /**
     * Reset all filters to their default values.
     */
    resetFilters(state) {
      state.filters = { ...defaultFilters };
      state.currentPage = 1;
    },

    /**
     * Clear the selected leave request.
     */
    clearSelectedLeave(state) {
      state.selectedLeave = null;
    },

    /**
     * Clear all error states.
     */
    clearErrors(state) {
      state.error = null;
      state.applyError = null;
      state.approveError = null;
    },

    /**
     * Clear success flags (after showing notification).
     */
    clearSuccessFlags(state) {
      state.applySuccess = false;
      state.approveSuccess = false;
      state.rejectSuccess = false;
      state.cancelSuccess = false;
    },

    /**
     * Reset the entire leave state.
     */
    resetLeaveState() {
      return { ...initialState };
    },
  },

  extraReducers: (builder) => {
    // ---- Fetch Leave Requests List ----
    builder
      .addCase(fetchLeaves.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLeaves.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.data;
        state.meta = action.payload.meta;
        state.error = null;
      })
      .addCase(fetchLeaves.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch leave requests";
      });

    // ---- Fetch My Leaves ----
    builder
      .addCase(fetchMyLeaves.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyLeaves.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myLeaves = action.payload.data;
        state.myLeavesMeta = action.payload.meta;
        state.error = null;
      })
      .addCase(fetchMyLeaves.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch your leave requests";
      });

    // ---- Fetch Single Leave ----
    builder
      .addCase(fetchLeaveById.pending, (state) => {
        state.isSelectedLoading = true;
      })
      .addCase(
        fetchLeaveById.fulfilled,
        (state, action: PayloadAction<LeaveRequest>) => {
          state.isSelectedLoading = false;
          state.selectedLeave = action.payload;
        },
      )
      .addCase(fetchLeaveById.rejected, (state) => {
        state.isSelectedLoading = false;
      });

    // ---- Apply Leave ----
    builder
      .addCase(applyLeave.pending, (state) => {
        state.isApplying = true;
        state.applyError = null;
        state.applySuccess = false;
      })
      .addCase(
        applyLeave.fulfilled,
        (state, action: PayloadAction<LeaveRequest>) => {
          state.isApplying = false;
          state.applyError = null;
          state.applySuccess = true;
          // Add to the beginning of both lists
          state.list.unshift(action.payload);
          state.myLeaves.unshift(action.payload);
          if (state.meta) {
            state.meta.total += 1;
          }
        },
      )
      .addCase(applyLeave.rejected, (state, action) => {
        state.isApplying = false;
        state.applyError = action.payload || "Failed to apply for leave";
        state.applySuccess = false;
      });

    // ---- Approve Leave ----
    builder
      .addCase(approveLeave.pending, (state) => {
        state.isApproving = true;
        state.approveError = null;
        state.approveSuccess = false;
      })
      .addCase(
        approveLeave.fulfilled,
        (state, action: PayloadAction<LeaveRequest>) => {
          state.isApproving = false;
          state.approveError = null;
          state.approveSuccess = true;
          // Update the item in the list
          const idx = state.list.findIndex((l) => l.id === action.payload.id);
          if (idx !== -1) {
            state.list[idx] = action.payload;
          }
          if (state.selectedLeave?.id === action.payload.id) {
            state.selectedLeave = action.payload;
          }
        },
      )
      .addCase(approveLeave.rejected, (state, action) => {
        state.isApproving = false;
        state.approveError = action.payload || "Failed to approve leave";
        state.approveSuccess = false;
      });

    // ---- Reject Leave ----
    builder
      .addCase(rejectLeave.pending, (state) => {
        state.isRejecting = true;
        state.approveError = null;
        state.rejectSuccess = false;
      })
      .addCase(
        rejectLeave.fulfilled,
        (state, action: PayloadAction<LeaveRequest>) => {
          state.isRejecting = false;
          state.rejectSuccess = true;
          const idx = state.list.findIndex((l) => l.id === action.payload.id);
          if (idx !== -1) {
            state.list[idx] = action.payload;
          }
          if (state.selectedLeave?.id === action.payload.id) {
            state.selectedLeave = action.payload;
          }
        },
      )
      .addCase(rejectLeave.rejected, (state, action) => {
        state.isRejecting = false;
        state.approveError = action.payload || "Failed to reject leave";
        state.rejectSuccess = false;
      });

    // ---- Cancel Leave ----
    builder
      .addCase(cancelLeave.pending, (state) => {
        state.isCancelling = true;
        state.cancelSuccess = false;
      })
      .addCase(
        cancelLeave.fulfilled,
        (state, action: PayloadAction<LeaveRequest>) => {
          state.isCancelling = false;
          state.cancelSuccess = true;
          const idx = state.list.findIndex((l) => l.id === action.payload.id);
          if (idx !== -1) {
            state.list[idx] = action.payload;
          }
          const myIdx = state.myLeaves.findIndex(
            (l) => l.id === action.payload.id,
          );
          if (myIdx !== -1) {
            state.myLeaves[myIdx] = action.payload;
          }
          if (state.selectedLeave?.id === action.payload.id) {
            state.selectedLeave = action.payload;
          }
        },
      )
      .addCase(cancelLeave.rejected, (state) => {
        state.isCancelling = false;
        state.cancelSuccess = false;
      });

    // ---- Fetch My Leave Balances ----
    builder
      .addCase(fetchMyLeaveBalances.pending, (state) => {
        state.isBalancesLoading = true;
      })
      .addCase(
        fetchMyLeaveBalances.fulfilled,
        (state, action: PayloadAction<LeaveBalance[]>) => {
          state.isBalancesLoading = false;
          state.balances = action.payload;
        },
      )
      .addCase(fetchMyLeaveBalances.rejected, (state) => {
        state.isBalancesLoading = false;
      });

    // ---- Fetch Leave Balances (for specific employee) ----
    builder
      .addCase(fetchLeaveBalances.pending, (state) => {
        state.isBalancesLoading = true;
      })
      .addCase(
        fetchLeaveBalances.fulfilled,
        (state, action: PayloadAction<LeaveBalance[]>) => {
          state.isBalancesLoading = false;
          state.balances = action.payload;
        },
      )
      .addCase(fetchLeaveBalances.rejected, (state) => {
        state.isBalancesLoading = false;
      });

    // ---- Fetch Leave Stats ----
    builder
      .addCase(fetchLeaveStats.pending, (state) => {
        state.isStatsLoading = true;
      })
      .addCase(
        fetchLeaveStats.fulfilled,
        (state, action: PayloadAction<LeaveStats>) => {
          state.isStatsLoading = false;
          state.stats = action.payload;
        },
      )
      .addCase(fetchLeaveStats.rejected, (state) => {
        state.isStatsLoading = false;
      });
  },
});

// ============================================
// Export Actions
// ============================================

export const {
  setCurrentPage,
  setPageSize,
  setFilter,
  setFilters,
  resetFilters,
  clearSelectedLeave,
  clearErrors,
  clearSuccessFlags,
  resetLeaveState,
} = leaveSlice.actions;

// ============================================
// Selectors
// ============================================

export const selectLeaveState = (state: RootState) => state.leaves;
export const selectLeaveList = (state: RootState) => state.leaves.list;
export const selectLeaveMeta = (state: RootState) => state.leaves.meta;
export const selectLeaveCurrentPage = (state: RootState) =>
  state.leaves.currentPage;
export const selectLeavePageSize = (state: RootState) => state.leaves.pageSize;
export const selectMyLeaves = (state: RootState) => state.leaves.myLeaves;
export const selectMyLeavesMeta = (state: RootState) =>
  state.leaves.myLeavesMeta;
export const selectSelectedLeave = (state: RootState) =>
  state.leaves.selectedLeave;
export const selectLeaveBalances = (state: RootState) => state.leaves.balances;
export const selectIsBalancesLoading = (state: RootState) =>
  state.leaves.isBalancesLoading;
export const selectLeaveStats = (state: RootState) => state.leaves.stats;
export const selectLeaveFilters = (state: RootState) => state.leaves.filters;
export const selectLeavesLoading = (state: RootState) => state.leaves.isLoading;
export const selectIsApplying = (state: RootState) => state.leaves.isApplying;
export const selectIsApproving = (state: RootState) => state.leaves.isApproving;
export const selectIsRejecting = (state: RootState) => state.leaves.isRejecting;
export const selectIsCancelling = (state: RootState) =>
  state.leaves.isCancelling;
export const selectLeaveError = (state: RootState) => state.leaves.error;
export const selectApplyError = (state: RootState) => state.leaves.applyError;
export const selectApplySuccess = (state: RootState) =>
  state.leaves.applySuccess;
export const selectApproveSuccess = (state: RootState) =>
  state.leaves.approveSuccess;
export const selectRejectSuccess = (state: RootState) =>
  state.leaves.rejectSuccess;
export const selectCancelSuccess = (state: RootState) =>
  state.leaves.cancelSuccess;

/**
 * Compute remaining balance for each leave type.
 */
export const selectLeaveBalancesWithRemaining = (state: RootState) =>
  state.leaves.balances.map((balance) => ({
    ...balance,
    remainingLeaves: balance.totalLeaves - balance.usedLeaves,
  }));

/**
 * Count pending leave requests from the list.
 */
export const selectPendingLeavesCount = (state: RootState): number =>
  state.leaves.list.filter((l) => l.status === "PENDING").length;

/**
 * Check if there are any active filters set.
 */
export const selectHasActiveLeaveFilters = (state: RootState): boolean => {
  const { filters } = state.leaves;
  return (
    filters.employeeId !== "" ||
    filters.leaveType !== "" ||
    filters.status !== "" ||
    filters.startDate !== "" ||
    filters.endDate !== ""
  );
};

export default leaveSlice.reducer;
