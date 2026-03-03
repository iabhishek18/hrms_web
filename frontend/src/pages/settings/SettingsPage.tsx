// ============================================
// Settings Page
// ============================================
// System settings page accessible only to Admin users.
// Features:
//   - Tabbed interface (General, Notifications, Security, Appearance)
//   - General: Company info, timezone, date format, fiscal year
//   - Notifications: Email, push, digest preferences
//   - Security: Password policy, session timeout, 2FA settings
//   - Appearance: Theme, sidebar, density preferences
//   - Save/reset functionality per section
//   - Role-based access control (Admin only)
//   - Dark theme matching the reference dashboard

import { useEffect, useState, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import { setPageTitle } from "@/store/slices/uiSlice";
import {
  setTheme,
  toggleSidebar,
  selectResolvedTheme,
  selectSidebarCollapsed,
  selectTheme,
} from "@/store/slices/uiSlice";
import type { ThemeMode } from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";
import toast from "react-hot-toast";
import {
  HiOutlineCog6Tooth,
  HiOutlineBell,
  HiOutlineShieldCheck,
  HiOutlinePaintBrush,
  HiOutlineBuildingOffice2,
  HiOutlineGlobeAlt,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineEnvelope,
  HiOutlineDevicePhoneMobile,
  HiOutlineInboxStack,
  HiOutlineLockClosed,
  HiOutlineKey,
  HiOutlineFingerPrint,
  HiOutlineComputerDesktop,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineLanguage,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
  HiOutlineChartBarSquare,
  HiOutlineSquares2X2,
  HiOutlineEyeSlash,
  HiOutlineServerStack,
} from "react-icons/hi2";

// ============================================
// Types
// ============================================

interface GeneralSettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  language: string;
  fiscalYearStart: string;
  workingDays: string[];
  workingHoursStart: string;
  workingHoursEnd: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  leaveRequestAlerts: boolean;
  attendanceAlerts: boolean;
  payrollAlerts: boolean;
  systemAlerts: boolean;
  announcementAlerts: boolean;
  weeklyDigest: boolean;
  monthlyReport: boolean;
  digestDay: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface SecuritySettings {
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  passwordExpiryDays: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  ipWhitelistEnabled: boolean;
  ipWhitelist: string;
  auditLogRetentionDays: number;
  forcePasswordChangeOnFirstLogin: boolean;
}

interface AppearanceSettings {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  density: "compact" | "comfortable" | "spacious";
  animationsEnabled: boolean;
  showAvatars: boolean;
  tableRowsPerPage: number;
  dashboardLayout: string;
  accentColor: string;
}

type SettingsTab = "general" | "notifications" | "security" | "appearance";

// ============================================
// Default Settings
// ============================================

const defaultGeneralSettings: GeneralSettings = {
  companyName: "HRMSLite Inc.",
  companyEmail: "admin@hrmslite.com",
  companyPhone: "+1 (555) 123-4567",
  companyAddress: "123 Business Avenue, Suite 100, San Francisco, CA 94105",
  timezone: "America/Los_Angeles",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  currency: "USD",
  language: "en",
  fiscalYearStart: "January",
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
};

const defaultNotificationSettings: NotificationSettings = {
  emailNotifications: true,
  pushNotifications: true,
  leaveRequestAlerts: true,
  attendanceAlerts: true,
  payrollAlerts: true,
  systemAlerts: true,
  announcementAlerts: true,
  weeklyDigest: true,
  monthlyReport: false,
  digestDay: "Monday",
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

const defaultSecuritySettings: SecuritySettings = {
  minPasswordLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  passwordExpiryDays: 90,
  maxLoginAttempts: 5,
  lockoutDuration: 30,
  sessionTimeout: 60,
  twoFactorEnabled: false,
  twoFactorMethod: "email",
  ipWhitelistEnabled: false,
  ipWhitelist: "",
  auditLogRetentionDays: 365,
  forcePasswordChangeOnFirstLogin: true,
};

const defaultAppearanceSettings: AppearanceSettings = {
  theme: "dark",
  sidebarCollapsed: false,
  density: "comfortable",
  animationsEnabled: true,
  showAvatars: true,
  tableRowsPerPage: 10,
  dashboardLayout: "default",
  accentColor: "indigo",
};

// ============================================
// Constants
// ============================================

const TABS: {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "general", label: "General", icon: HiOutlineCog6Tooth },
  { id: "notifications", label: "Notifications", icon: HiOutlineBell },
  { id: "security", label: "Security", icon: HiOutlineShieldCheck },
  { id: "appearance", label: "Appearance", icon: HiOutlinePaintBrush },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Berlin", label: "Central European Time (CET)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)" },
];

const DATE_FORMATS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/31/2024)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (31/12/2024)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-12-31)" },
  { value: "DD MMM YYYY", label: "DD MMM YYYY (31 Dec 2024)" },
  { value: "MMM DD, YYYY", label: "MMM DD, YYYY (Dec 31, 2024)" },
];

