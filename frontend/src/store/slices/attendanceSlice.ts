// ============================================
// Attendance Redux Slice
// ============================================
// Manages attendance state including clock in/out,
// daily records, summaries, calendar view, and filters.
// Uses createAsyncThunk for API calls.

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import { attendanceApi } from "@/api/attendance";
import type {
  AttendanceRecord,
  ClockInPayload,
  ClockOutPayload,
  TodayStatus,
  AttendanceListParams,
  AttendanceSummary,
  DepartmentAttendanceSummary,
  OverallAttendanceSummary,
  MonthlyCalendarDay,
  PaginationMeta,
} from "@/api/attendance";

// ============================================
// Types
// ============================================

export interface AttendanceFilters {
  employeeId: string;
  date: string;
  startDate: string;
  endDate: string;
  status: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface AttendanceState {
  // List of attendance records
  list: AttendanceRecord[];
  meta: PaginationMeta | null;
  currentPage: number;
  pageSize: number;

  // Today's status for the current user
  todayStatus: TodayStatus | null;
  isTodayLoading: boolean;
  todayError: string | null;

  // Clock in/out states
  isClockingIn: boolean;
  isClockingOut: boolean;
  clockError: string | null;
  clockSuccess: string | null;

  // Summaries
  mySummary: AttendanceSummary | null;
  isMySummaryLoading: boolean;

  employeeSummary: AttendanceSummary | null;
  isEmployeeSummaryLoading: boolean;

  departmentSummary: DepartmentAttendanceSummary[];
  isDepartmentSummaryLoading: boolean;

  overallSummary: OverallAttendanceSummary | null;
  isOverallSummaryLoading: boolean;

  // Calendar view
  calendar: MonthlyCalendarDay[];
  isCalendarLoading: boolean;
  calendarMonth: number;
  calendarYear: number;

  // Selected record (for detail view)
  selectedRecord: AttendanceRecord | null;
  isSelectedLoading: boolean;

  // Filters
  filters: AttendanceFilters;

  // Loading & error states
  isLoading: boolean;
  error: string | null;

  // Success flags
  manualEntrySuccess: boolean;
  bulkMarkSuccess: boolean;
}

// ============================================
// Default Filters
// ============================================

const defaultFilters: AttendanceFilters = {
  employeeId: "",
  date: "",
  startDate: "",
  endDate: "",
  status: "",
  sortBy: "date",
  sortOrder: "desc",
};

// ============================================
// Initial State
// ============================================

const now = new Date();

const initialState: AttendanceState = {
  list: [],
  meta: null,
  currentPage: 1,
  pageSize: 10,

  todayStatus: null,
  isTodayLoading: false,
  todayError: null,

  isClockingIn: false,
  isClockingOut: false,
  clockError: null,
  clockSuccess: null,

  mySummary: null,
  isMySummaryLoading: false,

  employeeSummary: null,
  isEmployeeSummaryLoading: false,

  departmentSummary: [],
  isDepartmentSummaryLoading: false,

  overallSummary: null,
  isOverallSummaryLoading: false,

  calendar: [],
  isCalendarLoading: false,
  calendarMonth: now.getMonth() + 1,
  calendarYear: now.getFullYear(),

  selectedRecord: null,
  isSelectedLoading: false,

  filters: { ...defaultFilters },

  isLoading: false,
  error: null,

  manualEntrySuccess: false,
  bulkMarkSuccess: false,
};

// ============================================
// Async Thunks
// ============================================

/**
 * Fetch attendance records with filtering and pagination.
 * Admin/HR see all; employees see only their own.
 */
export const fetchAttendance = createAsyncThunk<
  { data: AttendanceRecord[]; meta: PaginationMeta },
  AttendanceListParams | undefined,
  { rejectValue: string; state: RootState }
>(
  "attendance/fetchAttendance",
  async (params, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const { filters, currentPage, pageSize } = state.attendance;

      const queryParams: AttendanceListParams = {
        page: params?.page ?? currentPage,
        limit: params?.limit ?? pageSize,
        employeeId: (params?.employeeId ?? filters.employeeId) || undefined,
        date: (params?.date ?? filters.date) || undefined,
        startDate: (params?.startDate ?? filters.startDate) || undefined,
        endDate: (params?.endDate ?? filters.endDate) || undefined,
        status: (params?.status ?? filters.status) || undefined,
        sortBy: params?.sortBy ?? filters.sortBy,
        sortOrder: params?.sortOrder ?? filters.sortOrder,
      };

      // Remove undefined values
      Object.keys(queryParams).forEach((key) => {
        if ((queryParams as any)[key] === undefined) {
          delete (queryParams as any)[key];
        }
      });

      const response = await attendanceApi.list(queryParams);
      const responseData = response.data.data;

      // Handle nested response shape: { data: [...], meta: {...} }
      if (
        responseData &&
        typeof responseData === "object" &&
        "data" in responseData &&
        "meta" in responseData
      ) {
        return {
          data: (responseData as any).data as AttendanceRecord[],
          meta: (responseData as any).meta as PaginationMeta,
        };
      }

      // Handle flat array response
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

      // Fallback
      return {
        data: responseData as unknown as AttendanceRecord[],
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
        "Failed to fetch attendance records";
      return rejectWithValue(message);
    }
  },
);

/**
 * Fetch a single attendance record by ID.
 */
export const fetchAttendanceById = createAsyncThunk<
  AttendanceRecord,
  string,
  { rejectValue: string }
>("attendance/fetchAttendanceById", async (id, { rejectWithValue }) => {
  try {
    const response = await attendanceApi.getById(id);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch attendance record";
    return rejectWithValue(message);
  }
});

/**
 * Get today's attendance status for the current user.
 * Returns whether the user has clocked in/out and their times.
 */
export const fetchTodayStatus = createAsyncThunk<
  TodayStatus,
  void,
  { rejectValue: string }
>("attendance/fetchTodayStatus", async (_, { rejectWithValue }) => {
  try {
    const response = await attendanceApi.getTodayStatus();
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch today's status";
    return rejectWithValue(message);
  }
});

/**
 * Clock in for the current user.
 * Automatically records the current timestamp and optional notes/location.
 */
export const clockIn = createAsyncThunk<
  AttendanceRecord,
  ClockInPayload | undefined,
  { rejectValue: string }
>("attendance/clockIn", async (payload, { rejectWithValue }) => {
  try {
    const response = await attendanceApi.clockIn(payload);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || "Failed to clock in";
    return rejectWithValue(message);
  }
});

/**
 * Clock out for the current user.
 * Calculates total hours worked since clock-in and optional notes.
 */
export const clockOut = createAsyncThunk<
  AttendanceRecord,
  ClockOutPayload | undefined,
  { rejectValue: string }
>("attendance/clockOut", async (payload, { rejectWithValue }) => {
  try {
    const response = await attendanceApi.clockOut(payload);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message || error.message || "Failed to clock out";
    return rejectWithValue(message);
  }
});

/**
 * Fetch attendance summary for the current user.
 * Query: ?year=2024&month=6
 */
export const fetchMySummary = createAsyncThunk<
  AttendanceSummary,
  { year?: number; month?: number } | undefined,
  { rejectValue: string }
>("attendance/fetchMySummary", async (params, { rejectWithValue }) => {
  try {
    const response = await attendanceApi.getMySummary(params);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch attendance summary";
    return rejectWithValue(message);
  }
});

/**
 * Fetch attendance summary for a specific employee.
 * Admin/HR can view any; employees can view their own.
 */
export const fetchEmployeeSummary = createAsyncThunk<
  AttendanceSummary,
  { employeeId: string; year?: number; month?: number },
  { rejectValue: string }
>(
  "attendance/fetchEmployeeSummary",
  async ({ employeeId, year, month }, { rejectWithValue }) => {
    try {
      const response = await attendanceApi.getEmployeeSummary(employeeId, {
        year,
        month,
      });
      return response.data.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch employee attendance summary";
      return rejectWithValue(message);
    }
  },
);

/**
 * Fetch today's attendance broken down by department.
 * Admin/HR only.
 */
export const fetchDepartmentSummary = createAsyncThunk<
  DepartmentAttendanceSummary[],
  void,
  { rejectValue: string }
>("attendance/fetchDepartmentSummary", async (_, { rejectWithValue }) => {
  try {
    const response = await attendanceApi.getDepartmentSummary();
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch department attendance summary";
    return rejectWithValue(message);
  }
});

/**
 * Fetch organization-wide attendance summary for today.
 * Admin/HR only.
 */
export const fetchOverallSummary = createAsyncThunk<
  OverallAttendanceSummary,
  void,
  { rejectValue: string }
>("attendance/fetchOverallSummary", async (_, { rejectWithValue }) => {
  try {
    const response = await attendanceApi.getOverallSummary();
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch overall attendance summary";
    return rejectWithValue(message);
  }
});

/**
 * Fetch monthly calendar view for the current user.
 * Query: ?year=2024&month=6
 */
export const fetchMyCalendar = createAsyncThunk<
  MonthlyCalendarDay[],
  { year?: number; month?: number } | undefined,
  { rejectValue: string }
>("attendance/fetchMyCalendar", async (params, { rejectWithValue }) => {
  try {
    const response = await attendanceApi.getMyCalendar(params);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch attendance calendar";
    return rejectWithValue(message);
  }
});

/**
 * Fetch monthly calendar view for a specific employee.
 * Admin/HR can view any; employees can view their own.
 */
export const fetchEmployeeCalendar = createAsyncThunk<
  MonthlyCalendarDay[],
  { employeeId: string; year?: number; month?: number },
  { rejectValue: string }
>(
  "attendance/fetchEmployeeCalendar",
  async ({ employeeId, year, month }, { rejectWithValue }) => {
    try {
      const response = await attendanceApi.getEmployeeCalendar(employeeId, {
        year,
        month,
      });
      return response.data.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch employee attendance calendar";
      return rejectWithValue(message);
    }
  },
);

/**
 * Create or update a manual attendance entry.
 * Admin/HR only.
 */
export const createManualAttendance = createAsyncThunk<
  AttendanceRecord,
  {
    employeeId: string;
    date: string;
    clockIn?: string;
    clockOut?: string;
    status: string;
    notes?: string;
  },
  { rejectValue: string }
>("attendance/createManualAttendance", async (payload, { rejectWithValue }) => {
  try {
    const response = await attendanceApi.createManual(payload);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to create manual attendance entry";
    return rejectWithValue(message);
  }
});

/**
 * Bulk mark attendance for multiple employees.
 * Admin/HR only.
 */
export const bulkMarkAttendance = createAsyncThunk<
  { count: number },
  {
    date: string;
    status: string;
    employeeIds?: string[];
    notes?: string;
  },
  { rejectValue: string }
>("attendance/bulkMarkAttendance", async (payload, { rejectWithValue }) => {
  try {
    const response = await attendanceApi.bulkMark(payload);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to bulk mark attendance";
    return rejectWithValue(message);
  }
});

/**
 * Delete an attendance record.
 * Admin only.
 */
export const deleteAttendance = createAsyncThunk<
  string, // Returns the deleted record's ID
  string,
  { rejectValue: string }
>("attendance/deleteAttendance", async (id, { rejectWithValue }) => {
  try {
    await attendanceApi.delete(id);
    return id;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to delete attendance record";
    return rejectWithValue(message);
  }
});

// ============================================
// Attendance Slice
// ============================================

const attendanceSlice = createSlice({
  name: "attendance",
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
      action: PayloadAction<{ key: keyof AttendanceFilters; value: string }>,
    ) {
      const { key, value } = action.payload;
      (state.filters as any)[key] = value;
      state.currentPage = 1;
    },

    /**
     * Set multiple filters at once.
     */
    setFilters(state, action: PayloadAction<Partial<AttendanceFilters>>) {
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
     * Set the calendar month and year for navigation.
     */
    setCalendarMonth(
      state,
      action: PayloadAction<{ month: number; year: number }>,
    ) {
      state.calendarMonth = action.payload.month;
      state.calendarYear = action.payload.year;
    },

    /**
     * Navigate calendar to the previous month.
     */
    prevCalendarMonth(state) {
      if (state.calendarMonth === 1) {
        state.calendarMonth = 12;
        state.calendarYear -= 1;
      } else {
        state.calendarMonth -= 1;
      }
    },

    /**
     * Navigate calendar to the next month.
     */
    nextCalendarMonth(state) {
      if (state.calendarMonth === 12) {
        state.calendarMonth = 1;
        state.calendarYear += 1;
      } else {
        state.calendarMonth += 1;
      }
    },

    /**
     * Reset calendar to the current month.
     */
    resetCalendarToToday(state) {
      const today = new Date();
      state.calendarMonth = today.getMonth() + 1;
      state.calendarYear = today.getFullYear();
    },

    /**
     * Clear the selected attendance record.
     */
    clearSelectedRecord(state) {
      state.selectedRecord = null;
    },

    /**
     * Clear clock in/out error and success states.
     */
    clearClockState(state) {
      state.clockError = null;
      state.clockSuccess = null;
    },

    /**
     * Clear today's error.
     */
    clearTodayError(state) {
      state.todayError = null;
    },

    /**
     * Clear all error states.
     */
    clearErrors(state) {
      state.error = null;
      state.clockError = null;
      state.todayError = null;
    },

    /**
     * Clear success flags (after showing notification).
     */
    clearSuccessFlags(state) {
      state.clockSuccess = null;
      state.manualEntrySuccess = false;
      state.bulkMarkSuccess = false;
    },

    /**
     * Reset the entire attendance state.
     * Used on logout or route changes that require fresh data.
     */
    resetAttendanceState() {
      return { ...initialState };
    },
  },

  extraReducers: (builder) => {
    // ---- Fetch Attendance Records ----
    builder
      .addCase(fetchAttendance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.data;
        state.meta = action.payload.meta;
        state.error = null;
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch attendance records";
      });

    // ---- Fetch Single Attendance Record ----
    builder
      .addCase(fetchAttendanceById.pending, (state) => {
        state.isSelectedLoading = true;
      })
      .addCase(
        fetchAttendanceById.fulfilled,
        (state, action: PayloadAction<AttendanceRecord>) => {
          state.isSelectedLoading = false;
          state.selectedRecord = action.payload;
        },
      )
      .addCase(fetchAttendanceById.rejected, (state) => {
        state.isSelectedLoading = false;
      });

    // ---- Fetch Today's Status ----
    builder
      .addCase(fetchTodayStatus.pending, (state) => {
        state.isTodayLoading = true;
        state.todayError = null;
      })
      .addCase(
        fetchTodayStatus.fulfilled,
        (state, action: PayloadAction<TodayStatus>) => {
          state.isTodayLoading = false;
          state.todayStatus = action.payload;
          state.todayError = null;
        },
      )
      .addCase(fetchTodayStatus.rejected, (state, action) => {
        state.isTodayLoading = false;
        state.todayError =
          action.payload || "Failed to fetch today's attendance status";
      });

    // ---- Clock In ----
    builder
      .addCase(clockIn.pending, (state) => {
        state.isClockingIn = true;
        state.clockError = null;
        state.clockSuccess = null;
      })
      .addCase(
        clockIn.fulfilled,
        (state, action: PayloadAction<AttendanceRecord>) => {
          state.isClockingIn = false;
          state.clockError = null;
          state.clockSuccess = "Clocked in successfully!";

          // Update today's status to reflect the clock-in
          state.todayStatus = {
            id: action.payload.id,
            date: action.payload.date,
            clockIn: action.payload.clockIn,
            clockOut: action.payload.clockOut,
            totalHours: action.payload.totalHours,
            status: action.payload.status,
            notes: action.payload.notes,
            isClockedIn: true,
            isClockedOut: false,
          };

          // Add to list if not already present
          const exists = state.list.some(
            (record) => record.id === action.payload.id,
          );
          if (!exists) {
            state.list.unshift(action.payload);
          }
        },
      )
      .addCase(clockIn.rejected, (state, action) => {
        state.isClockingIn = false;
        state.clockError = action.payload || "Failed to clock in";
        state.clockSuccess = null;
      });

    // ---- Clock Out ----
    builder
      .addCase(clockOut.pending, (state) => {
        state.isClockingOut = true;
        state.clockError = null;
        state.clockSuccess = null;
      })
      .addCase(
        clockOut.fulfilled,
        (state, action: PayloadAction<AttendanceRecord>) => {
          state.isClockingOut = false;
          state.clockError = null;
          state.clockSuccess = "Clocked out successfully!";

          // Update today's status to reflect the clock-out
          state.todayStatus = {
            id: action.payload.id,
            date: action.payload.date,
            clockIn: action.payload.clockIn,
            clockOut: action.payload.clockOut,
            totalHours: action.payload.totalHours,
            status: action.payload.status,
            notes: action.payload.notes,
            isClockedIn: true,
            isClockedOut: true,
          };

          // Update the record in the list if it exists
          const idx = state.list.findIndex(
            (record) => record.id === action.payload.id,
          );
          if (idx !== -1) {
            state.list[idx] = action.payload;
          }
        },
      )
      .addCase(clockOut.rejected, (state, action) => {
        state.isClockingOut = false;
        state.clockError = action.payload || "Failed to clock out";
        state.clockSuccess = null;
      });

    // ---- Fetch My Summary ----
    builder
      .addCase(fetchMySummary.pending, (state) => {
        state.isMySummaryLoading = true;
      })
      .addCase(
        fetchMySummary.fulfilled,
        (state, action: PayloadAction<AttendanceSummary>) => {
          state.isMySummaryLoading = false;
          state.mySummary = action.payload;
        },
      )
      .addCase(fetchMySummary.rejected, (state) => {
        state.isMySummaryLoading = false;
      });

    // ---- Fetch Employee Summary ----
    builder
      .addCase(fetchEmployeeSummary.pending, (state) => {
        state.isEmployeeSummaryLoading = true;
      })
      .addCase(
        fetchEmployeeSummary.fulfilled,
        (state, action: PayloadAction<AttendanceSummary>) => {
          state.isEmployeeSummaryLoading = false;
          state.employeeSummary = action.payload;
        },
      )
      .addCase(fetchEmployeeSummary.rejected, (state) => {
        state.isEmployeeSummaryLoading = false;
      });

    // ---- Fetch Department Summary ----
    builder
      .addCase(fetchDepartmentSummary.pending, (state) => {
        state.isDepartmentSummaryLoading = true;
      })
      .addCase(
        fetchDepartmentSummary.fulfilled,
        (state, action: PayloadAction<DepartmentAttendanceSummary[]>) => {
          state.isDepartmentSummaryLoading = false;
          state.departmentSummary = action.payload;
        },
      )
      .addCase(fetchDepartmentSummary.rejected, (state) => {
        state.isDepartmentSummaryLoading = false;
      });

    // ---- Fetch Overall Summary ----
    builder
      .addCase(fetchOverallSummary.pending, (state) => {
        state.isOverallSummaryLoading = true;
      })
      .addCase(
        fetchOverallSummary.fulfilled,
        (state, action: PayloadAction<OverallAttendanceSummary>) => {
          state.isOverallSummaryLoading = false;
          state.overallSummary = action.payload;
        },
      )
      .addCase(fetchOverallSummary.rejected, (state) => {
        state.isOverallSummaryLoading = false;
      });

    // ---- Fetch My Calendar ----
    builder
      .addCase(fetchMyCalendar.pending, (state) => {
        state.isCalendarLoading = true;
      })
      .addCase(
        fetchMyCalendar.fulfilled,
        (state, action: PayloadAction<MonthlyCalendarDay[]>) => {
          state.isCalendarLoading = false;
          state.calendar = action.payload;
        },
      )
      .addCase(fetchMyCalendar.rejected, (state) => {
        state.isCalendarLoading = false;
      });

    // ---- Fetch Employee Calendar ----
    builder
      .addCase(fetchEmployeeCalendar.pending, (state) => {
        state.isCalendarLoading = true;
      })
      .addCase(
        fetchEmployeeCalendar.fulfilled,
        (state, action: PayloadAction<MonthlyCalendarDay[]>) => {
          state.isCalendarLoading = false;
          state.calendar = action.payload;
        },
      )
      .addCase(fetchEmployeeCalendar.rejected, (state) => {
        state.isCalendarLoading = false;
      });

    // ---- Create Manual Attendance ----
    builder
      .addCase(createManualAttendance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.manualEntrySuccess = false;
      })
      .addCase(
        createManualAttendance.fulfilled,
        (state, action: PayloadAction<AttendanceRecord>) => {
          state.isLoading = false;
          state.error = null;
          state.manualEntrySuccess = true;

          // Add or update the record in the list
          const idx = state.list.findIndex(
            (record) => record.id === action.payload.id,
          );
          if (idx !== -1) {
            state.list[idx] = action.payload;
          } else {
            state.list.unshift(action.payload);
            if (state.meta) {
              state.meta.total += 1;
            }
          }
        },
      )
      .addCase(createManualAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error =
          action.payload || "Failed to create manual attendance entry";
        state.manualEntrySuccess = false;
      });

    // ---- Bulk Mark Attendance ----
    builder
      .addCase(bulkMarkAttendance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.bulkMarkSuccess = false;
      })
      .addCase(bulkMarkAttendance.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
        state.bulkMarkSuccess = true;
      })
      .addCase(bulkMarkAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to bulk mark attendance";
        state.bulkMarkSuccess = false;
      });

    // ---- Delete Attendance Record ----
    builder
      .addCase(deleteAttendance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        deleteAttendance.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.isLoading = false;
          state.error = null;

          // Remove from the list
          state.list = state.list.filter(
            (record) => record.id !== action.payload,
          );
          if (state.meta) {
            state.meta.total -= 1;
          }

          // Clear selected record if it was the deleted one
          if (state.selectedRecord?.id === action.payload) {
            state.selectedRecord = null;
          }
        },
      )
      .addCase(deleteAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to delete attendance record";
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
  setCalendarMonth,
  prevCalendarMonth,
  nextCalendarMonth,
  resetCalendarToToday,
  clearSelectedRecord,
  clearClockState,
  clearTodayError,
  clearErrors,
  clearSuccessFlags,
  resetAttendanceState,
} = attendanceSlice.actions;

