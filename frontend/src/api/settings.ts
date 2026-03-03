// ============================================
// Settings API Service
// ============================================
// Provides typed API functions for all system settings
// endpoints. Used by the settings Redux slice and the
// Settings page (admin-only).

import { api } from './client';

// ============================================
// Types
// ============================================

export interface Setting {
  id: string;
  key: string;
  value: string;
  group: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupedSettings {
  [group: string]: {
    [key: string]: string;
  };
}

export interface SettingsListResponse {
  settings: Setting[];
  grouped: GroupedSettings;
}

export interface UpdateSettingPayload {
  key: string;
  value: string;
  group?: string;
  description?: string;
}

export interface BulkUpdateSettingsPayload {
  settings: Array<{
    key: string;
    value: string;
    group?: string;
    description?: string | null;
  }>;
}

// ============================================
// Settings API Functions
// ============================================

export const settingsApi = {
  /**
   * GET /api/settings
   * Retrieves all system settings, optionally filtered by group.
   * Returns both a flat array and a grouped object for convenience.
   *
   * Query Parameters:
   *   - group: string (optional) — Filter by setting group
   *
   * Access: Admin, HR
   */
  list: (params?: { group?: string }) =>
    api.get<SettingsListResponse>('/settings', params as Record<string, unknown>),

  /**
   * GET /api/settings/:key
   * Retrieves a single setting by its key.
   *
   * Access: Admin, HR
   */
  getByKey: (key: string) =>
    api.get<Setting>(`/settings/${key}`),

  /**
   * PUT /api/settings
   * Creates or updates a single setting via upsert logic.
   * If the key exists, it updates the value; otherwise creates a new entry.
   *
   * Body:
   *   - key: string (required)
   *   - value: string (required)
   *   - group: string (optional, default: "general")
   *   - description: string (optional)
   *
   * Access: Admin only
   */
  update: (payload: UpdateSettingPayload) =>
    api.put<Setting>('/settings', payload),

  /**
   * PUT /api/settings/bulk
   * Creates or updates multiple settings at once atomically.
   *
   * Body:
   *   - settings: Array of { key, value, group?, description? }
   *
   * Access: Admin only
   */
  bulkUpdate: (payload: BulkUpdateSettingsPayload) =>
    api.put<Setting[]>('/settings/bulk', payload),

  /**
   * DELETE /api/settings/:key
   * Deletes a setting by its key.
   *
   * Access: Admin only
   */
  delete: (key: string) =>
    api.delete<null>(`/settings/${key}`),

  /**
   * GET /api/settings/groups/list
   * Returns a list of all unique setting group names.
   * Useful for building a settings UI with grouped tabs/sections.
   *
   * Access: Admin, HR
   */
  getGroups: () =>
    api.get<string[]>('/settings/groups/list'),
};

export default settingsApi;