const CURRENCIES = [
  { value: "USD", label: "US Dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "GBP", label: "British Pound (£)" },
  { value: "INR", label: "Indian Rupee (₹)" },
  { value: "JPY", label: "Japanese Yen (¥)" },
  { value: "CAD", label: "Canadian Dollar (C$)" },
  { value: "AUD", label: "Australian Dollar (A$)" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
];

const MONTHS = [
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

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const ACCENT_COLORS = [
  { value: "indigo", label: "Indigo", color: "#6366f1" },
  { value: "blue", label: "Blue", color: "#3b82f6" },
  { value: "violet", label: "Violet", color: "#8b5cf6" },
  { value: "emerald", label: "Emerald", color: "#10b981" },
  { value: "rose", label: "Rose", color: "#f43f5e" },
  { value: "amber", label: "Amber", color: "#f59e0b" },
  { value: "cyan", label: "Cyan", color: "#06b6d4" },
  { value: "pink", label: "Pink", color: "#ec4899" },
];

// ============================================
// Sub-Components
// ============================================

// Section wrapper with title and description
function SettingsSection({
  title,
  description,
  icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-card dark:border-dark-700/50 dark:bg-dark-800 dark:shadow-none",
        className,
      )}
    >
      {/* Section header */}
      <div className="border-b border-gray-100 px-5 py-4 sm:px-6 dark:border-dark-700/50">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/10">
              <span className="h-5 w-5 text-primary-500 dark:text-primary-400">
                {icon}
              </span>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Section content */}
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </div>
  );
}

// Form field wrapper
function FieldGroup({
  label,
  description,
  htmlFor,
  required,
  children,
  className,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-6",
        className,
      )}
    >
      <div className="sm:w-1/3 sm:flex-shrink-0 sm:pt-2">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-gray-700 dark:text-dark-200"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-danger-500 dark:text-danger-400">
              *
            </span>
          )}
        </label>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-500">
            {description}
          </p>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// Toggle switch component
function ToggleSwitch({
  id,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
        checked ? "bg-primary-600" : "bg-gray-300 dark:bg-dark-600",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// Toggle setting row (label + description + toggle)
function ToggleSettingRow({
  id,
  label,
  description,
  checked,
  onChange,
  icon,
  disabled,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-dark-700/50 dark:text-dark-400">
            {icon}
          </span>
        )}
        <div>
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 dark:text-dark-200 cursor-pointer"
          >
            {label}
          </label>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-500">
              {description}
            </p>
          )}
        </div>
      </div>
      <ToggleSwitch
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

// Input field
function SettingsInput({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  className,
  min,
  max,
}: {
  id: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      className={cn(
        "w-full rounded-lg border border-gray-300 bg-white dark:border-dark-700 dark:bg-dark-800/50",
        "px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 dark:text-white dark:placeholder-dark-500",
        "transition-all duration-200",
        "hover:border-gray-400 dark:hover:border-dark-600",
        "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}

// Select field
function SettingsSelect({
  id,
  value,
  onChange,
  options,
  disabled,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "w-full rounded-lg border border-gray-300 bg-white dark:border-dark-700 dark:bg-dark-800/50",
        "px-3.5 py-2.5 text-sm text-gray-900 dark:text-white",
        "transition-all duration-200",
        "hover:border-gray-400 dark:hover:border-dark-600",
        "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "appearance-none cursor-pointer pr-10",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Textarea field
function SettingsTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={cn(
        "w-full rounded-lg border border-gray-300 bg-white dark:border-dark-700 dark:bg-dark-800/50",
        "px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 dark:text-white dark:placeholder-dark-500",
        "transition-all duration-200 resize-y",
        "hover:border-gray-400 dark:hover:border-dark-600",
        "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "scrollbar-thin",
      )}
    />
  );
}

// Info alert
function InfoAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-info-500/20 bg-info-500/5 px-4 py-3">
      <HiOutlineInformationCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-info-500 dark:text-info-400" />
      <p className="text-xs text-info-700 dark:text-info-300">{children}</p>
    </div>
  );
}

// Warning alert
function WarningAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning-500/20 bg-warning-500/5 px-4 py-3">
      <HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning-500 dark:text-warning-400" />
      <p className="text-xs text-warning-700 dark:text-warning-300">
        {children}
      </p>
    </div>
  );
}