// ============================================
// Selectors
// ============================================

export const selectAttendanceState = (state: RootState) => state.attendance;
export const selectAttendanceList = (state: RootState) => state.attendance.list;
export const selectAttendanceMeta = (state: RootState) => state.attendance.meta;
export const selectAttendanceCurrentPage = (state: RootState) =>
  state.attendance.currentPage;
export const selectAttendancePageSize = (state: RootState) =>
  state.attendance.pageSize;

// Today's status
export const selectTodayStatus = (state: RootState) =>
  state.attendance.todayStatus;
export const selectIsTodayLoading = (state: RootState) =>
  state.attendance.isTodayLoading;
export const selectTodayError = (state: RootState) =>
  state.attendance.todayError;
export const selectIsClockedIn = (state: RootState) =>
  state.attendance.todayStatus?.isClockedIn ?? false;
export const selectIsClockedOut = (state: RootState) =>
  state.attendance.todayStatus?.isClockedOut ?? false;

// Clock states
export const selectIsClockingIn = (state: RootState) =>
  state.attendance.isClockingIn;
export const selectIsClockingOut = (state: RootState) =>
  state.attendance.isClockingOut;
export const selectClockError = (state: RootState) =>
  state.attendance.clockError;
export const selectClockSuccess = (state: RootState) =>
  state.attendance.clockSuccess;

