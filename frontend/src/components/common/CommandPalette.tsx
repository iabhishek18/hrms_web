// ============================================
// Command Palette / Search Modal
// ============================================
// A global search/command palette triggered by:
//   - Clicking the search bar in the Navbar
//   - Pressing Ctrl+K / Cmd+K
//
// Features:
//   - Fuzzy search across navigation items, employees, actions
//   - Keyboard navigation (arrow keys, enter, escape)
//   - Grouped results (Navigation, Quick Actions, Pages)
//   - Smooth open/close animations
//   - Mobile responsive (full-screen on small devices)
//   - Focus trap for accessibility
//   - Body scroll lock when open

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/hooks/useRedux";
import {
  selectCommandPaletteOpen,
  setCommandPaletteOpen,
  selectResolvedTheme,
} from "@/store/slices/uiSlice";
import { cn } from "@/utils/cn";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineBuildingOffice2,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineUserCircle,
  HiOutlineCog6Tooth,
  HiOutlineChartBarSquare,
  HiOutlineDocumentText,
  HiOutlineUserPlus,
  HiOutlineClipboardDocumentList,
  HiOutlineArrowRightOnRectangle,
  HiOutlineXMark,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineArrowUturnLeft,
} from "react-icons/hi2";

// ============================================
// Types
// ============================================

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  keywords?: string[];
  action: () => void;
}

// ============================================
// Command Palette Component
// ============================================