// ============================================
// Settings Page Component
// ============================================

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const currentTheme = useAppSelector(selectTheme);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);

  // Active tab
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // Settings state
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(
    defaultGeneralSettings,
  );
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(defaultNotificationSettings);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(
    defaultSecuritySettings,
  );
  const [appearanceSettings, setAppearanceSettings] =
    useState<AppearanceSettings>({
      ...defaultAppearanceSettings,
      theme: currentTheme,
      sidebarCollapsed: sidebarCollapsed,
    });

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Set page title
  useEffect(() => {
    dispatch(
      setPageTitle({
        title: "Settings",
        subtitle: "System Settings",
      }),
    );
  }, [dispatch]);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [
    generalSettings,
    notificationSettings,
    securitySettings,
    appearanceSettings,
  ]);

  // Save handler
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Apply appearance settings immediately
      if (appearanceSettings.theme !== currentTheme) {
        dispatch(setTheme(appearanceSettings.theme));
      }

      toast.success("Settings saved successfully");
      setHasChanges(false);
    } catch {
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [dispatch, appearanceSettings, currentTheme]);

  // Reset handler
  const handleReset = useCallback(() => {
    switch (activeTab) {
      case "general":
        setGeneralSettings(defaultGeneralSettings);
        break;
      case "notifications":
        setNotificationSettings(defaultNotificationSettings);
        break;
      case "security":
        setSecuritySettings(defaultSecuritySettings);
        break;
      case "appearance":
        setAppearanceSettings({
          ...defaultAppearanceSettings,
          theme: currentTheme,
          sidebarCollapsed: sidebarCollapsed,
        });
        break;
    }
    toast.success("Settings reset to defaults");
  }, [activeTab, currentTheme, sidebarCollapsed]);

  // General settings updater
  const updateGeneral = useCallback(
    <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
      setGeneralSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Notification settings updater
  const updateNotification = useCallback(
    <K extends keyof NotificationSettings>(
      key: K,
      value: NotificationSettings[K],
    ) => {
      setNotificationSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Security settings updater
  const updateSecurity = useCallback(
    <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
      setSecuritySettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Appearance settings updater
  const updateAppearance = useCallback(
    <K extends keyof AppearanceSettings>(
      key: K,
      value: AppearanceSettings[K],
    ) => {
      setAppearanceSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Working days toggle
  const toggleWorkingDay = useCallback((day: string) => {
    setGeneralSettings((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  }, []);

  // ---- Access Control ----
  // Only Admin users can access settings
  if (userRole !== "ADMIN") {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-500/10">
          <HiOutlineShieldCheck className="h-8 w-8 text-danger-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Access Denied
          </h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-dark-400">
            You don't have permission to access system settings. Only
            administrators can modify these settings.
          </p>
        </div>
        <a
          href="/dashboard"
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-500"
        >
          Go to Dashboard
        </a>
      </div>
    );
  }

  // ============================================
  // Tab Content Renderers
  // ============================================

  const renderGeneralTab = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Company Information */}
      <SettingsSection
        title="Company Information"
        description="Basic information about your organization"
        icon={<HiOutlineBuildingOffice2 className="h-5 w-5" />}
      >
        <div className="space-y-5">
          <FieldGroup label="Company Name" htmlFor="companyName" required>
            <SettingsInput
              id="companyName"
              value={generalSettings.companyName}
              onChange={(v) => updateGeneral("companyName", v)}
              placeholder="Enter company name"
            />
          </FieldGroup>

          <FieldGroup label="Company Email" htmlFor="companyEmail" required>
            <SettingsInput
              id="companyEmail"
              type="email"
              value={generalSettings.companyEmail}
              onChange={(v) => updateGeneral("companyEmail", v)}
              placeholder="admin@company.com"
            />
          </FieldGroup>

          <FieldGroup label="Company Phone" htmlFor="companyPhone">
            <SettingsInput
              id="companyPhone"
              type="tel"
              value={generalSettings.companyPhone}
              onChange={(v) => updateGeneral("companyPhone", v)}
              placeholder="+1 (555) 123-4567"
            />
          </FieldGroup>

          <FieldGroup label="Company Address" htmlFor="companyAddress">
            <SettingsTextarea
              id="companyAddress"
              value={generalSettings.companyAddress}
              onChange={(v) => updateGeneral("companyAddress", v)}
              placeholder="Enter full company address"
              rows={2}
            />
          </FieldGroup>
        </div>
      </SettingsSection>

      {/* Regional Settings */}
      <SettingsSection
        title="Regional Settings"
        description="Configure timezone, date format, and localization preferences"
        icon={<HiOutlineGlobeAlt className="h-5 w-5" />}
      >
        <div className="space-y-5">
          <FieldGroup
            label="Timezone"
            htmlFor="timezone"
            description="Used for scheduling and attendance tracking"
          >
            <SettingsSelect
              id="timezone"
              value={generalSettings.timezone}
              onChange={(v) => updateGeneral("timezone", v)}
              options={TIMEZONES}
            />
          </FieldGroup>

          <FieldGroup label="Date Format" htmlFor="dateFormat">
            <SettingsSelect
              id="dateFormat"
              value={generalSettings.dateFormat}
              onChange={(v) => updateGeneral("dateFormat", v)}
              options={DATE_FORMATS}
            />
          </FieldGroup>

          <FieldGroup label="Time Format" htmlFor="timeFormat">
            <div className="flex gap-3">
              {(["12h", "24h"] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => updateGeneral("timeFormat", format)}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                    generalSettings.timeFormat === format
                      ? "border-primary-500/50 bg-primary-500/10 text-primary-400"
                      : "border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-dark-700 dark:bg-dark-800/50 dark:text-dark-400 dark:hover:border-dark-600 dark:hover:text-dark-200",
                  )}
                >
                  {format === "12h" ? "12 Hour (AM/PM)" : "24 Hour"}
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="Currency" htmlFor="currency">
            <SettingsSelect
              id="currency"
              value={generalSettings.currency}
              onChange={(v) => updateGeneral("currency", v)}
              options={CURRENCIES}
            />
          </FieldGroup>

          <FieldGroup label="Language" htmlFor="language">
            <SettingsSelect
              id="language"
              value={generalSettings.language}
              onChange={(v) => updateGeneral("language", v)}
              options={LANGUAGES}
            />
          </FieldGroup>
        </div>
      </SettingsSection>

      {/* Work Schedule */}
      <SettingsSection
        title="Work Schedule"
        description="Define default working days, hours, and fiscal year settings"
        icon={<HiOutlineCalendarDays className="h-5 w-5" />}
      >
        <div className="space-y-5">
          <FieldGroup label="Fiscal Year Start" htmlFor="fiscalYearStart">
            <SettingsSelect
              id="fiscalYearStart"
              value={generalSettings.fiscalYearStart}
              onChange={(v) => updateGeneral("fiscalYearStart", v)}
              options={MONTHS.map((m) => ({ value: m, label: m }))}
            />
          </FieldGroup>

          <FieldGroup
            label="Working Days"
            description="Select the days your organization operates"
          >
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const isActive = generalSettings.workingDays.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => toggleWorkingDay(day)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                      isActive
                        ? "border-primary-500/50 bg-primary-500/10 text-primary-400"
                        : "border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-dark-700 dark:bg-dark-800/50 dark:text-dark-500 dark:hover:border-dark-600 dark:hover:text-dark-300",
                    )}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          <FieldGroup
            label="Working Hours"
            description="Default start and end times"
          >
            <div className="flex items-center gap-3">
              <SettingsInput
                id="workingHoursStart"
                type="time"
                value={generalSettings.workingHoursStart}
                onChange={(v) => updateGeneral("workingHoursStart", v)}
                className="max-w-[140px]"
              />
              <span className="text-sm text-gray-500 dark:text-dark-500">
                to
              </span>
              <SettingsInput
                id="workingHoursEnd"
                type="time"
                value={generalSettings.workingHoursEnd}
                onChange={(v) => updateGeneral("workingHoursEnd", v)}
                className="max-w-[140px]"
              />
            </div>
          </FieldGroup>
        </div>
      </SettingsSection>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Notification Channels */}
      <SettingsSection
        title="Notification Channels"
        description="Choose how you want to receive notifications"
        icon={<HiOutlineEnvelope className="h-5 w-5" />}
      >
        <div className="divide-y divide-gray-200 dark:divide-dark-700/30">
          <ToggleSettingRow
            id="emailNotifications"
            label="Email Notifications"
            description="Receive notifications via email for important updates"
            icon={<HiOutlineEnvelope className="h-4 w-4" />}
            checked={notificationSettings.emailNotifications}
            onChange={(v) => updateNotification("emailNotifications", v)}
          />
          <ToggleSettingRow
            id="pushNotifications"
            label="Push Notifications"
            description="Receive browser push notifications for real-time alerts"
            icon={<HiOutlineDevicePhoneMobile className="h-4 w-4" />}
            checked={notificationSettings.pushNotifications}
            onChange={(v) => updateNotification("pushNotifications", v)}
          />
        </div>
      </SettingsSection>

      {/* Alert Types */}
      <SettingsSection
        title="Alert Types"
        description="Select which types of events trigger notifications"
        icon={<HiOutlineBell className="h-5 w-5" />}
      >
        <div className="divide-y divide-gray-200 dark:divide-dark-700/30">
          <ToggleSettingRow
            id="leaveRequestAlerts"
            label="Leave Requests"
            description="Get notified when employees apply for or modify leave requests"
            checked={notificationSettings.leaveRequestAlerts}
            onChange={(v) => updateNotification("leaveRequestAlerts", v)}
          />
          <ToggleSettingRow
            id="attendanceAlerts"
            label="Attendance Alerts"
            description="Alerts for late arrivals, early departures, and absenteeism"
            checked={notificationSettings.attendanceAlerts}
            onChange={(v) => updateNotification("attendanceAlerts", v)}
          />
          <ToggleSettingRow
            id="payrollAlerts"
            label="Payroll Alerts"
            description="Notifications for payroll processing and salary disbursements"
            checked={notificationSettings.payrollAlerts}
            onChange={(v) => updateNotification("payrollAlerts", v)}
          />
          <ToggleSettingRow
            id="systemAlerts"
            label="System Alerts"
            description="Important system maintenance and update notifications"
            checked={notificationSettings.systemAlerts}
            onChange={(v) => updateNotification("systemAlerts", v)}
          />
          <ToggleSettingRow
            id="announcementAlerts"
            label="Announcements"
            description="Alerts for new company announcements and circulars"
            checked={notificationSettings.announcementAlerts}
            onChange={(v) => updateNotification("announcementAlerts", v)}
          />
        </div>
      </SettingsSection>

      {/* Digest & Reports */}
      <SettingsSection
        title="Digest & Reports"
        description="Periodic summary reports delivered to your inbox"
        icon={<HiOutlineInboxStack className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="divide-y divide-gray-200 dark:divide-dark-700/30">
            <ToggleSettingRow
              id="weeklyDigest"
              label="Weekly Digest"
              description="Receive a summary of key metrics and activities every week"
              checked={notificationSettings.weeklyDigest}
              onChange={(v) => updateNotification("weeklyDigest", v)}
            />
            <ToggleSettingRow
              id="monthlyReport"
              label="Monthly Report"
              description="Comprehensive monthly overview of HR metrics and trends"
              checked={notificationSettings.monthlyReport}
              onChange={(v) => updateNotification("monthlyReport", v)}
            />
          </div>

          {notificationSettings.weeklyDigest && (
            <FieldGroup
              label="Digest Day"
              htmlFor="digestDay"
              description="Day of the week to receive the weekly digest"
            >
              <SettingsSelect
                id="digestDay"
                value={notificationSettings.digestDay}
                onChange={(v) => updateNotification("digestDay", v)}
                options={WEEKDAYS.map((d) => ({ value: d, label: d }))}
              />
            </FieldGroup>
          )}
        </div>
      </SettingsSection>

      {/* Quiet Hours */}
      <SettingsSection
        title="Quiet Hours"
        description="Suppress non-critical notifications during specified hours"
        icon={<HiOutlineClock className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <ToggleSettingRow
            id="quietHoursEnabled"
            label="Enable Quiet Hours"
            description="Mute non-urgent notifications during the specified time range"
            checked={notificationSettings.quietHoursEnabled}
            onChange={(v) => updateNotification("quietHoursEnabled", v)}
          />

          {notificationSettings.quietHoursEnabled && (
            <div className="ml-11 flex items-center gap-3">
              <SettingsInput
                id="quietHoursStart"
                type="time"
                value={notificationSettings.quietHoursStart}
                onChange={(v) => updateNotification("quietHoursStart", v)}
                className="max-w-[140px]"
              />
              <span className="text-sm text-gray-500 dark:text-dark-500">
                to
              </span>
              <SettingsInput
                id="quietHoursEnd"
                type="time"
                value={notificationSettings.quietHoursEnd}
                onChange={(v) => updateNotification("quietHoursEnd", v)}
                className="max-w-[140px]"
              />
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Password Policy */}
      <SettingsSection
        title="Password Policy"
        description="Define password complexity and expiration rules"
        icon={<HiOutlineLockClosed className="h-5 w-5" />}
      >
        <div className="space-y-5">
          <FieldGroup
            label="Minimum Length"
            htmlFor="minPasswordLength"
            description="Minimum number of characters required"
          >
            <div className="flex items-center gap-3">
              <SettingsInput
                id="minPasswordLength"
                type="number"
                value={securitySettings.minPasswordLength}
                onChange={(v) =>
                  updateSecurity("minPasswordLength", parseInt(v) || 6)
                }
                min={6}
                max={32}
                className="max-w-[100px]"
              />
              <span className="text-xs text-gray-500 dark:text-dark-500">
                characters
              </span>
            </div>
          </FieldGroup>

          <FieldGroup
            label="Password Requirements"
            description="Select which character types are required"
          >
            <div className="space-y-0 divide-y divide-gray-200 dark:divide-dark-700/30">
              <ToggleSettingRow
                id="requireUppercase"
                label="Uppercase Letters (A-Z)"
                checked={securitySettings.requireUppercase}
                onChange={(v) => updateSecurity("requireUppercase", v)}
              />
              <ToggleSettingRow
                id="requireLowercase"
                label="Lowercase Letters (a-z)"
                checked={securitySettings.requireLowercase}
                onChange={(v) => updateSecurity("requireLowercase", v)}
              />
              <ToggleSettingRow
                id="requireNumbers"
                label="Numbers (0-9)"
                checked={securitySettings.requireNumbers}
                onChange={(v) => updateSecurity("requireNumbers", v)}
              />
              <ToggleSettingRow
                id="requireSpecialChars"
                label="Special Characters (!@#$%)"
                checked={securitySettings.requireSpecialChars}
                onChange={(v) => updateSecurity("requireSpecialChars", v)}
              />
            </div>
          </FieldGroup>

          <FieldGroup
            label="Password Expiry"
            htmlFor="passwordExpiryDays"
            description="Force password change after N days (0 = never)"
          >
            <div className="flex items-center gap-3">
              <SettingsInput
                id="passwordExpiryDays"
                type="number"
                value={securitySettings.passwordExpiryDays}
                onChange={(v) =>
                  updateSecurity("passwordExpiryDays", parseInt(v) || 0)
                }
                min={0}
                max={365}
                className="max-w-[100px]"
              />
              <span className="text-xs text-gray-500 dark:text-dark-500">
                days
              </span>
            </div>
          </FieldGroup>

          <ToggleSettingRow
            id="forcePasswordChangeOnFirstLogin"
            label="Force Password Change on First Login"
            description="Require new users to change their password when they first log in"
            checked={securitySettings.forcePasswordChangeOnFirstLogin}
            onChange={(v) =>
              updateSecurity("forcePasswordChangeOnFirstLogin", v)
            }
          />
        </div>
      </SettingsSection>

      {/* Login Security */}
      <SettingsSection
        title="Login Security"
        description="Configure login attempt limits and account lockout"
        icon={<HiOutlineKey className="h-5 w-5" />}
      >
        <div className="space-y-5">
          <FieldGroup
            label="Max Login Attempts"
            htmlFor="maxLoginAttempts"
            description="Lock account after N failed attempts"
          >
            <div className="flex items-center gap-3">
              <SettingsInput
                id="maxLoginAttempts"
                type="number"
                value={securitySettings.maxLoginAttempts}
                onChange={(v) =>
                  updateSecurity("maxLoginAttempts", parseInt(v) || 3)
                }
                min={3}
                max={20}
                className="max-w-[100px]"
              />
              <span className="text-xs text-gray-500 dark:text-dark-500">
                attempts
              </span>
            </div>
          </FieldGroup>

          <FieldGroup
            label="Lockout Duration"
            htmlFor="lockoutDuration"
            description="How long to lock the account after max attempts"
          >
            <div className="flex items-center gap-3">
              <SettingsInput
                id="lockoutDuration"
                type="number"
                value={securitySettings.lockoutDuration}
                onChange={(v) =>
                  updateSecurity("lockoutDuration", parseInt(v) || 5)
                }
                min={1}
                max={1440}
                className="max-w-[100px]"
              />
              <span className="text-xs text-gray-500 dark:text-dark-500">
                minutes
              </span>
            </div>
          </FieldGroup>

          <FieldGroup
            label="Session Timeout"
            htmlFor="sessionTimeout"
            description="Auto-logout after inactivity period"
          >
            <div className="flex items-center gap-3">
              <SettingsInput
                id="sessionTimeout"
                type="number"
                value={securitySettings.sessionTimeout}
                onChange={(v) =>
                  updateSecurity("sessionTimeout", parseInt(v) || 15)
                }
                min={5}
                max={480}
                className="max-w-[100px]"
              />
              <span className="text-xs text-gray-500 dark:text-dark-500">
                minutes
              </span>
            </div>
          </FieldGroup>
        </div>
      </SettingsSection>

      {/* Two-Factor Authentication */}
      <SettingsSection
        title="Two-Factor Authentication"
        description="Add an extra layer of security for user accounts"
        icon={<HiOutlineFingerPrint className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <ToggleSettingRow
            id="twoFactorEnabled"
            label="Enable Two-Factor Authentication"
            description="Require a second verification step during login"
            icon={<HiOutlineFingerPrint className="h-4 w-4" />}
            checked={securitySettings.twoFactorEnabled}
            onChange={(v) => updateSecurity("twoFactorEnabled", v)}
          />

          {securitySettings.twoFactorEnabled && (
            <FieldGroup
              label="2FA Method"
              htmlFor="twoFactorMethod"
              description="Choose the default verification method"
            >
              <div className="flex flex-wrap gap-3">
                {[
                  {
                    value: "email",
                    label: "Email OTP",
                    icon: <HiOutlineEnvelope className="h-4 w-4" />,
                  },
                  {
                    value: "sms",
                    label: "SMS OTP",
                    icon: <HiOutlineDevicePhoneMobile className="h-4 w-4" />,
                  },
                  {
                    value: "authenticator",
                    label: "Authenticator App",
                    icon: <HiOutlineKey className="h-4 w-4" />,
                  },
                ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() =>
                      updateSecurity("twoFactorMethod", method.value)
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                      securitySettings.twoFactorMethod === method.value
                        ? "border-primary-500/50 bg-primary-500/10 text-primary-400"
                        : "border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-dark-700 dark:bg-dark-800/50 dark:text-dark-400 dark:hover:border-dark-600 dark:hover:text-dark-200",
                    )}
                  >
                    {method.icon}
                    {method.label}
                  </button>
                ))}
              </div>
            </FieldGroup>
          )}

          <WarningAlert>
            Enabling 2FA affects all users. Ensure users are informed before
            enabling this feature.
          </WarningAlert>
        </div>
      </SettingsSection>

      {/* IP Whitelist */}
      <SettingsSection
        title="IP Whitelist"
        description="Restrict access to specific IP addresses"
        icon={<HiOutlineServerStack className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <ToggleSettingRow
            id="ipWhitelistEnabled"
            label="Enable IP Whitelisting"
            description="Only allow access from specified IP addresses"
            checked={securitySettings.ipWhitelistEnabled}
            onChange={(v) => updateSecurity("ipWhitelistEnabled", v)}
          />

          {securitySettings.ipWhitelistEnabled && (
            <div className="space-y-3">
              <SettingsTextarea
                id="ipWhitelist"
                value={securitySettings.ipWhitelist}
                onChange={(v) => updateSecurity("ipWhitelist", v)}
                placeholder="Enter IP addresses, one per line (e.g., 192.168.1.0/24)"
                rows={4}
              />
              <InfoAlert>
                Enter one IP address or CIDR range per line. Be careful —
                incorrect configuration may lock you out.
              </InfoAlert>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* Audit Log */}
      <SettingsSection
        title="Audit Logging"
        description="Configure audit trail retention"
        icon={<HiOutlineDocumentText className="h-5 w-5" />}
      >
        <FieldGroup
          label="Retention Period"
          htmlFor="auditLogRetentionDays"
          description="How long to keep audit log entries"
        >
          <div className="flex items-center gap-3">
            <SettingsInput
              id="auditLogRetentionDays"
              type="number"
              value={securitySettings.auditLogRetentionDays}
              onChange={(v) =>
                updateSecurity("auditLogRetentionDays", parseInt(v) || 30)
              }
              min={30}
              max={3650}
              className="max-w-[120px]"
            />
            <span className="text-xs text-gray-500 dark:text-dark-500">
              days
            </span>
          </div>
        </FieldGroup>
      </SettingsSection>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Theme */}
      <SettingsSection
        title="Theme"
        description="Choose your preferred color scheme"
        icon={<HiOutlinePaintBrush className="h-5 w-5" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              value: "light" as ThemeMode,
              label: "Light",
              icon: <HiOutlineSun className="h-6 w-6" />,
              desc: "Bright, clean interface",
            },
            {
              value: "dark" as ThemeMode,
              label: "Dark",
              icon: <HiOutlineMoon className="h-6 w-6" />,
              desc: "Easy on the eyes",
            },
            {
              value: "system" as ThemeMode,
              label: "System",
              icon: <HiOutlineComputerDesktop className="h-6 w-6" />,
              desc: "Match OS preference",
            },
          ].map((theme) => (
            <button
              key={theme.value}
              onClick={() => updateAppearance("theme", theme.value)}
              className={cn(
                "group relative flex flex-col items-center gap-3 rounded-xl border px-4 py-5 transition-all",
                appearanceSettings.theme === theme.value
                  ? "border-primary-500/50 bg-primary-500/5 ring-1 ring-primary-500/20"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 dark:border-dark-700 dark:bg-dark-800/50 dark:hover:border-dark-600 dark:hover:bg-dark-700/30",
              )}
            >
              {/* Checkmark indicator */}
              {appearanceSettings.theme === theme.value && (
                <div className="absolute right-3 top-3">
                  <HiOutlineCheckCircle className="h-5 w-5 text-primary-400" />
                </div>
              )}
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                  appearanceSettings.theme === theme.value
                    ? "bg-primary-500/15 text-primary-400"
                    : "bg-gray-100 text-gray-400 group-hover:text-gray-600 dark:bg-dark-700/50 dark:text-dark-400 dark:group-hover:text-dark-300",
                )}
              >
                {theme.icon}
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    appearanceSettings.theme === theme.value
                      ? "text-primary-400"
                      : "text-gray-700 dark:text-dark-200",
                  )}
                >
                  {theme.label}
                </p>
                <p className="mt-0.5 text-2xs text-gray-500 dark:text-dark-500">
                  {theme.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </SettingsSection>

      {/* Accent Color */}
      <SettingsSection
        title="Accent Color"
        description="Choose the primary accent color used throughout the application"
        icon={<HiOutlineSquares2X2 className="h-5 w-5" />}
      >
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => updateAppearance("accentColor", color.value)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3.5 py-2 transition-all",
                appearanceSettings.accentColor === color.value
                  ? "border-primary-500/50 bg-primary-500/5 ring-1 ring-primary-500/20"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-dark-700 dark:bg-dark-800/50 dark:hover:border-dark-600",
              )}
            >
              <span
                className="h-5 w-5 rounded-full ring-2 ring-gray-300 dark:ring-dark-600"
                style={{ backgroundColor: color.color }}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  appearanceSettings.accentColor === color.value
                    ? "text-primary-600 dark:text-white"
                    : "text-gray-600 dark:text-dark-300",
                )}
              >
                {color.label}
              </span>
            </button>
          ))}
        </div>
        <InfoAlert>
          Accent color changes require a page reload to take full effect.
        </InfoAlert>
      </SettingsSection>

      {/* Layout Preferences */}
      <SettingsSection
        title="Layout Preferences"
        description="Customize the dashboard layout and density"
        icon={<HiOutlineChartBarSquare className="h-5 w-5" />}
      >
        <div className="space-y-5">
          <FieldGroup
            label="Content Density"
            description="Adjust spacing between elements"
          >
            <div className="flex gap-3">
              {(["compact", "comfortable", "spacious"] as const).map(
                (density) => (
                  <button
                    key={density}
                    onClick={() => updateAppearance("density", density)}
                    className={cn(
                      "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium capitalize transition-all",
                      appearanceSettings.density === density
                        ? "border-primary-500/50 bg-primary-500/10 text-primary-400"
                        : "border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400 hover:text-gray-700 dark:border-dark-700 dark:bg-dark-800/50 dark:text-dark-400 dark:hover:border-dark-600 dark:hover:text-dark-200",
                    )}
                  >
                    {density}
                  </button>
                ),
              )}
            </div>
          </FieldGroup>

          <FieldGroup
            label="Default Table Rows"
            htmlFor="tableRowsPerPage"
            description="Number of rows displayed per page in tables"
          >
            <SettingsSelect
              id="tableRowsPerPage"
              value={String(appearanceSettings.tableRowsPerPage)}
              onChange={(v) =>
                updateAppearance("tableRowsPerPage", parseInt(v))
              }
              options={[
                { value: "10", label: "10 rows per page" },
                { value: "20", label: "20 rows per page" },
                { value: "50", label: "50 rows per page" },
                { value: "100", label: "100 rows per page" },
              ]}
            />
          </FieldGroup>

          <FieldGroup
            label="Dashboard Layout"
            htmlFor="dashboardLayout"
            description="Choose the default dashboard widget arrangement"
          >
            <SettingsSelect
              id="dashboardLayout"
              value={appearanceSettings.dashboardLayout}
              onChange={(v) => updateAppearance("dashboardLayout", v)}
              options={[
                { value: "default", label: "Default (Stats + Charts + Lists)" },
                { value: "compact", label: "Compact (Stats + Summary)" },
                {
                  value: "analytics",
                  label: "Analytics Focused (Charts Heavy)",
                },
                { value: "minimal", label: "Minimal (Stats Only)" },
              ]}
            />
          </FieldGroup>
        </div>
      </SettingsSection>

      {/* UI Options */}
      <SettingsSection
        title="UI Options"
        description="Fine-tune the visual behavior of the interface"
        icon={<HiOutlineEyeSlash className="h-5 w-5" />}
      >
        <div className="divide-y divide-gray-200 dark:divide-dark-700/30">
          <ToggleSettingRow
            id="sidebarCollapsed"
            label="Collapse Sidebar by Default"
            description="Start with a compact sidebar showing only icons"
            checked={appearanceSettings.sidebarCollapsed}
            onChange={(v) => updateAppearance("sidebarCollapsed", v)}
          />
          <ToggleSettingRow
            id="animationsEnabled"
            label="Enable Animations"
            description="Show smooth transitions and micro-animations"
            checked={appearanceSettings.animationsEnabled}
            onChange={(v) => updateAppearance("animationsEnabled", v)}
          />
          <ToggleSettingRow
            id="showAvatars"
            label="Show User Avatars"
            description="Display profile photos and initials in tables and lists"
            checked={appearanceSettings.showAvatars}
            onChange={(v) => updateAppearance("showAvatars", v)}
          />
        </div>
      </SettingsSection>
    </div>
  );

  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="animate-fade-in">
      {/* ---- Page Header ---- */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            System Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
            Configure your HRMS application settings and preferences
          </p>
        </div>

        {/* Save / Reset buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={isSaving}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5",
              "border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700",
              "text-sm font-medium text-gray-700 dark:text-dark-200",
              "transition-colors duration-200",
              "hover:bg-gray-50 dark:hover:bg-dark-600 hover:text-gray-900 dark:hover:text-white",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <HiOutlineArrowPath className="h-4 w-4" />
            <span className="hidden sm:inline">Reset to Defaults</span>
            <span className="sm:hidden">Reset</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-5 py-2.5",
              "text-sm font-semibold text-white",
              "bg-primary-600 hover:bg-primary-500 active:bg-primary-700",
              "transition-all duration-200",
              "shadow-lg shadow-primary-600/20 hover:shadow-primary-500/30",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {isSaving ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Saving…</span>
              </>
            ) : (
              <>
                <HiOutlineCheckCircle className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ---- Tab Navigation + Content ---- */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Tab Navigation (Desktop) */}
        <nav className="hidden lg:flex lg:w-56 lg:flex-shrink-0 lg:flex-col lg:gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary-600/15 text-primary-600 dark:text-primary-400"
                    : "text-gray-500 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-700/50 hover:text-gray-900 dark:hover:text-dark-200",
                )}
              >
                <Icon
                  className={cn(
                    "h-4.5 w-4.5 flex-shrink-0",
                    isActive
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-gray-400 dark:text-dark-500",
                  )}
                />
                {tab.label}
              </button>
            );
          })}

          {/* Sidebar footer info */}
          <div className="mt-4 rounded-lg border border-gray-200 dark:border-dark-700/50 bg-gray-50 dark:bg-dark-800/50 px-3.5 py-3">
            <p className="text-2xs font-medium text-gray-500 dark:text-dark-400">
              Last saved
            </p>
            <p className="mt-0.5 text-2xs text-gray-400 dark:text-dark-500">
              Today at 3:42 PM
            </p>
            <div className="mt-2 h-px bg-gray-200 dark:bg-dark-700/50" />
            <p className="mt-2 text-2xs text-gray-400 dark:text-dark-500">
              Settings changes may require a page refresh to take full effect.
            </p>
          </div>
        </nav>

        {/* Mobile Tab Navigation (Horizontal Scroll) */}
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 dark:bg-dark-800/50 p-1 lg:hidden scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-gray-500 dark:text-dark-400 hover:text-gray-900 dark:hover:text-dark-200",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "general" && renderGeneralTab()}
          {activeTab === "notifications" && renderNotificationsTab()}
          {activeTab === "security" && renderSecurityTab()}
          {activeTab === "appearance" && renderAppearanceTab()}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
