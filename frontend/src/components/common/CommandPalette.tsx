// ============================================
// Command Palette — Inline Professional Search
// ============================================
// Replaces modal-style search with a professional inline
// search bar that drops down results directly below the
// Navbar search area. No modal overlay, no backdrop.
//
// Features:
//   - Inline dropdown results panel (not a modal)
//   - Fuzzy search across navigation items & quick actions
//   - Keyboard navigation (arrow keys, enter, escape)
//   - Grouped results (Navigation, Quick Actions)
//   - Smooth slide-down animation
//   - Click-outside to close
//   - Ctrl+K / Cmd+K global shortcut
//   - Recent searches memory
//   - Mobile: full-width floating panel below navbar
//   - Desktop: anchored below the navbar search bar

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
  HiOutlineXMark,
  HiOutlineArrowUturnLeft,
  HiOutlineCommandLine,
  HiOutlineArrowTrendingUp,
  HiOutlineHashtag,
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
// Recent searches (persisted in sessionStorage)
// ============================================

const RECENT_KEY = "hrms_recent_searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(term: string) {
  try {
    const recent = getRecentSearches().filter((r) => r !== term);
    recent.unshift(term);
    sessionStorage.setItem(
      RECENT_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT)),
    );
  } catch {
    // ignore
  }
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
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const isAdminOrHR = userRole === "ADMIN" || userRole === "HR";

  // ---- Close handler ----
  const handleClose = useCallback(() => {
    dispatch(setCommandPaletteOpen(false));
  }, [dispatch]);

  // ---- Navigation helper ----
  const navigateTo = useCallback(
    (path: string) => {
      if (query.trim()) {
        addRecentSearch(query.trim());
      }
      handleClose();
      navigate(path);
    },
    [handleClose, navigate, query],
  );

  // ---- Build command items ----
  const allItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: "nav-dashboard",
        label: "Dashboard",
        description: "Overview & analytics",
        icon: HiOutlineHome,
        group: "Pages",
        keywords: ["home", "overview", "main", "stats"],
        action: () => navigateTo("/dashboard"),
      },
      {
        id: "nav-employees",
        label: "Employees",
        description: "View & manage employees",
        icon: HiOutlineUsers,
        group: "Pages",
        keywords: ["staff", "team", "people", "workers", "members"],
        action: () => navigateTo("/employees"),
      },
      {
        id: "nav-departments",
        label: "Departments",
        description: "Organization structure",
        icon: HiOutlineBuildingOffice2,
        group: "Pages",
        keywords: ["teams", "divisions", "groups", "organization"],
        action: () => navigateTo("/departments"),
      },
      {
        id: "nav-leave",
        label: "Leave Management",
        description: "Requests & balances",
        icon: HiOutlineCalendar,
        group: "Pages",
        keywords: ["vacation", "time off", "absence", "holiday", "pto"],
        action: () => navigateTo("/leave"),
      },
      {
        id: "nav-attendance",
        label: "Attendance",
        description: "Track daily attendance",
        icon: HiOutlineClock,
        group: "Pages",
        keywords: ["check in", "check out", "time", "present", "absent"],
        action: () => navigateTo("/attendance"),
      },
      {
        id: "nav-profile",
        label: "My Profile",
        description: "Account & personal info",
        icon: HiOutlineUserCircle,
        group: "Pages",
        keywords: ["account", "me", "personal", "info", "settings"],
        action: () => navigateTo("/profile"),
      },
      {
        id: "nav-settings",
        label: "Settings",
        description: "System configuration",
        icon: HiOutlineCog6Tooth,
        group: "Pages",
        keywords: ["preferences", "config", "options", "admin"],
        action: () => navigateTo("/settings"),
      },
    ];

    if (isAdminOrHR) {
      items.push(
        {
          id: "action-add-employee",
          label: "Add New Employee",
          description: "Register a new team member",
          icon: HiOutlineUserPlus,
          group: "Actions",
          keywords: ["create", "new", "hire", "onboard", "register"],
          action: () => navigateTo("/employees"),
        },
        {
          id: "action-leave-requests",
          label: "Review Leave Requests",
          description: "Pending approvals",
          icon: HiOutlineClipboardDocumentList,
          group: "Actions",
          keywords: ["approve", "reject", "pending", "leave"],
          action: () => navigateTo("/leave"),
        },
        {
          id: "action-mark-attendance",
          label: "Mark Attendance",
          description: "Record today's attendance",
          icon: HiOutlineClock,
          group: "Actions",
          keywords: ["check in", "present", "absent", "today"],
          action: () => navigateTo("/attendance"),
        },
        {
          id: "action-reports",
          label: "View Reports",
          description: "Analytics & insights",
          icon: HiOutlineChartBarSquare,
          group: "Actions",
          keywords: ["analytics", "statistics", "data", "charts"],
          action: () => navigateTo("/dashboard"),
        },
        {
          id: "action-documents",
          label: "Documents",
          description: "Manage company documents",
          icon: HiOutlineDocumentText,
          group: "Actions",
          keywords: ["files", "papers", "upload", "policy"],
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
        let score = 0;

        for (const word of queryWords) {
          if (item.label.toLowerCase().startsWith(word)) {
            score += 15;
          } else if (item.label.toLowerCase().includes(word)) {
            score += 10;
          }
          if (item.description?.toLowerCase().includes(word)) {
            score += 5;
          }
          if (item.keywords?.some((k) => k.toLowerCase().includes(word))) {
            score += 3;
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

  // ---- Open / close effects ----
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      setRecentSearches(getRecentSearches());
      // Delay focus slightly so the input is mounted
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isOpen]);

  // ---- Global Ctrl+K / Cmd+K ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        dispatch(setCommandPaletteOpen(!isOpen));
      }
      // Escape to close when open
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        handleClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, isOpen, handleClose]);

  // ---- Click outside to close ----
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        handleClose();
      }
    }

    // Delay attaching so the open-click doesn't immediately close
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 10);

    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, handleClose]);

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

  // ---- Keyboard navigation ----
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

  const handleItemClick = useCallback((item: CommandItem) => {
    item.action();
  }, []);

  const handleRecentClick = useCallback((term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  }, []);

  // ---- Don't render if closed ----
  if (!isOpen) return null;

  let flatIndex = 0;
  const showRecent = !query.trim() && recentSearches.length > 0;
  const hasResults = filteredItems.length > 0;

  return createPortal(
    <div
      ref={wrapperRef}
      className={cn("fixed inset-x-0 top-0 z-[80] flex justify-center")}
      style={{ pointerEvents: "none" }}
    >
      {/* The search panel — positioned below the navbar */}
      <div
        className={cn("w-full max-w-2xl mx-3 sm:mx-4 md:mx-auto")}
        style={{
          marginTop: "var(--navbar-height, 64px)",
          pointerEvents: "auto",
        }}
      >
        <div
          className={cn(
            "overflow-hidden rounded-xl border shadow-xl",
            "animate-in fade-in slide-in-from-top-2 duration-150",
            isDark
              ? "border-dark-700/80 bg-dark-900 shadow-black/40"
              : "border-gray-200/80 bg-white shadow-gray-200/60",
          )}
        >
          {/* ── Search Input Bar ── */}
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              isDark ? "bg-dark-900" : "bg-white",
            )}
          >
            <HiOutlineMagnifyingGlass
              className={cn(
                "h-[18px] w-[18px] flex-shrink-0",
                isDark ? "text-primary-400" : "text-primary-500",
              )}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, actions, people…"
              className={cn(
                "flex-1 bg-transparent text-sm font-medium outline-none",
                isDark
                  ? "text-dark-50 placeholder:text-dark-500"
                  : "text-gray-900 placeholder:text-gray-400",
              )}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {query ? (
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
                tabIndex={-1}
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <kbd
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none",
                    isDark
                      ? "border-dark-600 bg-dark-800 text-dark-400"
                      : "border-gray-200 bg-gray-50 text-gray-400",
                  )}
                >
                  <HiOutlineCommandLine className="h-2.5 w-2.5" />K
                </kbd>
              </div>
            )}
          </div>

          {/* ── Divider ── */}
          <div
            className={cn("h-px", isDark ? "bg-dark-700/60" : "bg-gray-100")}
          />

          {/* ── Results Panel ── */}
          <div
            ref={panelRef}
            className={cn(
              "max-h-[min(360px,50vh)] overflow-y-auto overscroll-contain",
              isDark ? "scrollbar-thin-dark" : "scrollbar-thin",
            )}
          >
            {/* Recent Searches */}
            {showRecent && (
              <div className="px-2 pt-2 pb-1">
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1.5",
                    isDark ? "text-dark-500" : "text-gray-400",
                  )}
                >
                  <HiOutlineClock className="h-3 w-3" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Recent
                  </span>
                </div>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleRecentClick(term)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      isDark
                        ? "text-dark-300 hover:bg-dark-800"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <HiOutlineArrowTrendingUp
                      className={cn(
                        "h-3.5 w-3.5 flex-shrink-0",
                        isDark ? "text-dark-500" : "text-gray-400",
                      )}
                    />
                    <span className="truncate">{term}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Search Results */}
            {query.trim() && !hasResults ? (
              <div className="flex flex-col items-center justify-center gap-1.5 py-10">
                <HiOutlineMagnifyingGlass
                  className={cn(
                    "h-7 w-7",
                    isDark ? "text-dark-600" : "text-gray-300",
                  )}
                />
                <p
                  className={cn(
                    "text-sm font-medium",
                    isDark ? "text-dark-400" : "text-gray-500",
                  )}
                >
                  No results for "{query}"
                </p>
                <p
                  className={cn(
                    "text-xs",
                    isDark ? "text-dark-600" : "text-gray-400",
                  )}
                >
                  Try different keywords
                </p>
              </div>
            ) : (
              <div className="p-1.5">
                {groupedItems.map((group) => (
                  <div key={group.label} className="mb-1 last:mb-0">
                    {/* Group header */}
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5",
                        isDark ? "text-dark-500" : "text-gray-400",
                      )}
                    >
                      <HiOutlineHashtag className="h-3 w-3" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">
                        {group.label}
                      </span>
                      <span
                        className={cn(
                          "ml-auto text-[10px] tabular-nums",
                          isDark ? "text-dark-600" : "text-gray-300",
                        )}
                      >
                        {group.items.length}
                      </span>
                    </div>

                    {/* Items */}
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
                            "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-75",
                            isActive
                              ? isDark
                                ? "bg-primary-600/10 text-white"
                                : "bg-primary-50 text-primary-900"
                              : isDark
                                ? "text-dark-200 hover:bg-dark-800/60"
                                : "text-gray-700 hover:bg-gray-50/80",
                          )}
                        >
                          {/* Icon */}
                          <div
                            className={cn(
                              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-75",
                              isActive
                                ? isDark
                                  ? "bg-primary-500/15 text-primary-400"
                                  : "bg-primary-100 text-primary-600"
                                : isDark
                                  ? "bg-dark-800 text-dark-400"
                                  : "bg-gray-100 text-gray-400",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>

                          {/* Label & description */}
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "truncate text-[13px] font-medium leading-tight",
                                isActive
                                  ? isDark
                                    ? "text-white"
                                    : "text-primary-900"
                                  : isDark
                                    ? "text-dark-100"
                                    : "text-gray-800",
                              )}
                            >
                              {item.label}
                            </p>
                            {item.description && (
                              <p
                                className={cn(
                                  "truncate text-[11px] leading-tight mt-0.5",
                                  isActive
                                    ? isDark
                                      ? "text-primary-300/70"
                                      : "text-primary-600/70"
                                    : isDark
                                      ? "text-dark-500"
                                      : "text-gray-400",
                                )}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>

                          {/* Right: enter hint or arrow */}
                          <div
                            className={cn(
                              "flex items-center gap-1 transition-opacity duration-75",
                              isActive ? "opacity-100" : "opacity-0",
                            )}
                          >
                            <kbd
                              className={cn(
                                "inline-flex h-5 items-center rounded border px-1 text-[10px] font-medium",
                                isDark
                                  ? "border-dark-600 bg-dark-800 text-dark-400"
                                  : "border-gray-200 bg-gray-50 text-gray-400",
                              )}
                            >
                              <HiOutlineArrowUturnLeft className="h-2.5 w-2.5 rotate-180" />
                            </kbd>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Footer Bar ── */}
          <div
            className={cn(
              "flex items-center justify-between border-t px-4 py-2",
              isDark
                ? "border-dark-700/60 bg-dark-900/80"
                : "border-gray-100 bg-gray-50/50",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <kbd
                  className={cn(
                    "inline-flex h-[18px] w-[18px] items-center justify-center rounded border text-[10px] font-medium leading-none",
                    isDark
                      ? "border-dark-600 bg-dark-800 text-dark-500"
                      : "border-gray-200 bg-white text-gray-400",
                  )}
                >
                  ↑
                </kbd>
                <kbd
                  className={cn(
                    "inline-flex h-[18px] w-[18px] items-center justify-center rounded border text-[10px] font-medium leading-none",
                    isDark
                      ? "border-dark-600 bg-dark-800 text-dark-500"
                      : "border-gray-200 bg-white text-gray-400",
                  )}
                >
                  ↓
                </kbd>
                <span
                  className={cn(
                    "ml-0.5 text-[10px]",
                    isDark ? "text-dark-600" : "text-gray-400",
                  )}
                >
                  navigate
                </span>
              </div>
              <div className="flex items-center gap-1">
                <kbd
                  className={cn(
                    "inline-flex h-[18px] items-center justify-center rounded border px-1 text-[10px] font-medium leading-none",
                    isDark
                      ? "border-dark-600 bg-dark-800 text-dark-500"
                      : "border-gray-200 bg-white text-gray-400",
                  )}
                >
                  ↵
                </kbd>
                <span
                  className={cn(
                    "ml-0.5 text-[10px]",
                    isDark ? "text-dark-600" : "text-gray-400",
                  )}
                >
                  open
                </span>
              </div>
              <div className="flex items-center gap-1">
                <kbd
                  className={cn(
                    "inline-flex h-[18px] items-center justify-center rounded border px-1 text-[10px] font-medium leading-none",
                    isDark
                      ? "border-dark-600 bg-dark-800 text-dark-500"
                      : "border-gray-200 bg-white text-gray-400",
                  )}
                >
                  esc
                </kbd>
                <span
                  className={cn(
                    "ml-0.5 text-[10px]",
                    isDark ? "text-dark-600" : "text-gray-400",
                  )}
                >
                  close
                </span>
              </div>
            </div>

            <span
              className={cn(
                "text-[10px] tabular-nums",
                isDark ? "text-dark-600" : "text-gray-300",
              )}
            >
              {filteredItems.length} result
              {filteredItems.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default CommandPalette;
