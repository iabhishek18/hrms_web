// ============================================
// Dashboard Redux Slice
// ============================================
// Manages dashboard state including stats, charts,
// department breakdown, top performers, top absentees,
// attendance summary, and recent activity.
// Uses createAsyncThunk for API calls.

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import { dashboardApi } from "@/api/dashboard";
import type {
  FullDashboardData,
  DashboardStats,
  DepartmentBreakdown,
  AttendanceSummary,
  TopPerformer,
  TopAbsentee,
  MonthlyAttendanceData,
  LeaveDistribution,
  RecentActivity,
} from "@/api/dashboard";

// ============================================
// Types
// ============================================

export interface DashboardState {
  // Full dashboard data (fetched in a single call)
  stats: DashboardStats | null;
  departmentBreakdown: DepartmentBreakdown[];
  attendanceSummary: AttendanceSummary | null;
  topPerformers: TopPerformer[];
  topAbsentees: TopAbsentee[];
  monthlyAttendance: MonthlyAttendanceData[];
  leaveDistribution: LeaveDistribution[];
  recentActivity: RecentActivity[];

  // Loading states for individual sections
  isLoading: boolean;
  isStatsLoading: boolean;
  isDepartmentLoading: boolean;
  isAttendanceLoading: boolean;
  isPerformersLoading: boolean;
  isAbsenteesLoading: boolean;
  isChartLoading: boolean;
  isActivityLoading: boolean;

  // Error states
  error: string | null;
  statsError: string | null;

  // Filters
  period: string; // 'all' | 'this_month' | 'this_year'
  departmentId: string | null;

  // Last fetch timestamp for cache invalidation
  lastFetched: number | null;
}

// ============================================
// Initial State
// ============================================

const initialState: DashboardState = {
  stats: null,
  departmentBreakdown: [],
  attendanceSummary: null,
  topPerformers: [],
  topAbsentees: [],
  monthlyAttendance: [],
  leaveDistribution: [],
  recentActivity: [],

  isLoading: false,
  isStatsLoading: false,
  isDepartmentLoading: false,
  isAttendanceLoading: false,
  isPerformersLoading: false,
  isAbsenteesLoading: false,
  isChartLoading: false,
  isActivityLoading: false,

  error: null,
  statsError: null,

  period: "all",
  departmentId: null,

  lastFetched: null,
};

// ============================================
// Cache Duration (5 minutes)
// ============================================

const CACHE_DURATION_MS = 5 * 60 * 1000;

// ============================================
// Async Thunks
// ============================================

/**
 * Fetch the full dashboard data in a single API call.
 * This is the primary thunk used on the dashboard page.
 * It populates all widgets and charts at once.
 */
export const fetchFullDashboard = createAsyncThunk<
  FullDashboardData,
  { period?: string; departmentId?: string; force?: boolean } | undefined,
  { rejectValue: string; state: RootState }
>(
  "dashboard/fetchFullDashboard",
  async (params, { rejectWithValue }) => {
    try {
      const response = await dashboardApi.getFullDashboard({
        period: params?.period,
        departmentId: params?.departmentId,
      });
      return response.data.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to load dashboard data";
      return rejectWithValue(message);
    }
  },
  {
    // Skip fetch if data was recently loaded (unless force=true)
    condition: (params, { getState }) => {
      if (params?.force) return true;
      const { dashboard } = getState();
      if (dashboard.isLoading) return false; // Don't duplicate in-flight requests
      if (dashboard.lastFetched) {
        const elapsed = Date.now() - dashboard.lastFetched;
        if (elapsed < CACHE_DURATION_MS) return false;
      }
      return true;
    },
  },
);

/**
 * Fetch only the dashboard stats (lightweight).
 * Useful for quick stat card refreshes without reloading charts.
 */
export const fetchDashboardStats = createAsyncThunk<
  DashboardStats,
  void,
  { rejectValue: string }
>("dashboard/fetchStats", async (_, { rejectWithValue }) => {
  try {
    const response = await dashboardApi.getStats();
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to load dashboard statistics";
    return rejectWithValue(message);
  }
});

/**
 * Fetch department breakdown data for the donut chart.
 */
