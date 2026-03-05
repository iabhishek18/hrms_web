// ============================================
// Navbar Component — Fully Responsive Design
// ============================================
// Top navigation bar for the HRMS dashboard.
// Features:
//   - Hamburger menu toggle for mobile sidebar
//   - Global search bar with keyboard shortcut hint (⌘K)
//   - Theme toggle (dark/light)
//   - Notification bell with badge and portaled bottom sheet panel (mobile)
//   - User avatar dropdown menu with profile, settings, logout
//   - Breadcrumb / page title display
//   - Fully responsive with mobile-first touch targets (44px min)
//   - Portaled overlays to avoid z-index/overflow clipping
//   - Body scroll lock when panels are open on mobile
//   - Safe area inset support for notched devices

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
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
  HiOutlineXMark,
} from "react-icons/hi2";

// ============================================
// Types
// ============================================

interface NavbarProps {
  onLogout?: () => void;
}

interface UserMenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "danger";
  divider?: boolean;
}

// ============================================
// Portal wrapper — renders children into document.body
// so overlays are never clipped by parent overflow/z-index
// ============================================

function Portal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

// ============================================
// useBodyScrollLock — locks body scroll when active
// Prevents background scrolling when bottom sheets are open
// Also compensates for scrollbar width to prevent layout shift
// ============================================

function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const scrollY = window.scrollY;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    // Use position fixed approach for iOS compatibility
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