// Summaries
export const selectMySummary = (state: RootState) => state.attendance.mySummary;
export const selectIsMySummaryLoading = (state: RootState) =>
  state.attendance.isMySummaryLoading;
export const selectEmployeeSummary = (state: RootState) =>
  state.attendance.employeeSummary;
export const selectIsEmployeeSummaryLoading = (state: RootState) =>
  state.attendance.isEmployeeSummaryLoading;
export const selectDepartmentSummary = (state: RootState) =>
  state.attendance.departmentSummary;
export const selectIsDepartmentSummaryLoading = (state: RootState) =>
  state.attendance.isDepartmentSummaryLoading;
export const selectOverallSummary = (state: RootState) =>
  state.attendance.overallSummary;
export const selectIsOverallSummaryLoading = (state: RootState) =>
  state.attendance.isOverallSummaryLoading;

// Calendar
export const selectCalendar = (state: RootState) => state.attendance.calendar;
export const selectIsCalendarLoading = (state: RootState) =>
  state.attendance.isCalendarLoading;
export const selectCalendarMonth = (state: RootState) =>
  state.attendance.calendarMonth;
export const selectCalendarYear = (state: RootState) =>
  state.attendance.calendarYear;

// Selected record
export const selectSelectedRecord = (state: RootState) =>
  state.attendance.selectedRecord;