export const fetchDepartmentBreakdown = createAsyncThunk<
  DepartmentBreakdown[],
  void,
  { rejectValue: string }
>("dashboard/fetchDepartmentBreakdown", async (_, { rejectWithValue }) => {
  try {
    const response = await dashboardApi.getDepartmentBreakdown();
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to load department breakdown";
    return rejectWithValue(message);
  }
});

/**
 * Fetch attendance summary for a specific month/year.
 */
export const fetchAttendanceSummary = createAsyncThunk<
  AttendanceSummary,
  { year?: number; month?: number } | undefined,
  { rejectValue: string }
>("dashboard/fetchAttendanceSummary", async (params, { rejectWithValue }) => {
  try {
    const response = await dashboardApi.getAttendanceSummary(params);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to load attendance summary";
    return rejectWithValue(message);
  }
});

/**
 * Fetch top performers list for the dashboard widget.
 */
export const fetchTopPerformers = createAsyncThunk<
  TopPerformer[],
  number | undefined,
  { rejectValue: string }
>("dashboard/fetchTopPerformers", async (limit = 5, { rejectWithValue }) => {
  try {
    const response = await dashboardApi.getTopPerformers(limit);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to load top performers";
    return rejectWithValue(message);
  }
});

/**
 * Fetch top absentees list for the dashboard widget.
 */
export const fetchTopAbsentees = createAsyncThunk<
  TopAbsentee[],
  { limit?: number; year?: number; month?: number } | undefined,
  { rejectValue: string }
>("dashboard/fetchTopAbsentees", async (params, { rejectWithValue }) => {
  try {
    const response = await dashboardApi.getTopAbsentees(params);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to load top absentees";
    return rejectWithValue(message);
  }
});

/**
 * Fetch monthly attendance chart data.
 */
export const fetchMonthlyAttendanceChart = createAsyncThunk<
  MonthlyAttendanceData[],
  number | undefined,
  { rejectValue: string }
>(
  "dashboard/fetchMonthlyAttendanceChart",
  async (months = 6, { rejectWithValue }) => {
    try {
      const response = await dashboardApi.getMonthlyAttendanceChart(months);
      return response.data.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to load monthly attendance chart";
      return rejectWithValue(message);
    }
  },
);

/**
 * Fetch leave type distribution chart data.
 */
export const fetchLeaveDistribution = createAsyncThunk<
  LeaveDistribution[],
  void,
  { rejectValue: string }
>("dashboard/fetchLeaveDistribution", async (_, { rejectWithValue }) => {
  try {
    const response = await dashboardApi.getLeaveDistribution();
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to load leave distribution";
    return rejectWithValue(message);
  }
});

/**
 * Fetch recent activity feed.
 */
export const fetchRecentActivity = createAsyncThunk<
  RecentActivity[],
  number | undefined,
  { rejectValue: string }
>("dashboard/fetchRecentActivity", async (limit = 10, { rejectWithValue }) => {
  try {
    const response = await dashboardApi.getRecentActivity(limit);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to load recent activity";
    return rejectWithValue(message);
  }
});

