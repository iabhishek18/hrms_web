// ============================================
// Settings Redux Slice
// ============================================
// Manages system settings state including fetching,
// updating (single & bulk), deleting settings, loading
// states, error handling, and grouped settings cache.

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { settingsApi } from "@/api/settings";
import type {
  Setting,
  GroupedSettings,
  SettingsListResponse,
  UpdateSettingPayload,
  BulkUpdateSettingsPayload,
} from "@/api/settings";
import type { RootState } from "@/store/store";

// ============================================
// Types
// ============================================

export interface SettingsState {
  /** Flat list of all settings */
  list: Setting[];

  /** Settings grouped by their group field (e.g., { general: { key: value } }) */
  grouped: GroupedSettings;

  /** Available setting group names */
  groups: string[];

  /** Currently active tab/group in the settings UI */
  activeGroup: string;

  /** Loading states */
  isLoading: boolean;
  isGroupsLoading: boolean;
  isSaving: boolean;
  isBulkSaving: boolean;
  isDeleting: boolean;

  /** Error states */
  error: string | null;
  saveError: string | null;
  deleteError: string | null;

  /** Success flags for UI notifications */
  saveSuccess: boolean;
  bulkSaveSuccess: boolean;
  deleteSuccess: boolean;

  /** Tracks which settings have been modified locally (dirty state) */
  dirtyKeys: string[];

  /** Cache management */
  lastFetched: number | null;
}

// ============================================
// Initial State
// ============================================

const initialState: SettingsState = {
  list: [],
  grouped: {},
  groups: [],
  activeGroup: "general",

  isLoading: false,
  isGroupsLoading: false,
  isSaving: false,
  isBulkSaving: false,
  isDeleting: false,

  error: null,
  saveError: null,
  deleteError: null,

  saveSuccess: false,
  bulkSaveSuccess: false,
  deleteSuccess: false,

  dirtyKeys: [],

  lastFetched: null,
};

// ============================================
// Cache duration (3 minutes)
// ============================================

const CACHE_DURATION_MS = 3 * 60 * 1000;

// ============================================
// Async Thunks
// ============================================

/**
 * Fetch all settings, optionally filtered by group.
 */
export const fetchSettings = createAsyncThunk<
  SettingsListResponse,
  { group?: string; force?: boolean } | undefined,
  { rejectValue: string; state: RootState }