export const selectIsSelectedLoading = (state: RootState) =>
  state.attendance.isSelectedLoading;

// Filters
export const selectAttendanceFilters = (state: RootState) =>
  state.attendance.filters;

// Loading & error
export const selectAttendanceLoading = (state: RootState) =>
  state.attendance.isLoading;
export const selectAttendanceError = (state: RootState) =>
  state.attendance.error;

// Success flags
export const selectManualEntrySuccess = (state: RootState) =>
  state.attendance.manualEntrySuccess;
export const selectBulkMarkSuccess = (state: RootState) =>
  state.attendance.bulkMarkSuccess;

/**
 * Check if there are any active filters set.
 */
export const selectHasActiveAttendanceFilters = (state: RootState): boolean => {
  const { filters } = state.attendance;
  return (
    filters.employeeId !== "" ||
    filters.date !== "" ||
    filters.startDate !== "" ||
    filters.endDate !== "" ||
    filters.status !== ""
  );
};

/**
 * Compute total page count from meta.
 */
export const selectAttendanceTotalPages = (state: RootState): number =>
  state.attendance.meta?.totalPages ?? 0;

/**
 * Compute total record count from meta.
 */
export const selectAttendanceTotalRecords = (state: RootState): number =>
  state.attendance.meta?.total ?? 0;

/**
 * Derive whether the user can clock in (not yet clocked in today).
 */
export const selectCanClockIn = (state: RootState): boolean => {
  const todayStatus = state.attendance.todayStatus;
  if (!todayStatus) return true; // No status loaded yet, allow attempt
  return !todayStatus.isClockedIn;
};

/**
 * Derive whether the user can clock out (clocked in but not out).
 */
export const selectCanClockOut = (state: RootState): boolean => {
  const todayStatus = state.attendance.todayStatus;
  if (!todayStatus) return false;
  return todayStatus.isClockedIn && !todayStatus.isClockedOut;
};

/**
 * Format the calendar month/year as a readable string.
 */
export const selectCalendarLabel = (state: RootState): string => {
  const { calendarMonth, calendarYear } = state.attendance;
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${monthNames[calendarMonth - 1]} ${calendarYear}`;
};

export default attendanceSlice.reducer;