// ============================================
// Dashboard Slice
// ============================================

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    /**
     * Set the dashboard filter period.
     */
    setPeriod(state, action: PayloadAction<string>) {
      state.period = action.payload;
    },

    /**
     * Set the department filter for dashboard.
     */
    setDepartmentFilter(state, action: PayloadAction<string | null>) {
      state.departmentId = action.payload;
    },

    /**
     * Clear all dashboard errors.
     */
    clearDashboardError(state) {
      state.error = null;
      state.statsError = null;
    },

    /**
     * Invalidate the dashboard cache, forcing a refetch on next load.
     */
    invalidateDashboardCache(state) {
      state.lastFetched = null;
    },

    /**
     * Reset the entire dashboard state to initial values.
     * Used on logout or when switching user accounts.
     */
    resetDashboard() {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    // ---- Full Dashboard ----
    builder
      .addCase(fetchFullDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        fetchFullDashboard.fulfilled,
        (state, action: PayloadAction<FullDashboardData>) => {
          state.isLoading = false;
          state.error = null;
          state.lastFetched = Date.now();

          const payload = action.payload;

          // Populate all sections from the full dashboard response
          state.stats = payload.stats;
          state.departmentBreakdown = payload.departmentBreakdown || [];
          state.attendanceSummary = payload.attendanceSummary || null;
          state.recentActivity = payload.recentActivity || [];

          // Normalize top performers — backend returns employeeName (single string)
          // but frontend expects firstName + lastName. Handle both formats.
          state.topPerformers = (payload.topPerformers || []).map((p: any) => {
            if (p.firstName && p.lastName) return p;
            const nameParts = (p.employeeName || "").split(" ");
            const firstName = nameParts[0] || "Unknown";
            const lastName = nameParts.slice(1).join(" ") || "";
            const dept =
              typeof p.department === "string"
                ? { id: "", name: p.department }
                : p.department || null;
            return {
              ...p,
              id: p.id || p.employeeId || "",
              firstName,
              lastName,
              department: dept,
            };
          });

          // Normalize top absentees — same pattern
          state.topAbsentees = (payload.topAbsentees || []).map((a: any) => {
            if (a.firstName && a.lastName) return a;
            const nameParts = (a.employeeName || "").split(" ");
            const firstName = nameParts[0] || "Unknown";
            const lastName = nameParts.slice(1).join(" ") || "";
            const dept =
              typeof a.department === "string"
                ? { id: "", name: a.department }
                : a.department || null;
            return {
              ...a,
              id: a.id || a.employeeId || "",
              firstName,
              lastName,
              department: dept,
            };
          });

          // Handle both flat and nested charts format from backend
          // Backend returns: { charts: { monthlyAttendance, leaveDistribution } }
          const charts = (payload as any).charts;
          state.monthlyAttendance =
            payload.monthlyAttendance || charts?.monthlyAttendance || [];
          state.leaveDistribution =
            payload.leaveDistribution || charts?.leaveDistribution || [];
        },
      )
      .addCase(fetchFullDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to load dashboard";
      });

    // ---- Stats Only ----
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isStatsLoading = true;
        state.statsError = null;
      })
      .addCase(
        fetchDashboardStats.fulfilled,
        (state, action: PayloadAction<DashboardStats>) => {
          state.isStatsLoading = false;
          state.stats = action.payload;
          state.statsError = null;
        },
      )
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isStatsLoading = false;
        state.statsError = action.payload || "Failed to load stats";
      });

    // ---- Department Breakdown ----
    builder
      .addCase(fetchDepartmentBreakdown.pending, (state) => {
        state.isDepartmentLoading = true;
      })
      .addCase(
        fetchDepartmentBreakdown.fulfilled,
        (state, action: PayloadAction<DepartmentBreakdown[]>) => {
          state.isDepartmentLoading = false;
          state.departmentBreakdown = action.payload;
        },
      )
      .addCase(fetchDepartmentBreakdown.rejected, (state) => {
        state.isDepartmentLoading = false;
      });

    // ---- Attendance Summary ----
    builder
      .addCase(fetchAttendanceSummary.pending, (state) => {
        state.isAttendanceLoading = true;
      })
      .addCase(
        fetchAttendanceSummary.fulfilled,
        (state, action: PayloadAction<AttendanceSummary>) => {
          state.isAttendanceLoading = false;
          state.attendanceSummary = action.payload;
        },
      )
      .addCase(fetchAttendanceSummary.rejected, (state) => {
        state.isAttendanceLoading = false;
      });

    // ---- Top Performers ----
    builder
      .addCase(fetchTopPerformers.pending, (state) => {
        state.isPerformersLoading = true;
      })
      .addCase(
        fetchTopPerformers.fulfilled,
        (state, action: PayloadAction<TopPerformer[]>) => {
          state.isPerformersLoading = false;
          state.topPerformers = action.payload;
        },
      )
      .addCase(fetchTopPerformers.rejected, (state) => {
        state.isPerformersLoading = false;
      });

    // ---- Top Absentees ----
    builder
      .addCase(fetchTopAbsentees.pending, (state) => {
        state.isAbsenteesLoading = true;
      })
      .addCase(
        fetchTopAbsentees.fulfilled,
        (state, action: PayloadAction<TopAbsentee[]>) => {
          state.isAbsenteesLoading = false;
          state.topAbsentees = action.payload;
        },
      )
      .addCase(fetchTopAbsentees.rejected, (state) => {
        state.isAbsenteesLoading = false;
      });

    // ---- Monthly Attendance Chart ----
    builder
      .addCase(fetchMonthlyAttendanceChart.pending, (state) => {
        state.isChartLoading = true;
      })
      .addCase(
        fetchMonthlyAttendanceChart.fulfilled,
        (state, action: PayloadAction<MonthlyAttendanceData[]>) => {
          state.isChartLoading = false;
          state.monthlyAttendance = action.payload;
        },
      )
      .addCase(fetchMonthlyAttendanceChart.rejected, (state) => {
        state.isChartLoading = false;
      });

    // ---- Leave Distribution ----
    builder
      .addCase(fetchLeaveDistribution.pending, (state) => {
        state.isChartLoading = true;
      })
      .addCase(
        fetchLeaveDistribution.fulfilled,
        (state, action: PayloadAction<LeaveDistribution[]>) => {
          state.isChartLoading = false;
          state.leaveDistribution = action.payload;
        },
      )
      .addCase(fetchLeaveDistribution.rejected, (state) => {
        state.isChartLoading = false;
      });

    // ---- Recent Activity ----
    builder
      .addCase(fetchRecentActivity.pending, (state) => {
        state.isActivityLoading = true;
      })
      .addCase(
        fetchRecentActivity.fulfilled,
        (state, action: PayloadAction<RecentActivity[]>) => {
          state.isActivityLoading = false;
          state.recentActivity = action.payload;
        },
      )
      .addCase(fetchRecentActivity.rejected, (state) => {
        state.isActivityLoading = false;
      });
  },
});