export function CommandPalette() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isOpen = useAppSelector(selectCommandPaletteOpen);
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const userRole = useAppSelector((state) => state.auth.user?.role);
  const isDark = resolvedTheme === "dark";

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const isAdminOrHR = userRole === "ADMIN" || userRole === "HR";

  // ---- Close handler ----
  const handleClose = useCallback(() => {
    dispatch(setCommandPaletteOpen(false));
  }, [dispatch]);

  // ---- Navigation helper ----
  const navigateTo = useCallback(
    (path: string) => {
      handleClose();
      navigate(path);
    },
    [handleClose, navigate],
  );

  // ---- Build command items ----
  const allItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      // Navigation
      {
        id: "nav-dashboard",
        label: "Dashboard",
        description: "Go to the main dashboard",
        icon: HiOutlineHome,
        group: "Navigation",
        keywords: ["home", "overview", "main"],
        action: () => navigateTo("/dashboard"),
      },
      {
        id: "nav-employees",
        label: "Employees",
        description: "View and manage employees",
        icon: HiOutlineUsers,
        group: "Navigation",
        keywords: ["staff", "team", "people", "workers"],
        action: () => navigateTo("/employees"),
      },
      {
        id: "nav-departments",
        label: "Departments",
        description: "Manage departments",
        icon: HiOutlineBuildingOffice2,
        group: "Navigation",
        keywords: ["teams", "divisions", "groups", "organization"],
        action: () => navigateTo("/departments"),
      },
      {
        id: "nav-leave",
        label: "Leave Management",
        description: "Manage leave requests and balances",
        icon: HiOutlineCalendar,
        group: "Navigation",
        keywords: ["vacation", "time off", "absence", "holiday", "pto"],
        action: () => navigateTo("/leave"),
      },
      {
        id: "nav-attendance",
        label: "Attendance",
        description: "Track and manage attendance",
        icon: HiOutlineClock,
        group: "Navigation",
        keywords: ["check in", "check out", "time", "present", "absent"],
        action: () => navigateTo("/attendance"),
      },
      {
        id: "nav-profile",
        label: "My Profile",
        description: "View and edit your profile",
        icon: HiOutlineUserCircle,
        group: "Navigation",
        keywords: ["account", "me", "personal", "info"],
        action: () => navigateTo("/profile"),
      },
      {
        id: "nav-settings",
        label: "Settings",
        description: "System settings and configuration",
        icon: HiOutlineCog6Tooth,
        group: "Navigation",
        keywords: ["preferences", "config", "options", "admin"],
        action: () => navigateTo("/settings"),
      },
    ];

    // Quick Actions (Admin/HR only)
    if (isAdminOrHR) {
      items.push(
        {
          id: "action-add-employee",
          label: "Add New Employee",
          description: "Register a new team member",
          icon: HiOutlineUserPlus,
          group: "Quick Actions",
          keywords: ["create", "new", "hire", "onboard", "register"],
          action: () => navigateTo("/employees"),
        },
        {
          id: "action-leave-requests",
          label: "Review Leave Requests",
          description: "Approve or reject pending leave requests",
          icon: HiOutlineClipboardDocumentList,
          group: "Quick Actions",
          keywords: ["approve", "reject", "pending", "leave"],
          action: () => navigateTo("/leave"),
        },
        {
          id: "action-mark-attendance",
          label: "Mark Attendance",
          description: "Record today's attendance",
          icon: HiOutlineClock,
          group: "Quick Actions",
          keywords: ["check in", "present", "absent", "today"],
          action: () => navigateTo("/attendance"),
        },
        {
          id: "action-reports",
          label: "View Reports",
          description: "Analytics and reporting dashboard",
          icon: HiOutlineChartBarSquare,
          group: "Quick Actions",
          keywords: ["analytics", "statistics", "data", "charts"],
          action: () => navigateTo("/dashboard"),
        },
        {
          id: "action-documents",
          label: "Documents",
          description: "Manage company documents",
          icon: HiOutlineDocumentText,
          group: "Quick Actions",
          keywords: ["files", "papers", "upload"],
          action: () => navigateTo("/dashboard"),
        },
      );
    }

    return items;
  }, [isAdminOrHR, navigateTo]);

  // ---- Filter items based on query ----
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;

    const lowerQuery = query.toLowerCase().trim();
    const queryWords = lowerQuery.split(/\s+/);

    return allItems
      .map((item) => {
        const searchText = [
          item.label,
          item.description || "",
          ...(item.keywords || []),
        ]
          .join(" ")
          .toLowerCase();

        // Score: how well does the item match?
        let score = 0;

        for (const word of queryWords) {
          if (item.label.toLowerCase().includes(word)) {
            score += 10; // Label match is highest priority
          }
          if (item.description?.toLowerCase().includes(word)) {
            score += 5;
          }
          if (item.keywords?.some((k) => k.toLowerCase().includes(word))) {
            score += 3;
          }
          if (searchText.includes(word)) {
            score += 1; // Any match
          }
        }

        return { item, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);
  }, [query, allItems]);

  // ---- Group filtered items ----
  const groupedItems = useMemo(() => {
    const groups: { label: string; items: CommandItem[] }[] = [];
    const groupMap = new Map<string, CommandItem[]>();

    for (const item of filteredItems) {
      const existing = groupMap.get(item.group);
      if (existing) {
        existing.push(item);
      } else {
        groupMap.set(item.group, [item]);
      }
    }

    for (const [label, items] of groupMap) {
      groups.push({ label, items });
    }

    return groups;
  }, [filteredItems]);

  // ---- Flat list for keyboard navigation ----
  const flatItems = useMemo(
    () => groupedItems.flatMap((g) => g.items),
    [groupedItems],
  );

  // ---- Animation lifecycle ----
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimating(true);
        });
      });
      return undefined;
    } else {
      setAnimating(false);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ---- Focus input when opened ----
  useEffect(() => {
    if (isOpen && visible) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, visible]);

  // ---- Global keyboard shortcut: Ctrl+K / Cmd+K ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        dispatch(setCommandPaletteOpen(!isOpen));
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, isOpen]);

  // ---- Lock body scroll when open ----
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [isOpen]);

  // ---- Reset active index when query changes ----
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // ---- Scroll active item into view ----
  useEffect(() => {
    const el = itemRefs.current.get(activeIndex);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // ---- Keyboard navigation inside the palette ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < flatItems.length - 1 ? prev + 1 : 0,
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : flatItems.length - 1,
          );
          break;

        case "Enter":
          e.preventDefault();
          if (flatItems[activeIndex]) {
            flatItems[activeIndex].action();
          }
          break;

        case "Escape":
          e.preventDefault();
          handleClose();
          break;
      }
    },
    [flatItems, activeIndex, handleClose],
  );

  // ---- Execute an item ----
  const handleItemClick = useCallback((item: CommandItem) => {
    item.action();
  }, []);

  // ---- Don't render if not visible ----
  if (!visible) return null;

  // ---- Track flat index across groups ----
  let flatIndex = 0;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-start justify-center transition-all duration-200",
        animating ? "opacity-100" : "opacity-0",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Search and commands"
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-200",
          isDark ? "bg-black/60" : "bg-black/40",
          animating ? "backdrop-blur-sm" : "",
        )}
        onClick={handleClose}
      />

      {/* Palette container */}
      <div
        className={cn(
          "relative mt-[10vh] sm:mt-[15vh] w-full max-w-xl mx-4 sm:mx-auto overflow-hidden rounded-xl border shadow-2xl transition-all duration-200",
          isDark
            ? "border-dark-700 bg-dark-900 shadow-black/50"
            : "border-gray-200 bg-white shadow-gray-300/50",
          animating
            ? "translate-y-0 scale-100 opacity-100"
            : "-translate-y-4 scale-95 opacity-0",
        )}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div
          className={cn(
            "flex items-center gap-3 border-b px-4 py-3",
            isDark ? "border-dark-700" : "border-gray-200",
          )}
        >
          <HiOutlineMagnifyingGlass
            className={cn(
              "h-5 w-5 flex-shrink-0",
              isDark ? "text-dark-400" : "text-gray-400",
            )}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions, or commands…"
            className={cn(
              "flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400",
              isDark
                ? "text-dark-100 placeholder:text-dark-500"
                : "text-gray-900 placeholder:text-gray-400",
            )}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                isDark
                  ? "text-dark-400 hover:bg-dark-700 hover:text-dark-200"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600",
              )}
            >
              <HiOutlineXMark className="h-4 w-4" />
            </button>
          )}
          <kbd
            className={cn(
              "hidden items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-2xs font-medium sm:flex",
              isDark
                ? "border-dark-600 bg-dark-800 text-dark-400"
                : "border-gray-200 bg-gray-50 text-gray-400",
            )}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto overscroll-contain p-2"
          role="listbox"
          aria-label="Search results"
        >
          {groupedItems.length > 0 ? (
            groupedItems.map((group) => (
              <div key={group.label} className="mb-2 last:mb-0">
                {/* Group label */}
                <div
                  className={cn(
                    "px-2 py-1.5 text-2xs font-semibold uppercase tracking-wider",
                    isDark ? "text-dark-500" : "text-gray-400",
                  )}
                >
                  {group.label}
                </div>

                {/* Group items */}
                {group.items.map((item) => {
                  const currentIndex = flatIndex++;
                  const isActive = currentIndex === activeIndex;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      ref={(el) => {
                        if (el) {
                          itemRefs.current.set(currentIndex, el);
                        } else {
                          itemRefs.current.delete(currentIndex);
                        }
                      }}
                      onClick={() => handleItemClick(item)}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      role="option"
                      aria-selected={isActive}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100",
                        isActive
                          ? isDark
                            ? "bg-dark-700/70 text-white"
                            : "bg-primary-50 text-primary-900"
                          : isDark
                            ? "text-dark-200 hover:bg-dark-800"
                            : "text-gray-700 hover:bg-gray-50",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
                          isActive
                            ? isDark
                              ? "bg-primary-600/20 text-primary-400"
                              : "bg-primary-100 text-primary-600"
                            : isDark
                              ? "bg-dark-700 text-dark-400"
                              : "bg-gray-100 text-gray-500",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-sm font-medium",
                            isActive
                              ? isDark
                                ? "text-white"
                                : "text-primary-900"
                              : isDark
                                ? "text-dark-100"
                                : "text-gray-900",
                          )}
                        >
                          {item.label}
                        </p>
                        {item.description && (
                          <p
                            className={cn(
                              "truncate text-2xs",
                              isActive
                                ? isDark
                                  ? "text-dark-300"
                                  : "text-primary-600"
                                : isDark
                                  ? "text-dark-500"
                                  : "text-gray-400",
                            )}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Enter hint for active item */}
                      {isActive && (
                        <div
                          className={cn(
                            "flex items-center gap-1 text-2xs",
                            isDark ? "text-dark-400" : "text-gray-400",
                          )}
                        >
                          <HiOutlineArrowUturnLeft className="h-3 w-3 rotate-180" />
                          <span className="hidden sm:inline">Enter</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <HiOutlineMagnifyingGlass
                className={cn(
                  "h-8 w-8",
                  isDark ? "text-dark-600" : "text-gray-300",
                )}
              />
              <p
                className={cn(
                  "text-sm font-medium",
                  isDark ? "text-dark-400" : "text-gray-500",
                )}
              >
                No results found
              </p>
              <p
                className={cn(
                  "text-2xs",
                  isDark ? "text-dark-500" : "text-gray-400",
                )}
              >
                Try a different search term
              </p>
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div
          className={cn(
            "flex items-center gap-4 border-t px-4 py-2.5",
            isDark ? "border-dark-700" : "border-gray-100",
          )}
        >
          <div className="flex items-center gap-1.5">
            <kbd
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded border text-2xs font-medium",
                isDark
                  ? "border-dark-600 bg-dark-800 text-dark-400"
                  : "border-gray-200 bg-gray-50 text-gray-400",
              )}
            >
              ↑
            </kbd>
            <kbd
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded border text-2xs font-medium",
                isDark
                  ? "border-dark-600 bg-dark-800 text-dark-400"
                  : "border-gray-200 bg-gray-50 text-gray-400",
              )}
            >
              ↓
            </kbd>
            <span
              className={cn(
                "text-2xs",
                isDark ? "text-dark-500" : "text-gray-400",
              )}
            >
              Navigate
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd
              className={cn(
                "flex h-5 items-center justify-center rounded border px-1.5 text-2xs font-medium",
                isDark
                  ? "border-dark-600 bg-dark-800 text-dark-400"
                  : "border-gray-200 bg-gray-50 text-gray-400",
              )}
            >
              ↵
            </kbd>
            <span
              className={cn(
                "text-2xs",
                isDark ? "text-dark-500" : "text-gray-400",
              )}
            >
              Select
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd
              className={cn(
                "flex h-5 items-center justify-center rounded border px-1.5 text-2xs font-medium",
                isDark
                  ? "border-dark-600 bg-dark-800 text-dark-400"
                  : "border-gray-200 bg-gray-50 text-gray-400",
              )}
            >
              Esc
            </kbd>
            <span
              className={cn(
                "text-2xs",
                isDark ? "text-dark-500" : "text-gray-400",
              )}
            >
              Close
            </span>
          </div>
          <div
            className={cn(
              "ml-auto text-2xs",
              isDark ? "text-dark-600" : "text-gray-300",
            )}
          >
            {filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default CommandPalette;
