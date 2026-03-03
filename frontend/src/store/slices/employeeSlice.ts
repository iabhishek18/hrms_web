// ============================================
// Employee Redux Slice
// ============================================
// Manages employee state including list, selected employee,
// filters, pagination, and CRUD operations.
// Uses createAsyncThunk for API calls.

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import { employeeApi } from "@/api/employees";
import type {
  EmployeeListItem,
  EmployeeDetail,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  EmployeeListParams,
  EmployeeSearchResult,
  EmployeeStatsSummary,
  DepartmentCount,
  TopPerformer,
  TopAbsentee,
  PaginationMeta,
} from "@/api/employees";

// ============================================
// Types
// ============================================

export interface EmployeeFilters {
  search: string;
  departmentId: string;
  status: string;
  employmentType: string;
  gender: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface EmployeeState {
  // List
  list: EmployeeListItem[];
  meta: PaginationMeta | null;
  currentPage: number;
  pageSize: number;

  // Selected employee (for detail/edit view)
  selectedEmployee: EmployeeDetail | null;
  isSelectedLoading: boolean;
  selectedError: string | null;

  // Filters
  filters: EmployeeFilters;

  // Search (autocomplete)
  searchResults: EmployeeSearchResult[];
  isSearching: boolean;

  // Stats
  stats: EmployeeStatsSummary | null;
  departmentCounts: DepartmentCount[];
  topPerformers: TopPerformer[];
  topAbsentees: TopAbsentee[];

  // Recent joiners
  recentJoiners: EmployeeListItem[];

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isStatsLoading: boolean;

  // Error states
  error: string | null;
  createError: string | null;
  updateError: string | null;
  deleteError: string | null;

  // Success flags for notifications
  createSuccess: boolean;
  updateSuccess: boolean;
  deleteSuccess: boolean;
}

// ============================================
// Default Filters
// ============================================

const defaultFilters: EmployeeFilters = {
  search: "",
  departmentId: "",
  status: "",
  employmentType: "",
  gender: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

// ============================================
// Initial State
// ============================================

const initialState: EmployeeState = {
  list: [],
  meta: null,
  currentPage: 1,
  pageSize: 10,

  selectedEmployee: null,
  isSelectedLoading: false,
  selectedError: null,

  filters: { ...defaultFilters },

  searchResults: [],
  isSearching: false,

  stats: null,
  departmentCounts: [],
  topPerformers: [],
  topAbsentees: [],

  recentJoiners: [],

  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  isStatsLoading: false,

  error: null,
  createError: null,
  updateError: null,
  deleteError: null,

  createSuccess: false,
  updateSuccess: false,
  deleteSuccess: false,
};

// ============================================
// Async Thunks
// ============================================

/**
 * Fetch employees list with current filters and pagination.
 */
export const fetchEmployees = createAsyncThunk<
  { data: EmployeeListItem[]; meta: PaginationMeta },
  EmployeeListParams | undefined,
  { rejectValue: string; state: RootState }
>("employees/fetchEmployees", async (params, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const { filters, currentPage, pageSize } = state.employees;

    // Merge explicit params with current state filters
    const queryParams: EmployeeListParams = {
      page: params?.page ?? currentPage,
      limit: params?.limit ?? pageSize,
      search: (params?.search ?? filters.search) || undefined,
      departmentId: (params?.departmentId ?? filters.departmentId) || undefined,
      status: (params?.status ?? filters.status) || undefined,
      employmentType:
        (params?.employmentType ?? filters.employmentType) || undefined,
      gender: (params?.gender ?? filters.gender) || undefined,
      sortBy: params?.sortBy ?? filters.sortBy,
      sortOrder: params?.sortOrder ?? filters.sortOrder,
    };

    // Remove undefined values
    Object.keys(queryParams).forEach((key) => {
      if ((queryParams as any)[key] === undefined) {
        delete (queryParams as any)[key];
      }
    });

    const response = await employeeApi.list(queryParams);
    // The response shape is nested: response.data.data contains { data, meta }
    // Handle both flat and nested shapes from the API
    const responseData = response.data.data;

    if (responseData && "data" in responseData && "meta" in responseData) {
      return {
        data: (responseData as any).data as EmployeeListItem[],
        meta: (responseData as any).meta as PaginationMeta,
      };
    }

    // If the response is already flat (just an array), wrap it
    if (Array.isArray(responseData)) {
      return {
        data: responseData,
        meta: response.data.meta || {
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
      data: responseData as unknown as EmployeeListItem[],
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
      "Failed to fetch employees";
    return rejectWithValue(message);
  }
});

/**
 * Fetch a single employee by ID (full detail).
 */
export const fetchEmployeeById = createAsyncThunk<
  EmployeeDetail,
  string,
  { rejectValue: string }
>("employees/fetchEmployeeById", async (id, { rejectWithValue }) => {
  try {
    const response = await employeeApi.getById(id);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch employee details";
    return rejectWithValue(message);
  }
});

/**
 * Create a new employee.
 */
export const createEmployee = createAsyncThunk<
  EmployeeDetail,
  CreateEmployeePayload,
  { rejectValue: string }
>("employees/createEmployee", async (payload, { rejectWithValue }) => {
  try {
    const response = await employeeApi.create(payload);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to create employee";
    return rejectWithValue(message);
  }
});

/**
 * Update an existing employee.
 */
export const updateEmployee = createAsyncThunk<
  EmployeeDetail,
  { id: string; data: UpdateEmployeePayload },
  { rejectValue: string }
>("employees/updateEmployee", async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await employeeApi.update(id, data);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to update employee";
    return rejectWithValue(message);
  }
});

/**
 * Delete an employee by ID.
 */
export const deleteEmployee = createAsyncThunk<
  string, // Returns the deleted employee's ID
  string,
  { rejectValue: string }
>("employees/deleteEmployee", async (id, { rejectWithValue }) => {
  try {
    await employeeApi.delete(id);
    return id;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to delete employee";
    return rejectWithValue(message);
  }
});

/**
 * Quick search / autocomplete across employee name, email, and ID.
 */
export const searchEmployees = createAsyncThunk<
  EmployeeSearchResult[],
  { query: string; limit?: number },
  { rejectValue: string }
>(
  "employees/searchEmployees",
  async ({ query, limit = 10 }, { rejectWithValue }) => {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }
      const response = await employeeApi.search(query.trim(), limit);
      return response.data.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || "Search failed";
      return rejectWithValue(message);
    }
  },
);