// ============================================
// useIsMobile — check if viewport matches a breakpoint
// ============================================

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
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
  const isMobile = useIsMobile();

  // State
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Animation states for smooth enter/exit
  const [notifAnimating, setNotifAnimating] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [userMenuAnimating, setUserMenuAnimating] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);

  // Refs for desktop dropdown positioning & outside click
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuDropdownRef = useRef<HTMLDivElement>(null);
  const notifButtonRef = useRef<HTMLButtonElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // ---- Computed values ----
  const isDark = resolvedTheme === "dark";

  const displayName = user?.employee
    ? `${user.employee.firstName} ${user.employee.lastName}`.trim()
    : user?.email === "admin@hrms.com"
      ? "Abhishek Mishra"
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

  // ---- Lock body scroll when mobile panels open ----
  useBodyScrollLock(isMobile && (notificationPanelOpen || isUserMenuOpen));

  // ---- Notification panel animation lifecycle ----
  useEffect(() => {
    if (notificationPanelOpen) {
      setNotifVisible(true);
      // Use rAF to ensure the DOM has rendered before starting animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setNotifAnimating(true);
        });
      });
      return undefined;
    } else {
      setNotifAnimating(false);
      const timer = setTimeout(() => {
        setNotifVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [notificationPanelOpen]);

  // ---- User menu animation lifecycle ----
  useEffect(() => {
    if (isUserMenuOpen) {
      setUserMenuVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setUserMenuAnimating(true);
        });
      });
      return undefined;
    } else {
      setUserMenuAnimating(false);
      const timer = setTimeout(() => {
        setUserMenuVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isUserMenuOpen]);

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
    // Close user menu if open
    if (isUserMenuOpen) setIsUserMenuOpen(false);
    dispatch(toggleNotificationPanel());
  }, [dispatch, isUserMenuOpen]);

  const handleCloseNotifications = useCallback(() => {
    if (notificationPanelOpen) {
      dispatch(toggleNotificationPanel());
    }
  }, [dispatch, notificationPanelOpen]);

  const handleUserMenuToggle = useCallback(() => {
    // Close notifications if open
    if (notificationPanelOpen) {
      dispatch(toggleNotificationPanel());
    }
    setIsUserMenuOpen((prev) => !prev);
  }, [dispatch, notificationPanelOpen]);

  const handleCloseUserMenu = useCallback(() => {
    setIsUserMenuOpen(false);
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

  // ---- Close on outside click (desktop only) ----
  useEffect(() => {
    if (isMobile) return; // Mobile uses backdrop overlay

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      // Close user menu
      if (
        isUserMenuOpen &&
        userMenuButtonRef.current &&
        !userMenuButtonRef.current.contains(target) &&
        userMenuDropdownRef.current &&
        !userMenuDropdownRef.current.contains(target)
      ) {
        setIsUserMenuOpen(false);
      }

      // Close notification panel
      if (
        notificationPanelOpen &&
        notifButtonRef.current &&
        !notifButtonRef.current.contains(target) &&
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(target)
      ) {
        dispatch(toggleNotificationPanel());
      }
    }

    if (isUserMenuOpen || notificationPanelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen, notificationPanelOpen, dispatch, isMobile]);

  // ---- Close on Escape ----
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (isUserMenuOpen) setIsUserMenuOpen(false);
        if (notificationPanelOpen) dispatch(toggleNotificationPanel());
      }
    }

    if (isUserMenuOpen || notificationPanelOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
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

  // ---- Desktop dropdown position calculation ----
  const getDropdownPosition = useCallback(
    (buttonRef: React.RefObject<HTMLButtonElement | null>, width: number) => {
      if (!buttonRef.current) return { top: 0, right: 0 };
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const calculatedRight = Math.max(8, viewportWidth - rect.right);
      // Ensure dropdown doesn't overflow left
      const maxRight = viewportWidth - width - 8;
      return {
        top: rect.bottom + 8,
        right: Math.min(calculatedRight, maxRight),
      };
    },
    [],
  );

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

  // ---- Notification items (static demo data) ----
  const notifications = [
    {
      title: "Leave Request Approved",
      message: "Your casual leave for Dec 25-26 has been approved.",
      time: "2 hours ago",
      type: "success" as const,
      unread: true,
    },
    {
      title: "New Employee Joined",
      message: "Sarah Wilson has joined the Engineering department.",
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
      message: "Scheduled maintenance this weekend from 2-4 AM.",
      time: "2 days ago",
      type: "info" as const,
      unread: false,
    },
    {
      title: "Performance Review Due",
      message: "Q4 performance reviews are due by end of month.",
      time: "3 days ago",
      type: "warning" as const,
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  // ==================================================
  // RENDER: Notification Panel (portaled)
  // ==================================================

  const renderNotificationPanel = () => {
    if (!notifVisible) return null;

    if (isMobile) {
      // ---- Mobile: Full-screen bottom sheet via portal ----
      return (
        <Portal>
          {/* Backdrop */}
          <div
            className={cn(
              "fixed inset-0 z-[9998] transition-opacity duration-300 ease-out",
              isDark ? "bg-black/60" : "bg-black/40",
              notifAnimating ? "opacity-100" : "opacity-0",
            )}
            style={{ backdropFilter: notifAnimating ? "blur(2px)" : "none" }}
            onClick={handleCloseNotifications}
            aria-hidden="true"
          />
          {/* Bottom sheet */}
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-[9999] flex flex-col",
              "max-h-[80vh] overflow-hidden",
              "rounded-t-2xl shadow-2xl",
              "transition-transform duration-300 ease-out",
              isDark
                ? "bg-dark-800 border-t border-dark-700"
                : "bg-white border-t border-gray-200",
              notifAnimating ? "translate-y-0" : "translate-y-full",
            )}
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.75rem)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div
                className={cn(
                  "h-1.5 w-12 rounded-full",
                  isDark ? "bg-dark-600" : "bg-gray-300",
                )}
              />
            </div>

            {/* Header */}
            <div
              className={cn(
                "flex items-center justify-between px-5 py-3 border-b flex-shrink-0",
                isDark ? "border-dark-700" : "border-gray-100",
              )}
            >
              <div className="flex items-center gap-3">
                <h3
                  className={cn(
                    "text-lg font-semibold",
                    isDark ? "text-white" : "text-gray-900",
                  )}
                >
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      isDark
                        ? "bg-primary-500/15 text-primary-400"
                        : "bg-primary-50 text-primary-600",
                    )}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                onClick={handleCloseNotifications}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                  isDark
                    ? "text-dark-400 hover:bg-dark-700 active:bg-dark-600"
                    : "text-gray-400 hover:bg-gray-100 active:bg-gray-200",
                )}
                aria-label="Close notifications"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable notification list */}
            <div className="flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3.5 px-5 py-4 transition-colors cursor-pointer",
                    index !== notifications.length - 1 &&
                      (isDark
                        ? "border-b border-dark-700/50"
                        : "border-b border-gray-100"),
                    notification.unread &&
                      (isDark ? "bg-dark-700/20" : "bg-primary-50/30"),
                    isDark ? "active:bg-dark-700/50" : "active:bg-gray-50",
                  )}
                >
                  <div className="mt-1.5 flex-shrink-0">
                    <span
                      className={cn(
                        "block h-2.5 w-2.5 rounded-full",
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
                        notification.unread ? "font-semibold" : "font-medium",
                        isDark ? "text-dark-100" : "text-gray-900",
                      )}
                    >
                      {notification.title}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-sm leading-relaxed",
                        isDark ? "text-dark-400" : "text-gray-500",
                      )}
                    >
                      {notification.message}
                    </p>
                    <p
                      className={cn(
                        "mt-1.5 text-xs",
                        isDark ? "text-dark-500" : "text-gray-400",
                      )}
                    >
                      {notification.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className={cn(
                "border-t px-5 py-3 flex-shrink-0",
                isDark ? "border-dark-700" : "border-gray-100",
              )}
            >
              <button
                className={cn(
                  "flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold transition-colors",
                  isDark
                    ? "text-primary-400 hover:bg-dark-700 active:bg-dark-600"
                    : "text-primary-600 hover:bg-primary-50 active:bg-primary-100",
                )}
              >
                View all notifications
              </button>
            </div>
          </div>
        </Portal>
      );
    }

    // ---- Desktop: Positioned dropdown via portal ----
    const pos = getDropdownPosition(notifButtonRef, 384);

    return (
      <Portal>
        <div
          ref={notifDropdownRef}
          className={cn(
            "fixed z-[9999] w-96 overflow-hidden rounded-xl border shadow-lg",
            "transition-all duration-200 ease-out",
            isDark
              ? "border-dark-700 bg-dark-800 shadow-dropdown-dark"
              : "border-gray-200 bg-white shadow-xl",
            notifAnimating
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2",
          )}
          style={{ top: pos.top, right: pos.right }}
        >
          {/* Header */}
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
            {unreadCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-2xs font-medium",
                  isDark
                    ? "bg-primary-500/10 text-primary-400"
                    : "bg-primary-50 text-primary-600",
                )}
              >
                {unreadCount} new
              </span>
            )}
          </div>

          {/* Notification items */}
          <div className="max-h-[28rem] overflow-y-auto scrollbar-thin">
            {notifications.map((notification, index) => (
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
                      notification.unread ? "font-semibold" : "font-medium",
                      isDark ? "text-dark-100" : "text-gray-900",
                    )}
                  >
                    {notification.title}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
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

          {/* Footer */}
          <div
            className={cn(
              "border-t px-4 py-2.5 text-center",
              isDark ? "border-dark-700" : "border-gray-100",
            )}
          >
            <button
              className={cn(
                "text-sm font-medium transition-colors",
                isDark
                  ? "text-primary-400 hover:text-primary-300"
                  : "text-primary-600 hover:text-primary-500",
              )}
            >
              View all notifications
            </button>
          </div>
        </div>
      </Portal>
    );
  };

  // ==================================================
  // RENDER: User Menu (portaled)
  // ==================================================

  const renderUserMenu = () => {
    if (!userMenuVisible) return null;

    if (isMobile) {
      // ---- Mobile: Full-screen bottom sheet via portal ----
      return (
        <Portal>
          {/* Backdrop */}
          <div
            className={cn(
              "fixed inset-0 z-[9998] transition-opacity duration-300 ease-out",
              isDark ? "bg-black/60" : "bg-black/40",
              userMenuAnimating ? "opacity-100" : "opacity-0",
            )}
            style={{ backdropFilter: userMenuAnimating ? "blur(2px)" : "none" }}
            onClick={handleCloseUserMenu}
            aria-hidden="true"
          />
          {/* Bottom sheet */}
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-[9999] flex flex-col",
              "overflow-hidden rounded-t-2xl shadow-2xl",
              "transition-transform duration-300 ease-out",
              isDark
                ? "bg-dark-800 border-t border-dark-700"
                : "bg-white border-t border-gray-200",
              userMenuAnimating ? "translate-y-0" : "translate-y-full",
            )}
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.75rem)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="User menu"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div
                className={cn(
                  "h-1.5 w-12 rounded-full",
                  isDark ? "bg-dark-600" : "bg-gray-300",
                )}
              />
            </div>

            {/* User info header */}
            <div
              className={cn(
                "flex items-center gap-4 px-5 py-4 border-b flex-shrink-0",
                isDark ? "border-dark-700" : "border-gray-100",
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-semibold",
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

              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-base font-semibold truncate",
                    isDark ? "text-white" : "text-gray-900",
                  )}
                >
                  {displayName}
                </p>
                <p
                  className={cn(
                    "mt-0.5 truncate text-sm",
                    isDark ? "text-dark-400" : "text-gray-500",
                  )}
                >
                  {user?.email}
                </p>
                <span
                  className={cn(
                    "mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    userRole === "ADMIN"
                      ? isDark
                        ? "bg-primary-500/15 text-primary-400"
                        : "bg-primary-50 text-primary-600"
                      : userRole === "HR"
                        ? isDark
                          ? "bg-accent-500/15 text-accent-400"
                          : "bg-accent-50 text-accent-600"
                        : isDark
                          ? "bg-success-500/15 text-success-400"
                          : "bg-success-50 text-success-600",
                  )}
                >
                  {roleLabel}
                </span>
              </div>

              <button
                onClick={handleCloseUserMenu}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors self-start flex-shrink-0",
                  isDark
                    ? "text-dark-400 hover:bg-dark-700 active:bg-dark-600"
                    : "text-gray-400 hover:bg-gray-100 active:bg-gray-200",
                )}
                aria-label="Close menu"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {/* Menu items */}
            <div className="py-2 px-3">
              {userMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Fragment key={item.label}>
                    {item.divider && (
                      <div
                        className={cn(
                          "mx-3 my-2 h-px",
                          isDark ? "bg-dark-700" : "bg-gray-100",
                        )}
                      />
                    )}
                    <button
                      onClick={item.onClick}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-xl px-4 py-4 text-base font-medium transition-colors",
                        item.variant === "danger"
                          ? isDark
                            ? "text-danger-400 hover:bg-danger-500/10 active:bg-danger-500/20"
                            : "text-danger-600 hover:bg-danger-50 active:bg-danger-100"
                          : isDark
                            ? "text-dark-200 hover:bg-dark-700 active:bg-dark-600"
                            : "text-gray-700 hover:bg-gray-50 active:bg-gray-100",
                      )}
                      style={{ minHeight: "48px" }}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  </Fragment>
                );
              })}
            </div>
          </div>
        </Portal>
      );
    }

    // ---- Desktop: Positioned dropdown via portal ----
    const pos = getDropdownPosition(userMenuButtonRef, 224);

    return (
      <Portal>
        <div
          ref={userMenuDropdownRef}
          className={cn(
            "fixed z-[9999] w-56 overflow-hidden rounded-xl border shadow-lg",
            "transition-all duration-200 ease-out",
            isDark
              ? "border-dark-700 bg-dark-800 shadow-dropdown-dark"
              : "border-gray-200 bg-white shadow-xl",
            userMenuAnimating
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2",
          )}
          style={{ top: pos.top, right: pos.right }}
        >
          {/* User info header */}
          <div
            className={cn(
              "border-b px-4 py-3",
              isDark ? "border-dark-700" : "border-gray-100",
            )}
          >
            <p
              className={cn(
                "text-sm font-semibold truncate",
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
                  ? isDark
                    ? "bg-primary-500/10 text-primary-400"
                    : "bg-primary-50 text-primary-600"
                  : userRole === "HR"
                    ? isDark
                      ? "bg-accent-500/10 text-accent-400"
                      : "bg-accent-50 text-accent-600"
                    : isDark
                      ? "bg-success-500/10 text-success-400"
                      : "bg-success-50 text-success-600",
              )}
            >
              {roleLabel}
            </span>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            {userMenuItems.map((item) => {
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
                      "flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors",
                      item.variant === "danger"
                        ? isDark
                          ? "text-danger-400 hover:bg-danger-500/10"
                          : "text-danger-600 hover:bg-danger-50"
                        : isDark
                          ? "text-dark-300 hover:bg-dark-700 hover:text-white"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </Fragment>
              );
            })}
          </div>
        </div>
      </Portal>
    );
  };

  // ==================================================
  // RENDER: Main Navbar
  // ==================================================

  return (
    <>
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
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-shrink">
          {/* Mobile hamburger button */}
          <button
            onClick={handleToggleMobileSidebar}
            className={cn(
              "flex items-center justify-center rounded-lg transition-colors lg:hidden",
              isDark
                ? "text-dark-400 hover:bg-dark-800 hover:text-dark-200 active:bg-dark-700"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200",
            )}
            style={{ minWidth: "40px", minHeight: "40px" }}
            aria-label="Toggle sidebar"
          >
            <HiOutlineBars3 className="h-5 w-5" />
          </button>

          {/* Page title */}
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
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {/* Mobile search button */}
          <button
            onClick={handleOpenSearch}
            className={cn(
              "flex items-center justify-center rounded-lg transition-colors md:hidden",
              isDark
                ? "text-dark-400 hover:bg-dark-800 hover:text-dark-200 active:bg-dark-700"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200",
            )}
            style={{ minWidth: "40px", minHeight: "40px" }}
            aria-label="Search"
          >
            <HiOutlineMagnifyingGlass className="h-5 w-5" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={handleToggleTheme}
            className={cn(
              "flex items-center justify-center rounded-lg transition-colors",
              isDark
                ? "text-dark-400 hover:bg-dark-800 hover:text-dark-200 active:bg-dark-700"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200",
            )}
            style={{ minWidth: "40px", minHeight: "40px" }}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <HiOutlineSun className="h-5 w-5" />
            ) : (
              <HiOutlineMoon className="h-5 w-5" />
            )}
          </button>

          {/* Notifications button */}
          <button
            ref={notifButtonRef}
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
            style={{ minWidth: "40px", minHeight: "40px" }}
            aria-label="Notifications"
            aria-expanded={notificationPanelOpen}
            title="Notifications"
          >
            <HiOutlineBell className="h-5 w-5" />
            {/* Badge dot */}
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
              </span>
            )}
          </button>

          {/* Divider — hidden on very small screens */}
          <div
            className={cn(
              "mx-0.5 hidden h-8 w-px sm:mx-1 sm:block",
              isDark ? "bg-dark-700" : "bg-gray-200",
            )}
          />

          {/* User Menu Button */}
          <button
            ref={userMenuButtonRef}
            onClick={handleUserMenuToggle}
            className={cn(
              "flex items-center gap-1.5 sm:gap-2 rounded-lg px-1.5 sm:px-2 py-1.5 transition-colors",
              isDark
                ? "hover:bg-dark-800 active:bg-dark-700"
                : "hover:bg-gray-100 active:bg-gray-200",
              isUserMenuOpen && (isDark ? "bg-dark-800" : "bg-gray-100"),
            )}
            style={{ minHeight: "40px" }}
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
                "hidden h-4 w-4 transition-transform duration-200 sm:block",
                isDark ? "text-dark-400" : "text-gray-400",
                isUserMenuOpen && "rotate-180",
              )}
            />
          </button>
        </div>
      </header>

      {/* Portaled overlays */}
      {renderNotificationPanel()}
      {renderUserMenu()}
    </>
  );
}
