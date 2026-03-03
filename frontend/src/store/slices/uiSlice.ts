// ============================================
// UI Redux Slice
// ============================================
// Manages global UI state including sidebar collapse,
// theme mode, modal visibility, loading overlays,
// and notification/toast management.

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// ============================================
// Types
// ============================================

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ModalConfig {
  id: string;
  isOpen: boolean;
  data?: unknown;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface ConfirmDialog {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm?: string; // Action type to dispatch on confirm
  data?: unknown;
}

export interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;

  // Theme
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';

  // Modals
  modals: Record<string, ModalConfig>;

  // Global loading overlay
  globalLoading: boolean;
  globalLoadingMessage: string | null;

  // Command palette / search
  commandPaletteOpen: boolean;

  // Confirm dialog
  confirmDialog: ConfirmDialog;

  // Page title (used for breadcrumbs and document title)
  pageTitle: string;
  pageSubtitle: string | null;

  // Notification panel
  notificationPanelOpen: boolean;

  // Toasts are typically handled by react-hot-toast,
  // but we track recent ones in state for persistence
  toasts: ToastMessage[];
}

// ============================================
// Helpers
// ============================================

const SIDEBAR_COLLAPSED_KEY = 'hrms_sidebar_collapsed';
const THEME_KEY = 'hrms_theme';

function loadSidebarState(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

function saveSidebarState(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  } catch {
    // Ignore localStorage errors
  }
}

function loadTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // Ignore
  }
  return 'dark'; // Default to dark theme matching the reference dashboard
}

function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore
  }
}

function resolveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'dark';
  }
  return theme;
}

function applyThemeToDOM(resolved: 'light' | 'dark'): void {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

// ============================================
// Initial State
// ============================================

const storedTheme = loadTheme();
const resolvedInitialTheme = resolveTheme(storedTheme);

// Apply theme immediately on load
applyThemeToDOM(resolvedInitialTheme);

const initialState: UIState = {
  sidebarCollapsed: loadSidebarState(),
  sidebarMobileOpen: false,
  theme: storedTheme,
  resolvedTheme: resolvedInitialTheme,
  modals: {},
  globalLoading: false,
  globalLoadingMessage: null,
  commandPaletteOpen: false,
  confirmDialog: {
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'info',
  },
  pageTitle: 'Dashboard',
  pageSubtitle: null,
  notificationPanelOpen: false,
  toasts: [],
};

// ============================================
// UI Slice
// ============================================

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // ---- Sidebar ----

    /**
     * Toggle the sidebar between collapsed and expanded states.
     * Persists the state to localStorage.
     */
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      saveSidebarState(state.sidebarCollapsed);
    },

    /**
     * Explicitly set the sidebar collapsed state.
     */
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
      saveSidebarState(state.sidebarCollapsed);
    },

    /**
     * Toggle the mobile sidebar overlay.
     * Only affects screens below the lg breakpoint.
     */
    toggleMobileSidebar(state) {
      state.sidebarMobileOpen = !state.sidebarMobileOpen;
    },

    /**
     * Explicitly set the mobile sidebar open state.
     */
    setMobileSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarMobileOpen = action.payload;
    },

    /**
     * Close the mobile sidebar (convenience action).
     */
    closeMobileSidebar(state) {
      state.sidebarMobileOpen = false;
    },

    // ---- Theme ----

    /**
     * Set the theme mode (light, dark, or system).
     * Persists to localStorage and applies to the DOM.
     */
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload;
      state.resolvedTheme = resolveTheme(action.payload);
      saveTheme(action.payload);
      applyThemeToDOM(state.resolvedTheme);
    },

    /**
     * Toggle between light and dark themes.
     * If currently on 'system', switches to the opposite of the resolved theme.
     */
    toggleTheme(state) {
      const newTheme: ThemeMode =
        state.resolvedTheme === 'dark' ? 'light' : 'dark';
      state.theme = newTheme;
      state.resolvedTheme = newTheme;
      saveTheme(newTheme);
      applyThemeToDOM(newTheme);
    },

    // ---- Modals ----

    /**
     * Open a modal by its unique ID, optionally passing data.
     */
    openModal(
      state,
      action: PayloadAction<{ id: string; data?: unknown }>,
    ) {
      state.modals[action.payload.id] = {
        id: action.payload.id,
        isOpen: true,
        data: action.payload.data,
      };
    },

    /**
     * Close a modal by its unique ID.
     */
    closeModal(state, action: PayloadAction<string>) {
      if (state.modals[action.payload]) {
        state.modals[action.payload].isOpen = false;
        state.modals[action.payload].data = undefined;
      }
    },

    /**
     * Close all open modals.
     */
    closeAllModals(state) {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key].isOpen = false;
        state.modals[key].data = undefined;
      });
    },

    // ---- Global Loading ----

    /**
     * Show or hide the global loading overlay.
     */
    setGlobalLoading(
      state,
      action: PayloadAction<{ loading: boolean; message?: string }>,
    ) {
      state.globalLoading = action.payload.loading;
      state.globalLoadingMessage = action.payload.message || null;
    },

    /**
     * Show the global loading overlay with an optional message.
     */
    showGlobalLoading(state, action: PayloadAction<string | undefined>) {
      state.globalLoading = true;
      state.globalLoadingMessage = action.payload || null;
    },

    /**
     * Hide the global loading overlay.
     */
    hideGlobalLoading(state) {
      state.globalLoading = false;
      state.globalLoadingMessage = null;
    },

    // ---- Command Palette ----

    /**
     * Toggle the command palette (Ctrl+K / Cmd+K) open/closed.
     */
    toggleCommandPalette(state) {
      state.commandPaletteOpen = !state.commandPaletteOpen;
    },

    /**
     * Explicitly set the command palette open state.
     */
    setCommandPaletteOpen(state, action: PayloadAction<boolean>) {
      state.commandPaletteOpen = action.payload;
    },

    // ---- Confirm Dialog ----

    /**
     * Show a confirmation dialog.
     */
    showConfirmDialog(
      state,
      action: PayloadAction<Omit<ConfirmDialog, 'isOpen'>>,
    ) {
      state.confirmDialog = {
        ...action.payload,
        isOpen: true,
      };
    },

    /**
     * Close the confirmation dialog.
     */
    closeConfirmDialog(state) {
      state.confirmDialog = {
        ...state.confirmDialog,
        isOpen: false,
      };
    },

    // ---- Page Title ----

    /**
     * Set the current page title and optional subtitle.
     * Used for breadcrumbs and the document <title> tag.
     */
    setPageTitle(
      state,
      action: PayloadAction<{ title: string; subtitle?: string }>,
    ) {
      state.pageTitle = action.payload.title;
      state.pageSubtitle = action.payload.subtitle || null;

      // Update document title
      if (typeof document !== 'undefined') {
        document.title = action.payload.subtitle
          ? `${action.payload.title} · ${action.payload.subtitle} — HRMSLite`
          : `${action.payload.title} — HRMSLite`;
      }
    },

    // ---- Notification Panel ----

    /**
     * Toggle the notification panel open/closed.
     */
    toggleNotificationPanel(state) {
      state.notificationPanelOpen = !state.notificationPanelOpen;
    },

    /**
     * Explicitly set the notification panel open state.
     */
    setNotificationPanelOpen(state, action: PayloadAction<boolean>) {
      state.notificationPanelOpen = action.payload;
    },

    // ---- Toasts ----

    /**
     * Add a toast message to the state.
     */
    addToast(state, action: PayloadAction<Omit<ToastMessage, 'id'>>) {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      state.toasts.push({
        ...action.payload,
        id,
      });

      // Keep only the last 10 toasts
      if (state.toasts.length > 10) {
        state.toasts = state.toasts.slice(-10);
      }
    },

    /**
     * Remove a toast message by its ID.
     */
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },

    /**
     * Clear all toast messages.
     */
    clearToasts(state) {
      state.toasts = [];
    },
  },
});