/**
 * Fetch employee statistics summary.
 */
export const fetchEmployeeStats = createAsyncThunk<
  EmployeeStatsSummary,
  void,
  { rejectValue: string }
>("employees/fetchEmployeeStats", async (_, { rejectWithValue }) => {
  try {
    const response = await employeeApi.stats();
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch employee statistics";
    return rejectWithValue(message);
  }
});

/**
 * Fetch employee count grouped by department.
 */
export const fetchDepartmentCounts = createAsyncThunk<
  DepartmentCount[],
  void,
  { rejectValue: string }
>("employees/fetchDepartmentCounts", async (_, { rejectWithValue }) => {
  try {
    const response = await employeeApi.departmentCount();
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch department counts";
    return rejectWithValue(message);
  }
});

/**
 * Fetch top performing employees.
 */
export const fetchTopPerformers = createAsyncThunk<
  TopPerformer[],
  number | undefined,
  { rejectValue: string }
>("employees/fetchTopPerformers", async (limit = 5, { rejectWithValue }) => {
  try {
    const response = await employeeApi.topPerformers(limit);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch top performers";
    return rejectWithValue(message);
  }
});

/**
 * Fetch top absentee employees.
 */
export const fetchTopAbsentees = createAsyncThunk<
  TopAbsentee[],
  number | undefined,
  { rejectValue: string }
>("employees/fetchTopAbsentees", async (limit = 5, { rejectWithValue }) => {
  try {
    const response = await employeeApi.topAbsentees(limit);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch top absentees";
    return rejectWithValue(message);
  }
});

