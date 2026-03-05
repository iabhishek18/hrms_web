// ============================================
// Navbar Component — Enhanced Responsive Design
// ============================================
// Top navigation bar for the HRMS dashboard.
// Features:
//   - Hamburger menu toggle for mobile sidebar
//   - Global search bar with keyboard shortcut hint (⌘K)
//   - Theme toggle (dark/light)
//   - Notification bell with badge and dropdown panel
//   - User avatar dropdown menu with profile, settings, logout
//   - Breadcrumb / page title display
//   - Fully responsive with mobile-first touch targets (44px min)
//   - Mobile page title display
//   - Notification panel adapts to mobile (bottom sheet style)
//   - Safe area inset support for notched devices

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import {
  toggleMobileSidebar,
  toggleTheme,
  selectResolvedTheme,
  selectPageTitle,
  toggleCommandPalette,
  toggleNotificationPanel,
  selectNotificationPanelOpen,
} from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";
import {
  HiOutlineBars3,
  HiOutlineMagnifyingGlass,
  HiOutlineBell,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineChevronDown,
  HiOutlineUserCircle,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
  HiOutlineCommandLine,
} from "react-icons/hi2";

// ============================================
// Types
// ============================================

interface NavbarProps {
  onLogout?: () => void;
}

// ============================================
// User Menu Item
// ============================================

interface UserMenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "danger";
  divider?: boolean;
}

// ============================================
// Navbar Component
// ============================================

