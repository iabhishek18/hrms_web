// ============================================
// Department Redux Slice
// ============================================
// Manages department state including list, selected department,
// CRUD operations, loading states, and error handling.

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { departmentApi } from "@/api/departments";
import type {
  Department,
  DepartmentDetail,
  DepartmentListParams,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from "@/api/departments";
import type { RootState } from "@/store/store";

// ============================================
// Types
// ============================================

export interface DepartmentState {
  /** List of all departments */
  list: Department[];

  /** Currently selected/viewed department with employees */
  selected: DepartmentDetail | null;

  /** Loading states */
  isLoading: boolean;
  isDetailLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  /** Error states */
  error: string | null;
  detailError: string | null;
  createError: string | null;
  updateError: string | null;
  deleteError: string | null;

  /** Success flags for UI notifications */
  createSuccess: boolean;
  updateSuccess: boolean;
  deleteSuccess: boolean;

  /** Search / filter state */
  searchTerm: string;
  filterActive: boolean | null; // null = all, true = active only, false = inactive only

  /** Cache management */
  lastFetched: number | null;
}

// ============================================
// Initial State
// ============================================

const initialState: DepartmentState = {
  list: [],
  selected: null,

  isLoading: false,
  isDetailLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,

  error: null,
  detailError: null,
  createError: null,
  updateError: null,
  deleteError: null,

  createSuccess: false,
  updateSuccess: false,
  deleteSuccess: false,

  searchTerm: "",
  filterActive: null,

  lastFetched: null,
};

// ============================================
// Cache duration (5 minutes)
// ============================================

const CACHE_DURATION_MS = 5 * 60 * 1000;

// ============================================
// Async Thunks
// ============================================

/**
 * Fetch all departments with optional filtering.
 */
export const fetchDepartments = createAsyncThunk<
  Department[],
  DepartmentListParams | undefined,
  { rejectValue: string; state: RootState }
>(
  "departments/fetchDepartments",
  async (params, { rejectWithValue }) => {
    try {
      const response = await departmentApi.list(params);
      return response.data.data as Department[];
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch departments.";
      return rejectWithValue(message);
    }
  },
  {
    condition: (params, { getState }) => {
      const { departments } = getState();
      const { lastFetched, isLoading } = departments;

      // Don't re-fetch if already loading
      if (isLoading) return false;

      // If params are provided, always fetch (user is filtering)
      if (params && (params.search || params.isActive !== undefined))
        return true;

      // Check cache
      if (lastFetched) {
        const elapsed = Date.now() - lastFetched;
        if (elapsed < CACHE_DURATION_MS) return false;
      }

      return true;
    },
  },
);

/**
 * Force-fetch all departments (bypass cache).
 */
export const refreshDepartments = createAsyncThunk<
  Department[],
  DepartmentListParams | undefined,
  { rejectValue: string }
>("departments/refreshDepartments", async (params, { rejectWithValue }) => {
  try {
    const response = await departmentApi.list(params);
    return response.data.data as Department[];
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to refresh departments.";
    return rejectWithValue(message);
  }
});

/**
 * Fetch a single department by ID (with employees).
 */
export const fetchDepartmentById = createAsyncThunk<
  DepartmentDetail,
  string,
  { rejectValue: string }
>("departments/fetchDepartmentById", async (id, { rejectWithValue }) => {
  try {
    const response = await departmentApi.getById(id);
    return response.data.data as DepartmentDetail;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch department details.";
    return rejectWithValue(message);
  }
});

/**
 * Create a new department.
 */
export const createDepartment = createAsyncThunk<
  Department,
  CreateDepartmentPayload,
  { rejectValue: string }
>("departments/createDepartment", async (payload, { rejectWithValue }) => {
  try {
    const response = await departmentApi.create(payload);
    return response.data.data as Department;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to create department.";
    return rejectWithValue(message);
  }
});

/**
 * Update an existing department.
 */
export const updateDepartment = createAsyncThunk<
  Department,
  { id: string; payload: UpdateDepartmentPayload },
  { rejectValue: string }
>(
  "departments/updateDepartment",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await departmentApi.update(id, payload);
      return response.data.data as Department;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to update department.";
      return rejectWithValue(message);
    }
  },
);

/**
 * Delete a department.
 */
export const deleteDepartment = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("departments/deleteDepartment", async (id, { rejectWithValue }) => {
  try {
    await departmentApi.delete(id);
    return id;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to delete department.";
    return rejectWithValue(message);
  }
});