// ============================================
// Export Actions
// ============================================

export const {
  setPeriod,
  setDepartmentFilter,
  clearDashboardError,
  invalidateDashboardCache,
  resetDashboard,
} = dashboardSlice.actions;

// ============================================
// Selectors
// ============================================

export const selectDashboardState = (state: RootState) => state.dashboard;
export const selectDashboardStats = (state: RootState) => state.dashboard.stats;
export const selectDepartmentBreakdown = (state: RootState) =>
  state.dashboard.departmentBreakdown;
export const selectAttendanceSummary = (state: RootState) =>
  state.dashboard.attendanceSummary;
export const selectTopPerformers = (state: RootState) =>
  state.dashboard.topPerformers;
export const selectTopAbsentees = (state: RootState) =>
  state.dashboard.topAbsentees;
export const selectMonthlyAttendance = (state: RootState) =>
  state.dashboard.monthlyAttendance;
export const selectLeaveDistribution = (state: RootState) =>
  state.dashboard.leaveDistribution;
export const selectRecentActivity = (state: RootState) =>
  state.dashboard.recentActivity;
export const selectDashboardLoading = (state: RootState) =>
  state.dashboard.isLoading;
export const selectDashboardError = (state: RootState) => state.dashboard.error;
export const selectDashboardPeriod = (state: RootState) =>
  state.dashboard.period;
export const selectDashboardDepartmentFilter = (state: RootState) =>
  state.dashboard.departmentId;
export const selectDashboardLastFetched = (state: RootState) =>
  state.dashboard.lastFetched;

/**
 * Selector that derives whether the dashboard cache is stale.
 * Returns true if the data should be refetched.
 */
export const selectIsDashboardStale = (state: RootState): boolean => {
  const { lastFetched } = state.dashboard;
  if (!lastFetched) return true;
  return Date.now() - lastFetched > CACHE_DURATION_MS;
};

/**
 * Selector that computes total employee count from stats.
 */
export const selectTotalEmployees = (state: RootState): number =>
  state.dashboard.stats?.totalEmployees ?? 0;

/**
 * Selector that computes the attendance rate from stats.
 */
export const selectAttendanceRate = (state: RootState): number =>
  state.dashboard.stats?.attendanceRate ?? 0;

export default dashboardSlice.reducer;