/**
 * Fetch recently joined employees.
 */
export const fetchRecentJoiners = createAsyncThunk<
  EmployeeListItem[],
  number | undefined,
  { rejectValue: string }
>("employees/fetchRecentJoiners", async (limit = 5, { rejectWithValue }) => {
  try {
    const response = await employeeApi.recent(limit);
    return response.data.data;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch recent joiners";
    return rejectWithValue(message);
  }
});

// ============================================
// Employee Slice
// ============================================

const employeeSlice = createSlice({
  name: "employees",
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
      state.currentPage = 1; // Reset to first page when changing page size
    },

    /**
     * Update a single filter field and reset to page 1.
     */
    setFilter(
      state,
      action: PayloadAction<{ key: keyof EmployeeFilters; value: string }>,
    ) {
      const { key, value } = action.payload;
      (state.filters as any)[key] = value;
      state.currentPage = 1; // Reset pagination when filters change
    },

    /**
     * Set multiple filters at once.
     */
    setFilters(state, action: PayloadAction<Partial<EmployeeFilters>>) {
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
     * Set the search query for filtering.
     */
    setSearchQuery(state, action: PayloadAction<string>) {
      state.filters.search = action.payload;
      state.currentPage = 1;
    },

    /**
     * Set the sort configuration.
     */
    setSort(
      state,
      action: PayloadAction<{ sortBy: string; sortOrder: "asc" | "desc" }>,
    ) {
      state.filters.sortBy = action.payload.sortBy;
      state.filters.sortOrder = action.payload.sortOrder;
    },

    /**
     * Clear the selected employee (when navigating away from detail view).
     */
    clearSelectedEmployee(state) {
      state.selectedEmployee = null;
      state.selectedError = null;
    },

    /**
     * Set the selected employee directly (e.g., from list item click).
     */
    setSelectedEmployee(state, action: PayloadAction<EmployeeDetail>) {
      state.selectedEmployee = action.payload;
    },

    /**
     * Clear search results.
     */
    clearSearchResults(state) {
      state.searchResults = [];
    },

    /**
     * Clear all error states.
     */
    clearErrors(state) {
      state.error = null;
      state.createError = null;
      state.updateError = null;
      state.deleteError = null;
      state.selectedError = null;
    },

    /**
     * Clear success flags (after showing notification).
     */
    clearSuccessFlags(state) {
      state.createSuccess = false;
      state.updateSuccess = false;
      state.deleteSuccess = false;
    },

    /**
     * Reset the entire employee state.
     * Used on logout or route changes that require fresh data.
     */
    resetEmployeeState() {
      return { ...initialState };
    },
  },

  extraReducers: (builder) => {
    // ---- Fetch Employees List ----
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.data;
        state.meta = action.payload.meta;
        state.error = null;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch employees";
      });

    // ---- Fetch Single Employee ----
    builder
      .addCase(fetchEmployeeById.pending, (state) => {
        state.isSelectedLoading = true;
        state.selectedError = null;
      })
      .addCase(
        fetchEmployeeById.fulfilled,
        (state, action: PayloadAction<EmployeeDetail>) => {
          state.isSelectedLoading = false;
          state.selectedEmployee = action.payload;
          state.selectedError = null;
        },
      )
      .addCase(fetchEmployeeById.rejected, (state, action) => {
        state.isSelectedLoading = false;
        state.selectedError =
          action.payload || "Failed to fetch employee details";
      });

    // ---- Create Employee ----
    builder
      .addCase(createEmployee.pending, (state) => {
        state.isCreating = true;
        state.createError = null;
        state.createSuccess = false;
      })
      .addCase(
        createEmployee.fulfilled,
        (state, action: PayloadAction<EmployeeDetail>) => {
          state.isCreating = false;
          state.createError = null;
          state.createSuccess = true;
          // Add the newly created employee to the top of the list
          // (it will be refreshed on next fetch, but this gives instant feedback)
          const newListItem: EmployeeListItem = {
            id: action.payload.id,
            employeeId: action.payload.employeeId,
            firstName: action.payload.firstName,
            lastName: action.payload.lastName,
            email: action.payload.email,
            phone: action.payload.phone,
            designation: action.payload.designation,
            status: action.payload.status,
            avatar: action.payload.avatar,
            joiningDate: action.payload.joiningDate,
            employmentType: action.payload.employmentType,
            department: action.payload.department
              ? {
                  id: action.payload.department.id,
                  name: action.payload.department.name,
                }
              : null,
          };
          state.list.unshift(newListItem);
          if (state.meta) {
            state.meta.total += 1;
          }
        },
      )
      .addCase(createEmployee.rejected, (state, action) => {
        state.isCreating = false;
        state.createError = action.payload || "Failed to create employee";
        state.createSuccess = false;
      });

    // ---- Update Employee ----
    builder
      .addCase(updateEmployee.pending, (state) => {
        state.isUpdating = true;
        state.updateError = null;
        state.updateSuccess = false;
      })
      .addCase(
        updateEmployee.fulfilled,
        (state, action: PayloadAction<EmployeeDetail>) => {
          state.isUpdating = false;
          state.updateError = null;
          state.updateSuccess = true;
          state.selectedEmployee = action.payload;

          // Update the item in the list if it exists
          const idx = state.list.findIndex(
            (emp) => emp.id === action.payload.id,
          );
          if (idx !== -1) {
            state.list[idx] = {
              id: action.payload.id,
              employeeId: action.payload.employeeId,
              firstName: action.payload.firstName,
              lastName: action.payload.lastName,
              email: action.payload.email,
              phone: action.payload.phone,
              designation: action.payload.designation,
              status: action.payload.status,
              avatar: action.payload.avatar,
              joiningDate: action.payload.joiningDate,
              employmentType: action.payload.employmentType,
              department: action.payload.department
                ? {
                    id: action.payload.department.id,
                    name: action.payload.department.name,
                  }
                : null,
            };
          }
        },
      )
      .addCase(updateEmployee.rejected, (state, action) => {
        state.isUpdating = false;
        state.updateError = action.payload || "Failed to update employee";
        state.updateSuccess = false;
      });

    // ---- Delete Employee ----
    builder
      .addCase(deleteEmployee.pending, (state) => {
        state.isDeleting = true;
        state.deleteError = null;
        state.deleteSuccess = false;
      })
      .addCase(
        deleteEmployee.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.isDeleting = false;
          state.deleteError = null;
          state.deleteSuccess = true;

          // Remove from the list
          state.list = state.list.filter((emp) => emp.id !== action.payload);
          if (state.meta) {
            state.meta.total -= 1;
          }

          // Clear selected employee if it was the deleted one
          if (state.selectedEmployee?.id === action.payload) {
            state.selectedEmployee = null;
          }
        },
      )
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.isDeleting = false;
        state.deleteError = action.payload || "Failed to delete employee";
        state.deleteSuccess = false;
      });

    // ---- Search Employees ----
    builder
      .addCase(searchEmployees.pending, (state) => {
        state.isSearching = true;
      })
      .addCase(
        searchEmployees.fulfilled,
        (state, action: PayloadAction<EmployeeSearchResult[]>) => {
          state.isSearching = false;
          state.searchResults = action.payload;
        },
      )
      .addCase(searchEmployees.rejected, (state) => {
        state.isSearching = false;
        state.searchResults = [];
      });

    // ---- Fetch Employee Stats ----
    builder
      .addCase(fetchEmployeeStats.pending, (state) => {
        state.isStatsLoading = true;
      })
      .addCase(
        fetchEmployeeStats.fulfilled,
        (state, action: PayloadAction<EmployeeStatsSummary>) => {
          state.isStatsLoading = false;
          state.stats = action.payload;
        },
      )
      .addCase(fetchEmployeeStats.rejected, (state) => {
        state.isStatsLoading = false;
      });

    // ---- Fetch Department Counts ----
    builder.addCase(
      fetchDepartmentCounts.fulfilled,
      (state, action: PayloadAction<DepartmentCount[]>) => {
        state.departmentCounts = action.payload;
      },
    );

    // ---- Fetch Top Performers ----
    builder.addCase(
      fetchTopPerformers.fulfilled,
      (state, action: PayloadAction<TopPerformer[]>) => {
        state.topPerformers = action.payload;
      },
    );

    // ---- Fetch Top Absentees ----
    builder.addCase(
      fetchTopAbsentees.fulfilled,
      (state, action: PayloadAction<TopAbsentee[]>) => {
        state.topAbsentees = action.payload;
      },
    );

    // ---- Fetch Recent Joiners ----
    builder.addCase(
      fetchRecentJoiners.fulfilled,
      (state, action: PayloadAction<EmployeeListItem[]>) => {
        state.recentJoiners = action.payload;
      },
    );
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
  setSearchQuery,
  setSort,
  clearSelectedEmployee,
  setSelectedEmployee,
  clearSearchResults,
  clearErrors,
  clearSuccessFlags,
  resetEmployeeState,
} = employeeSlice.actions;