>(
  "settings/fetchSettings",
  async (params, { rejectWithValue }) => {
    try {
      const response = await settingsApi.list(
        params?.group ? { group: params.group } : undefined,
      );
      return response.data.data as SettingsListResponse;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch settings.";
      return rejectWithValue(message);
    }
  },
  {
    condition: (params, { getState }) => {
      const { settings } = getState();
      const { isLoading, lastFetched } = settings;

      // Don't refetch if already loading
      if (isLoading) return false;

      // Force fetch bypasses cache
      if (params?.force) return true;

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
 * Fetch all available setting group names.
 */
export const fetchSettingGroups = createAsyncThunk<
  string[],
  void,
  { rejectValue: string }
>("settings/fetchSettingGroups", async (_, { rejectWithValue }) => {
  try {
    const response = await settingsApi.getGroups();
    return response.data.data as string[];
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to fetch setting groups.";
    return rejectWithValue(message);
  }
});

/**
 * Fetch a single setting by key.
 */
export const fetchSettingByKey = createAsyncThunk<
  Setting,
  string,
  { rejectValue: string }
>("settings/fetchSettingByKey", async (key, { rejectWithValue }) => {
  try {
    const response = await settingsApi.getByKey(key);
    return response.data.data as Setting;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      `Failed to fetch setting "${key}".`;
    return rejectWithValue(message);
  }
});

/**
 * Create or update a single setting (upsert).
 */
export const saveSetting = createAsyncThunk<
  Setting,
  UpdateSettingPayload,
  { rejectValue: string }
>("settings/saveSetting", async (payload, { rejectWithValue }) => {
  try {
    const response = await settingsApi.update(payload);
    return response.data.data as Setting;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to save setting.";
    return rejectWithValue(message);
  }
});

/**
 * Bulk create/update multiple settings at once.
 */
export const bulkSaveSettings = createAsyncThunk<
  Setting[],
  BulkUpdateSettingsPayload,
  { rejectValue: string }
>("settings/bulkSaveSettings", async (payload, { rejectWithValue }) => {
  try {
    const response = await settingsApi.bulkUpdate(payload);
    return response.data.data as Setting[];
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to save settings.";
    return rejectWithValue(message);
  }
});

/**
 * Delete a setting by key.
 */
export const deleteSetting = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("settings/deleteSetting", async (key, { rejectWithValue }) => {
  try {
    await settingsApi.delete(key);
    return key;
  } catch (error: any) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to delete setting.";
    return rejectWithValue(message);
  }
});

// ============================================
// Helper: rebuild grouped settings from flat list
// ============================================

function buildGroupedSettings(settings: Setting[]): GroupedSettings {
  const grouped: GroupedSettings = {};
  for (const setting of settings) {
    if (!grouped[setting.group]) {
      grouped[setting.group] = {};
    }
    grouped[setting.group][setting.key] = setting.value;
  }
  return grouped;
}

// ============================================
// Slice
// ============================================

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    // ---- Active group / tab management ----
    setActiveGroup: (state, action: PayloadAction<string>) => {
      state.activeGroup = action.payload;
    },

    // ---- Dirty tracking ----
    markDirty: (state, action: PayloadAction<string>) => {
      if (!state.dirtyKeys.includes(action.payload)) {
        state.dirtyKeys.push(action.payload);
      }
    },

    markClean: (state, action: PayloadAction<string>) => {
      state.dirtyKeys = state.dirtyKeys.filter((k) => k !== action.payload);
    },

    clearDirtyKeys: (state) => {
      state.dirtyKeys = [];
    },

    // ---- Optimistic local update ----
    updateLocalSetting: (
      state,
      action: PayloadAction<{ key: string; value: string; group?: string }>,
    ) => {
      const { key, value, group } = action.payload;

      // Update in flat list
      const index = state.list.findIndex((s) => s.key === key);
      if (index !== -1) {
        state.list[index].value = value;
        if (group) {
          state.list[index].group = group;
        }
      }

      // Update in grouped
      const settingGroup =
        group || (index !== -1 ? state.list[index].group : "general");
      if (!state.grouped[settingGroup]) {
        state.grouped[settingGroup] = {};
      }
      state.grouped[settingGroup][key] = value;

      // Mark as dirty
      if (!state.dirtyKeys.includes(key)) {
        state.dirtyKeys.push(key);
      }
    },

    // ---- Error management ----
    clearErrors: (state) => {
      state.error = null;
      state.saveError = null;
      state.deleteError = null;
    },

    clearSaveError: (state) => {
      state.saveError = null;
    },

    clearDeleteError: (state) => {
      state.deleteError = null;
    },

    // ---- Success flag management ----
    clearSuccessFlags: (state) => {
      state.saveSuccess = false;
      state.bulkSaveSuccess = false;
      state.deleteSuccess = false;
    },

    clearSaveSuccess: (state) => {
      state.saveSuccess = false;
    },

    clearBulkSaveSuccess: (state) => {
      state.bulkSaveSuccess = false;
    },

    clearDeleteSuccess: (state) => {
      state.deleteSuccess = false;
    },

    // ---- Cache management ----
    invalidateCache: (state) => {
      state.lastFetched = null;
    },

    // ---- Full reset ----
    resetSettings: () => initialState,
  },

  extraReducers: (builder) => {
    // ---- fetchSettings ----
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.settings;
        state.grouped = action.payload.grouped;
        state.lastFetched = Date.now();
        state.error = null;

        // Extract unique group names from the returned data
        const groupSet = new Set<string>();
        for (const setting of action.payload.settings) {
          groupSet.add(setting.group);
        }
        const fetchedGroups = Array.from(groupSet).sort();
        // Merge with any previously fetched groups (don't lose groups that have no settings)
        const mergedGroups = new Set([...state.groups, ...fetchedGroups]);
        state.groups = Array.from(mergedGroups).sort();
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Failed to fetch settings.";
      });

    // ---- fetchSettingGroups ----
    builder
      .addCase(fetchSettingGroups.pending, (state) => {
        state.isGroupsLoading = true;
      })
      .addCase(fetchSettingGroups.fulfilled, (state, action) => {
        state.isGroupsLoading = false;
        state.groups = action.payload;
        // Set active group to first if current active group doesn't exist
        if (
          action.payload.length > 0 &&
          !action.payload.includes(state.activeGroup)
        ) {
          state.activeGroup = action.payload[0];
        }
      })
      .addCase(fetchSettingGroups.rejected, (state) => {
        state.isGroupsLoading = false;
        // Don't overwrite main error; groups loading failure is non-critical
      });

    // ---- fetchSettingByKey ----
    builder.addCase(fetchSettingByKey.fulfilled, (state, action) => {
      const setting = action.payload;
      // Upsert in flat list
      const index = state.list.findIndex((s) => s.key === setting.key);
      if (index !== -1) {
        state.list[index] = setting;
      } else {
        state.list.push(setting);
      }
      // Update grouped
      if (!state.grouped[setting.group]) {
        state.grouped[setting.group] = {};
      }
      state.grouped[setting.group][setting.key] = setting.value;
    });

    // ---- saveSetting ----
    builder
      .addCase(saveSetting.pending, (state) => {
        state.isSaving = true;
        state.saveError = null;
        state.saveSuccess = false;
      })
      .addCase(saveSetting.fulfilled, (state, action) => {
        state.isSaving = false;
        state.saveSuccess = true;
        state.saveError = null;

        const setting = action.payload;

        // Upsert in flat list
        const index = state.list.findIndex((s) => s.key === setting.key);
        if (index !== -1) {
          state.list[index] = setting;
        } else {
          state.list.push(setting);
        }

        // Update grouped
        if (!state.grouped[setting.group]) {
          state.grouped[setting.group] = {};
        }
        state.grouped[setting.group][setting.key] = setting.value;

        // Remove from dirty list
        state.dirtyKeys = state.dirtyKeys.filter((k) => k !== setting.key);

        // Update groups list if new group
        if (!state.groups.includes(setting.group)) {
          state.groups.push(setting.group);
          state.groups.sort();
        }
      })
      .addCase(saveSetting.rejected, (state, action) => {
        state.isSaving = false;
        state.saveError = action.payload || "Failed to save setting.";
        state.saveSuccess = false;
      });

    // ---- bulkSaveSettings ----
    builder
      .addCase(bulkSaveSettings.pending, (state) => {
        state.isBulkSaving = true;
        state.saveError = null;
        state.bulkSaveSuccess = false;
      })
      .addCase(bulkSaveSettings.fulfilled, (state, action) => {
        state.isBulkSaving = false;
        state.bulkSaveSuccess = true;
        state.saveError = null;

        // Update each setting in the flat list and grouped map
        for (const setting of action.payload) {
          const index = state.list.findIndex((s) => s.key === setting.key);
          if (index !== -1) {
            state.list[index] = setting;
          } else {
            state.list.push(setting);
          }

          if (!state.grouped[setting.group]) {
            state.grouped[setting.group] = {};
          }
          state.grouped[setting.group][setting.key] = setting.value;

          // Update groups list if new group
          if (!state.groups.includes(setting.group)) {
            state.groups.push(setting.group);
          }
        }

        state.groups.sort();

        // Clear all dirty keys since bulk save succeeded
        state.dirtyKeys = [];
      })
      .addCase(bulkSaveSettings.rejected, (state, action) => {
        state.isBulkSaving = false;
        state.saveError = action.payload || "Failed to save settings.";
        state.bulkSaveSuccess = false;
      });

    // ---- deleteSetting ----
    builder
      .addCase(deleteSetting.pending, (state) => {
        state.isDeleting = true;
        state.deleteError = null;
        state.deleteSuccess = false;
      })
      .addCase(deleteSetting.fulfilled, (state, action) => {
        state.isDeleting = false;
        state.deleteSuccess = true;
        state.deleteError = null;

        const key = action.payload;

        // Find the setting to get its group before removing
        const setting = state.list.find((s) => s.key === key);
        const group = setting?.group;

        // Remove from flat list
        state.list = state.list.filter((s) => s.key !== key);

        // Remove from grouped
        if (group && state.grouped[group]) {
          delete state.grouped[group][key];

          // If the group is now empty, remove it
          if (Object.keys(state.grouped[group]).length === 0) {
            delete state.grouped[group];
            state.groups = state.groups.filter((g) => g !== group);

            // If active group was deleted, switch to first available
            if (state.activeGroup === group && state.groups.length > 0) {
              state.activeGroup = state.groups[0];
            }
          }
        }

        // Remove from dirty keys
        state.dirtyKeys = state.dirtyKeys.filter((k) => k !== key);
      })
      .addCase(deleteSetting.rejected, (state, action) => {
        state.isDeleting = false;
        state.deleteError = action.payload || "Failed to delete setting.";
        state.deleteSuccess = false;
      });
  },
});