export function Navbar({ onLogout }: NavbarProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const pageTitle = useAppSelector(selectPageTitle);
  const user = useAppSelector((state) => state.auth.user);
  const notificationPanelOpen = useAppSelector(selectNotificationPanelOpen);

  // User dropdown state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // ---- Computed values ----
  const isDark = resolvedTheme === "dark";

  const displayName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`
    : user?.email || "User";

  const userRole = user?.role || "EMPLOYEE";

  const roleLabel =
    userRole === "ADMIN"
      ? "Administrator"
      : userRole === "HR"
        ? "HR Manager"
        : "Employee";

  const initials = user?.employee
    ? `${user.employee.firstName?.charAt(0) || ""}${user.employee.lastName?.charAt(0) || ""}`.toUpperCase()
    : user?.email?.charAt(0)?.toUpperCase() || "?";

  const avatarUrl = user?.employee?.avatar || null;

  // ---- Handlers ----

  const handleToggleMobileSidebar = useCallback(() => {
    dispatch(toggleMobileSidebar());
  }, [dispatch]);

  const handleToggleTheme = useCallback(() => {
    dispatch(toggleTheme());
  }, [dispatch]);

  const handleOpenSearch = useCallback(() => {
    dispatch(toggleCommandPalette());
  }, [dispatch]);

  const handleToggleNotifications = useCallback(() => {
    dispatch(toggleNotificationPanel());
  }, [dispatch]);

  const handleUserMenuToggle = useCallback(() => {
    setIsUserMenuOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(() => {
    setIsUserMenuOpen(false);
    if (onLogout) {
      onLogout();
    }
  }, [onLogout]);

  const handleNavigateProfile = useCallback(() => {
    setIsUserMenuOpen(false);
    navigate("/profile");
  }, [navigate]);

  const handleNavigateSettings = useCallback(() => {
    setIsUserMenuOpen(false);
    navigate("/settings");
  }, [navigate]);

  // ---- Close user menu and notification panel on outside click ----
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        if (notificationPanelOpen) {
          dispatch(toggleNotificationPanel());
        }
      }
    }

    if (isUserMenuOpen || notificationPanelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen, notificationPanelOpen, dispatch]);

  // ---- Keyboard shortcut for search (Ctrl+K / Cmd+K) ----
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        dispatch(toggleCommandPalette());
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dispatch]);

  // ---- User menu items ----
  const userMenuItems: UserMenuItem[] = [
    {
      label: "My Profile",
      icon: HiOutlineUserCircle,
      onClick: handleNavigateProfile,
    },
    {
      label: "Settings",
      icon: HiOutlineCog6Tooth,
      onClick: handleNavigateSettings,
    },
    {
      label: "Logout",
      icon: HiOutlineArrowRightOnRectangle,
      onClick: handleLogout,
      variant: "danger",
      divider: true,
    },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex w-full items-center justify-between border-b px-3 backdrop-blur-md transition-colors sm:px-4 md:px-6",
        isDark
          ? "border-dark-700/50 bg-dark-900/80"
          : "border-gray-200 bg-white/80",
      )}
      style={{ height: "var(--navbar-height, 64px)" }}
      role="banner"
    >
      {/* ---- Left Section ---- */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile hamburger button — 44px touch target */}
        <button
          onClick={handleToggleMobileSidebar}
          className={cn(
            "flex items-center justify-center rounded-lg transition-colors lg:hidden",
            isDark
              ? "text-dark-400 hover:bg-dark-800 hover:text-dark-200 active:bg-dark-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200",
          )}
          style={{ minWidth: "44px", minHeight: "44px" }}
          aria-label="Toggle sidebar"
        >
          <HiOutlineBars3 className="h-5 w-5" />
        </button>

        {/* Page title / breadcrumb — visible on all screens now */}
        <div className="min-w-0">
          <h1
            className={cn(
              "text-sm sm:text-base md:text-lg font-semibold truncate",
              isDark ? "text-white" : "text-gray-900",
            )}
          >
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* ---- Center Section: Search Bar (hidden on mobile) ---- */}
      <div className="mx-4 hidden max-w-md flex-1 md:block">
        <button
          onClick={handleOpenSearch}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg border px-3.5 py-2 text-sm transition-colors",
            isDark
              ? "border-dark-700 bg-dark-800/50 text-dark-400 hover:border-dark-600 hover:text-dark-300"
              : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:text-gray-500",
          )}
        >
          <HiOutlineMagnifyingGlass className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left">Search anything…</span>
          <kbd
            className={cn(
              "hidden items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-2xs font-medium sm:flex",
              isDark
                ? "border-dark-600 bg-dark-700 text-dark-400"
                : "border-gray-200 bg-white text-gray-400",
            )}
          >
            <HiOutlineCommandLine className="h-3 w-3" />
            <span>K</span>
          </kbd>
        </button>
      </div>

      {/* ---- Right Section ---- */}
      <div className="flex items-center gap-0.5 sm:gap-1.5">
        {/* Mobile search button — 44px touch target */}
        <button
          onClick={handleOpenSearch}
          className={cn(
            "flex items-center justify-center rounded-lg transition-colors md:hidden",
            isDark
              ? "text-dark-400 hover:bg-dark-800 hover:text-dark-200 active:bg-dark-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200",
          )}
          style={{ minWidth: "44px", minHeight: "44px" }}
          aria-label="Search"
        >
          <HiOutlineMagnifyingGlass className="h-5 w-5" />
        </button>

        {/* Theme toggle — 44px touch target */}
        <button
          onClick={handleToggleTheme}
          className={cn(
            "flex items-center justify-center rounded-lg transition-colors",
            isDark
              ? "text-dark-400 hover:bg-dark-800 hover:text-dark-200 active:bg-dark-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200",
          )}
          style={{ minWidth: "44px", minHeight: "44px" }}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <HiOutlineSun className="h-5 w-5" />
          ) : (
            <HiOutlineMoon className="h-5 w-5" />
          )}
        </button>

        {/* Notifications — 44px touch target */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={handleToggleNotifications}
            className={cn(
              "relative flex items-center justify-center rounded-lg transition-colors",
              isDark
                ? "text-dark-400 hover:bg-dark-800 hover:text-dark-200 active:bg-dark-700"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200",
              notificationPanelOpen &&
                (isDark
                  ? "bg-dark-800 text-dark-200"
                  : "bg-gray-100 text-gray-700"),
            )}
            style={{ minWidth: "44px", minHeight: "44px" }}
            aria-label="Notifications"
            aria-expanded={notificationPanelOpen}
            title="Notifications"
          >
            <HiOutlineBell className="h-5 w-5" />
            {/* Notification badge dot */}
            <span className="absolute right-2 top-2 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
            </span>
          </button>

          {/* Notification Dropdown Panel — responsive: bottom sheet on mobile, dropdown on desktop */}
          {notificationPanelOpen && (
            <>
              {/* Mobile overlay backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/40 sm:hidden"
                onClick={() => dispatch(toggleNotificationPanel())}
                aria-hidden="true"
              />
              <div
                className={cn(
                  // Mobile: bottom sheet
                  "fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-hidden rounded-t-2xl border-t shadow-modal animate-slide-in-up",
                  // Desktop: dropdown
                  "sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:z-50 sm:mt-1.5 sm:w-96 sm:rounded-xl sm:border sm:shadow-dropdown sm:animate-fade-in-down",
                  isDark
                    ? "border-dark-700 bg-dark-800 shadow-dropdown-dark"
                    : "border-gray-200 bg-white shadow-lg",
                )}
                style={{
                  paddingBottom: "var(--safe-area-bottom, 0px)",
                }}
              >
                {/* Mobile drag handle */}
                <div className="modal-drag-handle" />

                {/* Panel Header */}
                <div
                  className={cn(
                    "flex items-center justify-between border-b px-4 py-3",
                    isDark ? "border-dark-700" : "border-gray-100",
                  )}
                >
                  <h3
                    className={cn(
                      "text-sm font-semibold",
                      isDark ? "text-white" : "text-gray-900",
                    )}
                  >
                    Notifications
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-2xs font-medium",
                        "bg-primary-500/10 text-primary-400",
                      )}
                    >
                      3 new
                    </span>
                    {/* Close button for mobile */}
                    <button
                      onClick={() => dispatch(toggleNotificationPanel())}
                      className={cn(
                        "flex items-center justify-center rounded-md p-1 sm:hidden",
                        isDark
                          ? "text-dark-400 hover:bg-dark-700"
                          : "text-gray-400 hover:bg-gray-100",
                      )}
                      aria-label="Close notifications"
                    >
                      <HiOutlineChevronDown className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Notification Items */}
                <div className="max-h-[60vh] sm:max-h-[28rem] overflow-y-auto scrollbar-thin">
                  {[
                    {
                      title: "Leave Request Approved",
                      message:
                        "Your casual leave for Dec 25-26 has been approved.",
                      time: "2 hours ago",
                      type: "success" as const,
                      unread: true,
                    },
                    {
                      title: "New Employee Joined",
                      message:
                        "Sarah Wilson has joined the Engineering department.",
                      time: "5 hours ago",
                      type: "info" as const,
                      unread: true,
                    },
                    {
                      title: "Attendance Reminder",
                      message: "Don't forget to clock out before end of day.",
                      time: "1 day ago",
                      type: "warning" as const,
                      unread: true,
                    },
                    {
                      title: "System Maintenance",
                      message:
                        "Scheduled maintenance this weekend from 2-4 AM.",
                      time: "2 days ago",
                      type: "info" as const,
                      unread: false,
                    },
                    {
                      title: "Performance Review Due",
                      message:
                        "Q4 performance reviews are due by end of month.",
                      time: "3 days ago",
                      type: "warning" as const,
                      unread: false,
                    },
                  ].map((notification, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex gap-3 border-b px-4 py-3 transition-colors cursor-pointer",
                        isDark
                          ? "border-dark-700/50 hover:bg-dark-700/50"
                          : "border-gray-50 hover:bg-gray-50",
                        notification.unread &&
                          (isDark ? "bg-dark-700/20" : "bg-primary-50/30"),
                      )}
                    >
                      {/* Type indicator dot */}
                      <div className="mt-1.5 flex-shrink-0">
                        <span
                          className={cn(
                            "block h-2 w-2 rounded-full",
                            notification.type === "success" && "bg-success-400",
                            notification.type === "info" && "bg-info-400",
                            notification.type === "warning" && "bg-warning-400",
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm",
                            notification.unread
                              ? "font-semibold"
                              : "font-medium",
                            isDark ? "text-dark-100" : "text-gray-900",
                          )}
                        >
                          {notification.title}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 text-xs whitespace-pre-wrap break-words",
                            isDark ? "text-dark-400" : "text-gray-500",
                          )}
                        >
                          {notification.message}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-2xs",
                            isDark ? "text-dark-500" : "text-gray-400",
                          )}
                        >
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Panel Footer */}
                <div
                  className={cn(
                    "border-t px-4 py-3 sm:py-2.5 text-center",
                    isDark ? "border-dark-700" : "border-gray-100",
                  )}
                >
                  <button
                    className={cn(
                      "text-xs sm:text-sm font-medium transition-colors py-1",
                      isDark
                        ? "text-primary-400 hover:text-primary-300"
                        : "text-primary-600 hover:text-primary-500",
                    )}
                    style={{
                      minHeight: "44px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider — hidden on very small screens */}
        <div
          className={cn(
            "mx-0.5 hidden h-8 w-px sm:mx-1 sm:block",
            isDark ? "bg-dark-700" : "bg-gray-200",
          )}
        />

        {/* User Menu Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={handleUserMenuToggle}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2.5 rounded-lg px-1.5 sm:px-2 py-1.5 transition-colors",
              isDark
                ? "hover:bg-dark-800 active:bg-dark-700"
                : "hover:bg-gray-100 active:bg-gray-200",
              isUserMenuOpen && (isDark ? "bg-dark-800" : "bg-gray-100"),
            )}
            style={{ minHeight: "44px" }}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
            aria-label={`User menu for ${displayName}`}
          >
            {/* Avatar */}
            <div
              className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold",
                avatarUrl ? "" : "bg-primary-600 text-white",
              )}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            {/* Name and role (hidden on small screens) */}
            <div className="hidden text-left md:block">
              <p
                className={cn(
                  "text-sm font-medium leading-tight max-w-[120px] lg:max-w-[160px] truncate",
                  isDark ? "text-dark-100" : "text-gray-900",
                )}
              >
                {displayName}
              </p>
              <p
                className={cn(
                  "text-2xs leading-tight",
                  isDark ? "text-dark-400" : "text-gray-500",
                )}
              >
                {roleLabel}
              </p>
            </div>

            {/* Chevron — hidden on smallest screens */}
            <HiOutlineChevronDown
              className={cn(
                "hidden h-4 w-4 transition-transform sm:block",
                isDark ? "text-dark-400" : "text-gray-400",
                isUserMenuOpen && "rotate-180",
              )}
            />
          </button>

          {/* Dropdown Menu — responsive: bottom sheet on mobile, dropdown on desktop */}
          {isUserMenuOpen && (
            <>
              {/* Mobile overlay backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/40 sm:hidden"
                onClick={() => setIsUserMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                className={cn(
                  // Mobile: bottom sheet
                  "fixed inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-2xl border-t shadow-modal animate-slide-in-up",
                  // Desktop: dropdown
                  "sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:z-50 sm:mt-1.5 sm:w-56 sm:rounded-xl sm:border sm:shadow-dropdown sm:animate-fade-in-down",
                  isDark
                    ? "border-dark-700 bg-dark-800 shadow-dropdown-dark"
                    : "border-gray-200 bg-white",
                )}
                style={{
                  paddingBottom: "var(--safe-area-bottom, 0px)",
                }}
              >
                {/* Mobile drag handle */}
                <div className="modal-drag-handle" />

                {/* User info header */}
                <div
                  className={cn(
                    "border-b px-4 py-3",
                    isDark ? "border-dark-700" : "border-gray-100",
                  )}
                >
                  <div className="flex items-center gap-3 sm:block">
                    {/* Avatar shown in mobile header */}
                    <div
                      className={cn(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold sm:hidden",
                        avatarUrl ? "" : "bg-primary-600 text-white",
                      )}
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          isDark ? "text-white" : "text-gray-900",
                        )}
                      >
                        {displayName}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 truncate text-xs",
                          isDark ? "text-dark-400" : "text-gray-500",
                        )}
                      >
                        {user?.email}
                      </p>
                      <span
                        className={cn(
                          "mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium",
                          userRole === "ADMIN"
                            ? "bg-primary-500/10 text-primary-400"
                            : userRole === "HR"
                              ? "bg-accent-500/10 text-accent-400"
                              : "bg-success-500/10 text-success-400",
                        )}
                      >
                        {roleLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu items — larger touch targets on mobile */}
                <div className="py-1.5">
                  {userMenuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Fragment key={item.label}>
                        {item.divider && (
                          <div
                            className={cn(
                              "mx-3 my-1 h-px",
                              isDark ? "bg-dark-700" : "bg-gray-100",
                            )}
                          />
                        )}
                        <button
                          onClick={item.onClick}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-3 sm:py-2 text-sm transition-colors",
                            item.variant === "danger"
                              ? isDark
                                ? "text-danger-400 hover:bg-danger-500/10 active:bg-danger-500/20"
                                : "text-danger-600 hover:bg-danger-50 active:bg-danger-100"
                              : isDark
                                ? "text-dark-300 hover:bg-dark-700 hover:text-white active:bg-dark-600"
                                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100",
                          )}
                          style={{ minHeight: "44px" }}
                        >
                          <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
                          <span>{item.label}</span>
                        </button>
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