// ============================================
// Selectors
// ============================================

export const selectEmployeeState = (state: RootState) => state.employees;
export const selectEmployeeList = (state: RootState) => state.employees.list;
export const selectEmployeeMeta = (state: RootState) => state.employees.meta;
export const selectEmployeeCurrentPage = (state: RootState) =>
  state.employees.currentPage;
export const selectEmployeePageSize = (state: RootState) =>
  state.employees.pageSize;
export const selectSelectedEmployee = (state: RootState) =>
  state.employees.selectedEmployee;
export const selectIsSelectedLoading = (state: RootState) =>
  state.employees.isSelectedLoading;
export const selectEmployeeFilters = (state: RootState) =>
  state.employees.filters;
export const selectSearchResults = (state: RootState) =>
  state.employees.searchResults;
export const selectIsSearching = (state: RootState) =>
  state.employees.isSearching;
export const selectEmployeeStats = (state: RootState) => state.employees.stats;
export const selectDepartmentCounts = (state: RootState) =>
  state.employees.departmentCounts;
export const selectEmployeeTopPerformers = (state: RootState) =>
  state.employees.topPerformers;
export const selectEmployeeTopAbsentees = (state: RootState) =>
  state.employees.topAbsentees;
export const selectRecentJoiners = (state: RootState) =>
  state.employees.recentJoiners;
