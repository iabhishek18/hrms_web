// ============================================
// Sidebar Component
// ============================================
// Collapsible sidebar navigation for the HRMS dashboard.
// Features:
//   - Dark theme matching the reference dashboard
//   - Collapsible/expandable with smooth transitions
//   - Mobile responsive with overlay
//   - Active route highlighting
//   - Grouped navigation sections
//   - User profile section at bottom

import { useCallback, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/hooks/useRedux';
import {
  selectSidebarCollapsed,
  selectSidebarMobileOpen,
  toggleSidebar,
  closeMobileSidebar,
} from '@/store/slices/uiSlice';
import { cn } from '@/utils/cn';
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
} from 'react-icons/hi2';

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
    title: 'Main',
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: HiOutlineHome,
      },
      {
        label: 'Employees',
        path: '/employees',
        icon: HiOutlineUsers,
      },
      {
        label: 'Departments',
        path: '/departments',
        icon: HiOutlineBuildingOffice2,
        roles: ['ADMIN', 'HR'],
      },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        label: 'Leave',
        path: '/leave',
        icon: HiOutlineCalendar,
      },
      {
        label: 'Attendance',
        path: '/attendance',
        icon: HiOutlineClock,
      },
      {
        label: 'Reports',
        path: '/reports',
        icon: HiOutlineChartBarSquare,
        roles: ['ADMIN', 'HR'],
      },
      {
        label: 'Documents',
        path: '/documents',
        icon: HiOutlineDocumentText,
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        label: 'Profile',
        path: '/profile',
        icon: HiOutlineUserCircle,
      },
      {
        label: 'Settings',
        path: '/settings',
        icon: HiOutlineCog6Tooth,
        roles: ['ADMIN'],
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

  // Handle toggle sidebar collapse
  const handleToggle = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  // Handle close mobile sidebar
  const handleCloseMobile = useCallback(() => {
    dispatch(closeMobileSidebar());
  }, [dispatch]);

  // Filter navigation items by user role
  const filteredSections = useMemo(() => {
    return navigationSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            !item.roles || (userRole && item.roles.includes(userRole)),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [userRole]);

  // Check if a path is active (current route or child route)
  const isActive = useCallback(
    (path: string) => {
      if (path === '/dashboard') {
        return location.pathname === '/dashboard' || location.pathname === '/';
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
          'flex h-16 items-center border-b border-dark-700/50 px-4',
          collapsed ? 'justify-center' : 'justify-between',
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-sm font-bold text-white">HR</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">
                HRMSLite
              </span>
              <span className="text-2xs text-dark-400">
                Management System
              </span>
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
          className="hidden rounded-md p-1 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 lg:flex"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <HiOutlineChevronRight className="h-4 w-4" />
          ) : (
            <HiOutlineChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Mobile close button */}
        <button
          onClick={handleCloseMobile}
          className="rounded-md p-1 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 lg:hidden"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin scrollbar-dark">
        {filteredSections.map((section, sectionIndex) => (
          <div key={section.title} className={cn(sectionIndex > 0 && 'mt-6')}>
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
                        'group relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                        collapsed ? 'justify-center' : 'gap-3',
                        active
                          ? 'bg-primary-600/15 text-primary-400'
                          : 'text-dark-400 hover:bg-dark-700/50 hover:text-dark-200',
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-500" />
                      )}

                      {/* Icon */}
                      <Icon
                        className={cn(
                          'h-5 w-5 flex-shrink-0 transition-colors',
                          active
                            ? 'text-primary-400'
                            : 'text-dark-500 group-hover:text-dark-300',
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
          'border-t border-dark-700/50 px-4 py-3',
          collapsed ? 'text-center' : '',
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={handleCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* ---- Mobile Sidebar ---- */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] transform bg-dark-900 shadow-sidebar-dark transition-transform duration-300 ease-in-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      {/* ---- Desktop Sidebar ---- */}
      <aside
        className={cn(
          'hidden h-screen flex-shrink-0 bg-dark-900 shadow-sidebar-dark transition-all duration-300 ease-in-out lg:flex lg:flex-col',
          collapsed ? 'w-[80px]' : 'w-[280px]',
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export default Sidebar;
