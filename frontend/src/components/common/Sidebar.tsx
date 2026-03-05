// ============================================
// Sidebar Component — Enhanced Responsive Design
// ============================================
// Collapsible sidebar navigation for the HRMS dashboard.
// Features:
//   - Dark theme matching the reference dashboard
//   - Collapsible/expandable with smooth transitions
//   - Mobile responsive with overlay + swipe-to-close gesture
//   - Active route highlighting with animated indicator
//   - Grouped navigation sections
//   - Better touch targets (min 44px) for mobile
//   - Keyboard navigation support
//   - Safe area insets for notched devices

import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import {
  selectSidebarCollapsed,
  selectSidebarMobileOpen,
  toggleSidebar,
  closeMobileSidebar,
} from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineCog6Tooth,
  HiOutlineUserCircle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineXMark,
  HiOutlineDocumentText,
  HiOutlineChartBarSquare,
  HiOutlineBuildingOffice2,
} from "react-icons/hi2";

// ============================================
// Navigation Item Type
// ============================================

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  roles?: string[]; // If specified, only visible to these roles
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// ============================================
// Navigation Configuration
// ============================================

const navigationSections: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        icon: HiOutlineHome,
      },
      {
        label: "Employees",
        path: "/employees",
        icon: HiOutlineUsers,
      },
      {
        label: "Departments",
        path: "/departments",
        icon: HiOutlineBuildingOffice2,
        roles: ["ADMIN", "HR"],
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        label: "Leave",
        path: "/leave",
        icon: HiOutlineCalendar,
      },
      {
        label: "Attendance",
        path: "/attendance",
        icon: HiOutlineClock,
      },
      {
        label: "Reports",
        path: "/reports",
        icon: HiOutlineChartBarSquare,
        roles: ["ADMIN", "HR"],
      },
      {
        label: "Documents",
        path: "/documents",
        icon: HiOutlineDocumentText,
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        label: "Profile",
        path: "/profile",
        icon: HiOutlineUserCircle,
      },
      {
        label: "Settings",
        path: "/settings",
        icon: HiOutlineCog6Tooth,
        roles: ["ADMIN"],
      },
    ],
  },
];

// ============================================
// Sidebar Component
// ============================================

export function Sidebar() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const mobileOpen = useAppSelector(selectSidebarMobileOpen);
  const userRole = useAppSelector((state) => state.auth.user?.role);

  // Swipe gesture state for mobile
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const sidebarRef = useRef<HTMLElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isDragging = useRef(false);

  // Handle toggle sidebar collapse
  const handleToggle = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  // Handle close mobile sidebar
  const handleCloseMobile = useCallback(() => {
    dispatch(closeMobileSidebar());
    setSwipeOffset(0);
  }, [dispatch]);

  // ---- Swipe-to-close gesture for mobile ----
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchCurrentX.current;
    // Only allow swiping left (to close)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 280));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    const diff = touchStartX.current - touchCurrentX.current;
    // If swiped more than 80px left, close the sidebar
    if (diff > 80) {
      handleCloseMobile();
    } else {
      setSwipeOffset(0);
    }
  }, [handleCloseMobile]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        handleCloseMobile();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, handleCloseMobile]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Filter navigation items by user role
  const filteredSections = useMemo(() => {
    return navigationSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !item.roles || (userRole && item.roles.includes(userRole)),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [userRole]);

  // Check if a path is active (current route or child route)
  const isActive = useCallback(
    (path: string) => {
      if (path === "/dashboard") {
        return location.pathname === "/dashboard" || location.pathname === "/";
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname],
  );

  // ---- Sidebar Content (shared between desktop and mobile) ----
  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* ---- Logo / Brand ---- */}
      <div
        className={cn(
          "flex items-center border-b border-dark-700/50 px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
        style={{ height: "var(--navbar-height, 64px)" }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-sm font-bold text-white">HR</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">HRMSLite</span>
              <span className="text-2xs text-dark-400">Management System</span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
            <span className="text-sm font-bold text-white">HR</span>
          </div>
        )}

        {/* Desktop toggle button — hidden on mobile */}
        <button
          onClick={handleToggle}
          className="hidden rounded-md p-1.5 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 lg:flex"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <HiOutlineChevronRight className="h-4 w-4" />
          ) : (
            <HiOutlineChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Mobile close button — larger touch target */}
        <button
          onClick={handleCloseMobile}
          className="flex items-center justify-center rounded-md p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 lg:hidden"
          style={{ minWidth: "44px", minHeight: "44px" }}
          aria-label="Close sidebar"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin scrollbar-dark">
        {filteredSections.map((section, sectionIndex) => (
          <div key={section.title} className={cn(sectionIndex > 0 && "mt-6")}>
            {/* Section Title */}
            {!collapsed && (
              <h3 className="mb-2 px-3 text-2xs font-semibold uppercase tracking-wider text-dark-500">
                {section.title}
              </h3>
            )}

            {collapsed && sectionIndex > 0 && (
              <div className="mx-auto mb-2 h-px w-8 bg-dark-700" />
            )}

            {/* Navigation Items */}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={handleCloseMobile}
                      className={cn(
                        "group relative flex items-center rounded-lg px-3 text-sm font-medium transition-all duration-200 touch-feedback",
                        collapsed ? "justify-center py-2.5" : "gap-3 py-2.5",
                        active
                          ? "bg-primary-600/15 text-primary-400"
                          : "text-dark-400 hover:bg-dark-700/50 hover:text-dark-200",
                      )}
                      style={{ minHeight: "44px" }}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-500" />
                      )}

                      {/* Icon */}
                      <Icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0 transition-colors",
                          active
                            ? "text-primary-400"
                            : "text-dark-500 group-hover:text-dark-300",
                        )}
                      />

                      {/* Label */}
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}

                      {/* Badge */}
                      {item.badge && !collapsed && (
                        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-600/20 px-1.5 text-2xs font-semibold text-primary-400">
                          {item.badge}
                        </span>
                      )}

                      {/* Collapsed tooltip */}
                      {collapsed && (
                        <div className="pointer-events-none absolute left-full z-50 ml-2 hidden rounded-md bg-dark-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
                          {item.label}
                          <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-dark-700" />
                        </div>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ---- Footer / Version ---- */}
      <div
        className={cn(
          "border-t border-dark-700/50 px-4 py-3",
          collapsed ? "text-center" : "",
        )}
      >
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <span className="text-2xs text-dark-500">HRMSLite v1.0.0</span>
            <span className="text-2xs text-dark-600">© 2024</span>
          </div>
        ) : (
          <span className="text-2xs text-dark-600">v1.0</span>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ---- Mobile Overlay ---- */}
      {mobileOpen && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden",
            "transition-opacity duration-300",
          )}
          style={{
            opacity: swipeOffset > 0 ? Math.max(0, 1 - swipeOffset / 280) : 1,
          }}
          onClick={handleCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* ---- Mobile Sidebar with swipe gesture ---- */}
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] bg-dark-900 shadow-sidebar-dark lg:hidden",
          !isDragging.current &&
            "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{
          transform:
            mobileOpen && swipeOffset > 0
              ? `translateX(-${swipeOffset}px)`
              : undefined,
          paddingBottom: "var(--safe-area-bottom, 0px)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation sidebar"
      >
        {sidebarContent}
      </aside>

      {/* ---- Desktop Sidebar ---- */}
      <aside
        className={cn(
          "hidden h-screen flex-shrink-0 bg-dark-900 shadow-sidebar-dark transition-all duration-300 ease-in-out lg:flex lg:flex-col",
          collapsed ? "w-[80px]" : "w-[280px]",
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export default Sidebar;