export const selectEmployeesLoading = (state: RootState) =>
  state.employees.isLoading;
export const selectIsCreating = (state: RootState) =>
  state.employees.isCreating;
export const selectIsUpdating = (state: RootState) =>
  state.employees.isUpdating;
export const selectIsDeleting = (state: RootState) =>
  state.employees.isDeleting;
export const selectEmployeeError = (state: RootState) => state.employees.error;
export const selectCreateError = (state: RootState) =>
  state.employees.createError;
export const selectUpdateError = (state: RootState) =>
  state.employees.updateError;
export const selectDeleteError = (state: RootState) =>
  state.employees.deleteError;
export const selectCreateSuccess = (state: RootState) =>
  state.employees.createSuccess;
export const selectUpdateSuccess = (state: RootState) =>
  state.employees.updateSuccess;
export const selectDeleteSuccess = (state: RootState) =>
  state.employees.deleteSuccess;

/**
 * Selector that checks if there are any active filters set.
 */
export const selectHasActiveFilters = (state: RootState): boolean => {
  const { filters } = state.employees;
  return (
    filters.search !== "" ||
    filters.departmentId !== "" ||
    filters.status !== "" ||
    filters.employmentType !== "" ||
    filters.gender !== ""
  );
};

/**
 * Selector that computes total page count from meta.
 */
export const selectTotalPages = (state: RootState): number =>
  state.employees.meta?.totalPages ?? 0;

/**
 * Selector that computes total employee count from meta.
 */
export const selectTotalEmployees = (state: RootState): number =>
  state.employees.meta?.total ?? 0;

export default employeeSlice.reducer;