// ============================================
// Actions
// ============================================

export const {
  setActiveGroup,
  markDirty,
  markClean,
  clearDirtyKeys,
  updateLocalSetting,
  clearErrors,
  clearSaveError,
  clearDeleteError,
  clearSuccessFlags,
  clearSaveSuccess,
  clearBulkSaveSuccess,
  clearDeleteSuccess,
  invalidateCache,
  resetSettings,
} = settingsSlice.actions;

// ============================================
// Selectors
// ============================================

/** Select the full settings state slice */
export const selectSettingsState = (state: RootState) => state.settings;

/** Select the flat list of all settings */
export const selectSettingsList = (state: RootState) => state.settings.list;

/** Select grouped settings object */
export const selectGroupedSettings = (state: RootState) =>
  state.settings.grouped;

/** Select all setting group names */
export const selectSettingGroups = (state: RootState) => state.settings.groups;

/** Select the currently active group tab */
export const selectActiveGroup = (state: RootState) =>
  state.settings.activeGroup;

/** Select settings for the currently active group */
export const selectActiveGroupSettings = (state: RootState): Setting[] => {
  const { list, activeGroup } = state.settings;
  return list.filter((s) => s.group === activeGroup);
};

/** Select grouped settings for the active group */
export const selectActiveGroupKeyValues = (
  state: RootState,
): Record<string, string> => {
  const { grouped, activeGroup } = state.settings;
  return grouped[activeGroup] || {};
};