/**
 * Toggle department active status.
 */
export const toggleDepartmentActive = createAsyncThunk<
  Department,
  { id: string; isActive: boolean },
  { rejectValue: string }
>(
  "departments/toggleDepartmentActive",
  async ({ id, isActive }, { rejectWithValue }) => {
    try {
      const response = await departmentApi.toggleActive(id, isActive);
      return response.data.data as Department;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to update department status.";
      return rejectWithValue(message);
    }
  },
);

// ============================================
// Slice
// ============================================

const departmentSlice = createSlice({
  name: "departments",
  initialState,
  reducers: {
    // ---- Search & Filter ----
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },

    setFilterActive: (state, action: PayloadAction<boolean | null>) => {
      state.filterActive = action.payload;
    },

    // ---- Selection ----
    setSelectedDepartment: (
      state,
      action: PayloadAction<DepartmentDetail | null>,
    ) => {
      state.selected = action.payload;
      state.detailError = null;
    },

    clearSelectedDepartment: (state) => {
      state.selected = null;
      state.detailError = null;
    },

    // ---- Error management ----
    clearErrors: (state) => {
      state.error = null;
      state.detailError = null;
      state.createError = null;
      state.updateError = null;
      state.deleteError = null;
    },

    clearCreateError: (state) => {
      state.createError = null;
    },

    clearUpdateError: (state) => {
      state.updateError = null;
    },

    clearDeleteError: (state) => {
      state.deleteError = null;
    },

    // ---- Success flag management ----
    clearSuccessFlags: (state) => {
      state.createSuccess = false;
      state.updateSuccess = false;
      state.deleteSuccess = false;
    },

    clearCreateSuccess: (state) => {
      state.createSuccess = false;
    },

    clearUpdateSuccess: (state) => {
      state.updateSuccess = false;
    },

    clearDeleteSuccess: (state) => {
      state.deleteSuccess = false;
    },

    // ---- Cache management ----
    invalidateCache: (state) => {
      state.lastFetched = null;
    },

    // ---- Full reset ----
    resetDepartments: () => initialState,
  },

  extraReducers: (builder) => {
    // ---- fetchDepartments ----
    builder
      .addCase(fetchDepartments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch departments.";
      });

    // ---- refreshDepartments ----
    builder
      .addCase(refreshDepartments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshDepartments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(refreshDepartments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to refresh departments.";
      });

    // ---- fetchDepartmentById ----
    builder
      .addCase(fetchDepartmentById.pending, (state) => {
        state.isDetailLoading = true;
        state.detailError = null;
      })
      .addCase(fetchDepartmentById.fulfilled, (state, action) => {
        state.isDetailLoading = false;
        state.selected = action.payload;
        state.detailError = null;
      })
      .addCase(fetchDepartmentById.rejected, (state, action) => {
        state.isDetailLoading = false;
        state.detailError =
          action.payload || "Failed to fetch department details.";
      });

    // ---- createDepartment ----
    builder
      .addCase(createDepartment.pending, (state) => {
        state.isCreating = true;
        state.createError = null;
        state.createSuccess = false;
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.isCreating = false;
        state.list.push(action.payload);
        // Re-sort by name
        state.list.sort((a, b) => a.name.localeCompare(b.name));
        state.createSuccess = true;
        state.createError = null;
      })
      .addCase(createDepartment.rejected, (state, action) => {
        state.isCreating = false;
        state.createError = action.payload || "Failed to create department.";
        state.createSuccess = false;
      });

    // ---- updateDepartment ----
    builder
      .addCase(updateDepartment.pending, (state) => {
        state.isUpdating = true;
        state.updateError = null;
        state.updateSuccess = false;
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        state.isUpdating = false;
        // Replace the department in the list
        const index = state.list.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        // Update selected if viewing this department
        if (state.selected && state.selected.id === action.payload.id) {
          state.selected = {
            ...state.selected,
            ...action.payload,
          };
        }
        // Re-sort by name
        state.list.sort((a, b) => a.name.localeCompare(b.name));
        state.updateSuccess = true;
        state.updateError = null;
      })
      .addCase(updateDepartment.rejected, (state, action) => {
        state.isUpdating = false;
        state.updateError = action.payload || "Failed to update department.";
        state.updateSuccess = false;
      });

    // ---- deleteDepartment ----
    builder
      .addCase(deleteDepartment.pending, (state) => {
        state.isDeleting = true;
        state.deleteError = null;
        state.deleteSuccess = false;
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.list = state.list.filter((d) => d.id !== action.payload);
        // Clear selected if it was the deleted department
        if (state.selected?.id === action.payload) {
          state.selected = null;
        }
        state.deleteSuccess = true;
        state.deleteError = null;
      })
      .addCase(deleteDepartment.rejected, (state, action) => {
        state.isDeleting = false;
        state.deleteError = action.payload || "Failed to delete department.";
        state.deleteSuccess = false;
      });

    // ---- toggleDepartmentActive ----
    builder
      .addCase(toggleDepartmentActive.pending, (state) => {
        state.isUpdating = true;
        state.updateError = null;
      })
      .addCase(toggleDepartmentActive.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.list.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.selected && state.selected.id === action.payload.id) {
          state.selected = {
            ...state.selected,
            ...action.payload,
          };
        }
        state.updateSuccess = true;
        state.updateError = null;
      })
      .addCase(toggleDepartmentActive.rejected, (state, action) => {
        state.isUpdating = false;
        state.updateError =
          action.payload || "Failed to toggle department status.";
      });
  },
});