// ============================================
// Export Actions
// ============================================

export const {
  toggleSidebar,
  setSidebarCollapsed,
  toggleMobileSidebar,
  setMobileSidebarOpen,
  closeMobileSidebar,
  setTheme,
  toggleTheme,
  openModal,
  closeModal,
  closeAllModals,
  setGlobalLoading,
  showGlobalLoading,
  hideGlobalLoading,
  toggleCommandPalette,
  setCommandPaletteOpen,
  showConfirmDialog,
  closeConfirmDialog,
  setPageTitle,
  toggleNotificationPanel,
  setNotificationPanelOpen,
  addToast,
  removeToast,
  clearToasts,
} = uiSlice.actions;

// ============================================
// Selectors
// ============================================

export const selectSidebarCollapsed = (state: RootState) =>
  state.ui.sidebarCollapsed;
export const selectSidebarMobileOpen = (state: RootState) =>
  state.ui.sidebarMobileOpen;
export const selectTheme = (state: RootState) => state.ui.theme;
export const selectResolvedTheme = (state: RootState) =>
  state.ui.resolvedTheme;
export const selectIsDarkMode = (state: RootState) =>
  state.ui.resolvedTheme === 'dark';
export const selectModal = (id: string) => (state: RootState) =>
  state.ui.modals[id];
export const selectIsModalOpen = (id: string) => (state: RootState) =>
  state.ui.modals[id]?.isOpen ?? false;
export const selectModalData = (id: string) => (state: RootState) =>
  state.ui.modals[id]?.data;
export const selectGlobalLoading = (state: RootState) =>
  state.ui.globalLoading;
export const selectGlobalLoadingMessage = (state: RootState) =>
  state.ui.globalLoadingMessage;
export const selectCommandPaletteOpen = (state: RootState) =>
  state.ui.commandPaletteOpen;
export const selectConfirmDialog = (state: RootState) =>
  state.ui.confirmDialog;
export const selectPageTitle = (state: RootState) => state.ui.pageTitle;
export const selectPageSubtitle = (state: RootState) => state.ui.pageSubtitle;
export const selectNotificationPanelOpen = (state: RootState) =>
  state.ui.notificationPanelOpen;
export const selectToasts = (state: RootState) => state.ui.toasts;

export default uiSlice.reducer;