/** Select a specific setting value by key */
export const selectSettingValue =
  (key: string) =>
  (state: RootState): string | undefined => {
    const setting = state.settings.list.find((s) => s.key === key);
    return setting?.value;
  };

/** Select a specific setting object by key */
export const selectSettingByKey =
  (key: string) =>
  (state: RootState): Setting | undefined => {
    return state.settings.list.find((s) => s.key === key);
  };

/** Select loading states */
export const selectSettingsLoading = (state: RootState) =>
  state.settings.isLoading;
export const selectIsSaving = (state: RootState) => state.settings.isSaving;
export const selectIsBulkSaving = (state: RootState) =>
  state.settings.isBulkSaving;
export const selectIsDeleting = (state: RootState) => state.settings.isDeleting;
export const selectIsAnySaving = (state: RootState) =>
  state.settings.isSaving || state.settings.isBulkSaving;

/** Select error states */
export const selectSettingsError = (state: RootState) => state.settings.error;
export const selectSaveError = (state: RootState) => state.settings.saveError;
export const selectDeleteError = (state: RootState) =>
  state.settings.deleteError;

/** Select success flags */
export const selectSaveSuccess = (state: RootState) =>
  state.settings.saveSuccess;
export const selectBulkSaveSuccess = (state: RootState) =>
  state.settings.bulkSaveSuccess;
export const selectDeleteSuccess = (state: RootState) =>
  state.settings.deleteSuccess;

/** Select dirty state tracking */
export const selectDirtyKeys = (state: RootState) => state.settings.dirtyKeys;
export const selectHasDirtySettings = (state: RootState) =>
  state.settings.dirtyKeys.length > 0;
export const selectIsKeyDirty =
  (key: string) =>
  (state: RootState): boolean =>
    state.settings.dirtyKeys.includes(key);

/** Select total settings count */
export const selectSettingsCount = (state: RootState) =>
  state.settings.list.length;

/** Select settings count by group */
export const selectSettingsCountByGroup = (
  state: RootState,
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const setting of state.settings.list) {
    counts[setting.group] = (counts[setting.group] || 0) + 1;
  }
  return counts;
};

/** Check if settings cache is stale */
export const selectIsSettingsCacheStale = (state: RootState): boolean => {
  const { lastFetched } = state.settings;
  if (!lastFetched) return true;
  return Date.now() - lastFetched > CACHE_DURATION_MS;
};

// ============================================
// Export Reducer
// ============================================

export default settingsSlice.reducer;