// ============================================
// Actions
// ============================================

export const {
  setSearchTerm,
  setFilterActive,
  setSelectedDepartment,
  clearSelectedDepartment,
  clearErrors,
  clearCreateError,
  clearUpdateError,
  clearDeleteError,
  clearSuccessFlags,
  clearCreateSuccess,
  clearUpdateSuccess,
  clearDeleteSuccess,
  invalidateCache,
  resetDepartments,
} = departmentSlice.actions;

// ============================================
// Selectors
// ============================================

/** Select the full department state slice */
export const selectDepartmentState = (state: RootState) => state.departments;

/** Select the list of all departments */
export const selectDepartmentList = (state: RootState) =>
  state.departments.list;

/** Select the currently selected department */
export const selectSelectedDepartment = (state: RootState) =>
  state.departments.selected;

/** Select loading states */
export const selectDepartmentsLoading = (state: RootState) =>
  state.departments.isLoading;
export const selectDepartmentDetailLoading = (state: RootState) =>
  state.departments.isDetailLoading;
export const selectIsCreating = (state: RootState) =>
  state.departments.isCreating;
export const selectIsUpdating = (state: RootState) =>
  state.departments.isUpdating;
export const selectIsDeleting = (state: RootState) =>
  state.departments.isDeleting;

/** Select error states */
export const selectDepartmentError = (state: RootState) =>
  state.departments.error;
export const selectDepartmentDetailError = (state: RootState) =>
  state.departments.detailError;
export const selectCreateError = (state: RootState) =>
  state.departments.createError;
export const selectUpdateError = (state: RootState) =>
  state.departments.updateError;
export const selectDeleteError = (state: RootState) =>
  state.departments.deleteError;

/** Select success flags */
export const selectCreateSuccess = (state: RootState) =>
  state.departments.createSuccess;
export const selectUpdateSuccess = (state: RootState) =>
  state.departments.updateSuccess;
export const selectDeleteSuccess = (state: RootState) =>
  state.departments.deleteSuccess;

/** Select search/filter */
export const selectSearchTerm = (state: RootState) =>
  state.departments.searchTerm;
export const selectFilterActive = (state: RootState) =>
  state.departments.filterActive;

/** Select filtered departments list (local client-side filtering) */
export const selectFilteredDepartments = (state: RootState): Department[] => {
  const { list, searchTerm, filterActive } = state.departments;
  let filtered = list;

  // Filter by active status
  if (filterActive !== null) {
    filtered = filtered.filter((d) => d.isActive === filterActive);
  }

  // Filter by search term
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        d.code.toLowerCase().includes(term) ||
        (d.description && d.description.toLowerCase().includes(term)),
    );
  }

  return filtered;
};

/** Select total employee count across all departments */
export const selectTotalEmployeeCount = (state: RootState): number =>
  state.departments.list.reduce((sum, d) => sum + d.employeeCount, 0);

/** Select count of active departments */
export const selectActiveDepartmentCount = (state: RootState): number =>
  state.departments.list.filter((d) => d.isActive).length;

/** Check if the department cache is stale */
export const selectIsCacheStale = (state: RootState): boolean => {
  const { lastFetched } = state.departments;
  if (!lastFetched) return true;
  return Date.now() - lastFetched > CACHE_DURATION_MS;
};

// ============================================
// Export Reducer
// ============================================

export default departmentSlice.reducer;
