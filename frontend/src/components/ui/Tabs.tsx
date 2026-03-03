// ============================================
// Tabs UI Component
// ============================================
// A flexible tab navigation component with:
//   - Multiple visual variants (underline, pills, enclosed)
//   - Controlled and uncontrolled modes
//   - Icon support per tab
//   - Badge/count indicator per tab
//   - Disabled tabs
//   - Multiple sizes (sm, md, lg)
//   - Horizontal and vertical orientations
//   - Keyboard navigation (arrow keys)
//   - Dark theme compatible
//   - Composable: Tabs + TabList + Tab + TabPanels + TabPanel

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useMemo,
} from 'react';
import { cn } from '@/utils/cn';

// ============================================
// Types
// ============================================

export type TabVariant = 'underline' | 'pills' | 'enclosed';
export type TabSize = 'sm' | 'md' | 'lg';
export type TabOrientation = 'horizontal' | 'vertical';

export interface TabItem {
  /** Unique identifier for the tab */
  id: string;
  /** Display label */
  label: string;
  /** Icon element rendered before the label */
  icon?: React.ReactNode;
  /** Badge content (number or string) rendered after the label */
  badge?: number | string;
  /** Whether the tab is disabled */
  disabled?: boolean;
  /** Tab panel content */
  content?: React.ReactNode;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Array of tab items (simple API — alternative to composable children) */
  items?: TabItem[];
  /** Currently active tab ID (controlled mode) */
  activeTab?: string;
  /** Default active tab ID (uncontrolled mode) */
  defaultTab?: string;
  /** Callback fired when the active tab changes */
  onChange?: (tabId: string) => void;
  /** Visual style variant */
  variant?: TabVariant;
  /** Size of the tabs */
  size?: TabSize;
  /** Orientation of the tab list */
  orientation?: TabOrientation;
  /** Whether the tabs should take the full width of the container */
  fullWidth?: boolean;
  /** Whether tab panels should be lazy-rendered (only render active panel) */
  lazyMount?: boolean;
  /** Whether to keep inactive panels mounted after first render */
  keepMounted?: boolean;
  /** Children (composable API: TabList + TabPanels) */
  children?: React.ReactNode;
}

export interface TabListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Children (Tab components) */
  children?: React.ReactNode;
}

export interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Unique identifier for the tab */
  id?: string;
  /** Tab index within the list (auto-assigned if using composable API) */
  index?: number;
  /** Icon element rendered before the label */
  icon?: React.ReactNode;
  /** Badge content rendered after the label */
  badge?: number | string;
  /** Whether the tab is disabled */
  isDisabled?: boolean;
  /** Children (tab label) */
  children?: React.ReactNode;
}

export interface TabPanelsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Children (TabPanel components) */
  children?: React.ReactNode;
}

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Unique identifier matching a Tab's id */
  id?: string;
  /** Tab index within the panels (auto-assigned) */
  index?: number;
  /** Children (panel content) */
  children?: React.ReactNode;
}

// ============================================
// Context
// ============================================

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  variant: TabVariant;
  size: TabSize;
  orientation: TabOrientation;
  fullWidth: boolean;
  lazyMount: boolean;
  keepMounted: boolean;
  tabIds: string[];
  registerTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within a <Tabs> provider');
  }
  return context;
}

// ============================================
// Style Maps
// ============================================

// Tab list container styles per variant
const tabListVariantStyles: Record<TabVariant, Record<TabOrientation, string>> = {
  underline: {
    horizontal: 'border-b border-dark-700/50',
    vertical: 'border-r border-dark-700/50',
  },
  pills: {
    horizontal: 'gap-1.5 rounded-lg bg-dark-800/50 p-1',
    vertical: 'gap-1 rounded-lg bg-dark-800/50 p-1',
  },
  enclosed: {
    horizontal: 'border-b border-dark-700/50',
    vertical: 'border-r border-dark-700/50',
  },
};

// Individual tab button styles per variant
const tabVariantStyles: Record<TabVariant, {
  base: string;
  active: string;
  inactive: string;
  disabled: string;
}> = {
  underline: {
    base: cn(
      'relative px-4 pb-3 pt-2 font-medium transition-all duration-200',
      'border-b-2 -mb-px',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:rounded-t-lg',
    ),
    active: 'border-primary-500 text-primary-400',
    inactive: 'border-transparent text-dark-400 hover:text-dark-200 hover:border-dark-500',
    disabled: 'border-transparent text-dark-600 cursor-not-allowed',
  },
  pills: {
    base: cn(
      'px-4 py-2 font-medium rounded-md transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30',
    ),
    active: 'bg-primary-600 text-white shadow-sm shadow-primary-600/20',
    inactive: 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50',
    disabled: 'text-dark-600 cursor-not-allowed',
  },
  enclosed: {
    base: cn(
      'px-4 py-2.5 font-medium transition-all duration-200',
      'border border-transparent -mb-px',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30',
    ),
    active: cn(
      'bg-dark-800 border-dark-700/50 border-b-dark-800 text-white',
      'rounded-t-lg',
    ),
    inactive: 'text-dark-400 hover:text-dark-200 border-transparent',
    disabled: 'text-dark-600 cursor-not-allowed border-transparent',
  },
};

// Size styles for tab buttons
const tabSizeStyles: Record<TabSize, string> = {
  sm: 'text-xs gap-1.5',
  md: 'text-sm gap-2',
  lg: 'text-base gap-2',
};

// Badge size styles
const badgeSizeStyles: Record<TabSize, string> = {
  sm: 'h-4 min-w-[16px] px-1 text-2xs',
  md: 'h-5 min-w-[20px] px-1.5 text-2xs',
  lg: 'h-5 min-w-[20px] px-1.5 text-xs',
};

// Icon size styles
const iconSizeStyles: Record<TabSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

// ============================================
// Tabs Component (Root Provider)
// ============================================

export function Tabs({
  items,
  activeTab: controlledActiveTab,
  defaultTab,
  onChange,
  variant = 'underline',
  size = 'md',
  orientation = 'horizontal',
  fullWidth = false,
  lazyMount = true,
  keepMounted = true,
  children,
  className,
  ...props
}: TabsProps) {
  // Determine initial tab
  const firstTabId = items?.[0]?.id || '';
  const [internalActiveTab, setInternalActiveTab] = useState(
    defaultTab || firstTabId,
  );

  // Use controlled or uncontrolled mode
  const activeTab = controlledActiveTab ?? internalActiveTab;

  const setActiveTab = useCallback(
    (id: string) => {
      if (controlledActiveTab === undefined) {
        setInternalActiveTab(id);
      }
      onChange?.(id);
    },
    [controlledActiveTab, onChange],
  );

  // Track registered tab IDs for keyboard navigation
  const [tabIds, setTabIds] = useState<string[]>(
    items?.map((item) => item.id) || [],
  );

  const registerTab = useCallback((id: string) => {
    setTabIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  // Track which panels have been mounted (for keepMounted behavior)
  const [mountedPanels, setMountedPanels] = useState<Set<string>>(
    new Set([activeTab]),
  );

  useEffect(() => {
    setMountedPanels((prev) => {
      if (prev.has(activeTab)) return prev;
      return new Set(prev).add(activeTab);
    });
  }, [activeTab]);

  const contextValue = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      variant,
      size,
      orientation,
      fullWidth,
      lazyMount,
      keepMounted,
      tabIds,
      registerTab,
    }),
    [activeTab, setActiveTab, variant, size, orientation, fullWidth, lazyMount, keepMounted, tabIds, registerTab],
  );

  // ---- Simple API (using items prop) ----
  if (items && items.length > 0 && !children) {
    return (
      <TabsContext.Provider value={contextValue}>
        <div
          className={cn(
            orientation === 'vertical' && 'flex gap-6',
            className,
          )}
          {...props}
        >
          {/* Tab list */}
          <div
            className={cn(
              'flex',
              orientation === 'horizontal' ? 'flex-row' : 'flex-col',
              tabListVariantStyles[variant][orientation],
              fullWidth && orientation === 'horizontal' && '[&>button]:flex-1',
            )}
            role="tablist"
            aria-orientation={orientation}
          >
            {items.map((item) => (
              <TabButton
                key={item.id}
                id={item.id}
                icon={item.icon}
                badge={item.badge}
                isDisabled={item.disabled}
                isActive={activeTab === item.id}
                onClick={() => !item.disabled && setActiveTab(item.id)}
              >
                {item.label}
              </TabButton>
            ))}
          </div>

          {/* Tab panels */}
          <div className="flex-1">
            {items.map((item) => {
              if (!item.content) return null;

              const isActive = activeTab === item.id;
              const hasBeenMounted = mountedPanels.has(item.id);

              // Lazy mount: don't render until first activated
              if (lazyMount && !hasBeenMounted) return null;

              // Keep mounted: hide inactive panels with CSS
              if (keepMounted && hasBeenMounted) {
                return (
                  <div
                    key={item.id}
                    role="tabpanel"
                    id={`tabpanel-${item.id}`}
                    aria-labelledby={`tab-${item.id}`}
                    hidden={!isActive}
                    className={cn(
                      'mt-4',
                      !isActive && 'hidden',
                      isActive && 'animate-fade-in',
                    )}
                  >
                    {item.content}
                  </div>
                );
              }

              // Default: only render active panel
              if (!isActive) return null;

              return (
                <div
                  key={item.id}
                  role="tabpanel"
                  id={`tabpanel-${item.id}`}
                  aria-labelledby={`tab-${item.id}`}
                  className="mt-4 animate-fade-in"
                >
                  {item.content}
                </div>
              );
            })}
          </div>
        </div>
      </TabsContext.Provider>
    );
  }

  // ---- Composable API (using children) ----
  return (
    <TabsContext.Provider value={contextValue}>
      <div
        className={cn(
          orientation === 'vertical' && 'flex gap-6',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

Tabs.displayName = 'Tabs';

// ============================================
// Internal TabButton (shared renderer)
// ============================================

interface TabButtonProps {
  id: string;
  isActive: boolean;
  isDisabled?: boolean;
  icon?: React.ReactNode;
  badge?: number | string;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({
  id,
  isActive,
  isDisabled = false,
  icon,
  badge,
  onClick,
  children,
}: TabButtonProps) {
  const { variant, size } = useTabsContext();
  const styles = tabVariantStyles[variant];

  return (
    <button
      id={`tab-${id}`}
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap',
        styles.base,
        tabSizeStyles[size],
        isActive
          ? styles.active
          : isDisabled
            ? styles.disabled
            : styles.inactive,
      )}
    >
      {/* Icon */}
      {icon && (
        <span className={cn('flex-shrink-0', iconSizeStyles[size])}>
          {icon}
        </span>
      )}

      {/* Label */}
      <span>{children}</span>

      {/* Badge */}
      {badge !== undefined && badge !== null && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full font-semibold',
            badgeSizeStyles[size],
            isActive
              ? variant === 'pills'
                ? 'bg-white/20 text-white'
                : 'bg-primary-500/15 text-primary-400'
              : 'bg-dark-700 text-dark-400',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ============================================
// TabList Component (Composable)
// ============================================

export const TabList = forwardRef<HTMLDivElement, TabListProps>(
  ({ children, className, ...props }, ref) => {
    const { variant, orientation, fullWidth } = useTabsContext();
    const listRef = useRef<HTMLDivElement>(null);

    // Merge refs
    const mergedRef = (node: HTMLDivElement) => {
      (listRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        const tabButtons = listRef.current?.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]:not([disabled])',
        );
        if (!tabButtons || tabButtons.length === 0) return;

        const currentIndex = Array.from(tabButtons).findIndex(
          (btn) => btn === document.activeElement,
        );

        let nextIndex: number | null = null;

        const isHorizontal = orientation === 'horizontal';

        switch (event.key) {
          case isHorizontal ? 'ArrowRight' : 'ArrowDown':
            event.preventDefault();
            nextIndex = (currentIndex + 1) % tabButtons.length;
            break;
          case isHorizontal ? 'ArrowLeft' : 'ArrowUp':
            event.preventDefault();
            nextIndex =
              (currentIndex - 1 + tabButtons.length) % tabButtons.length;
            break;
          case 'Home':
            event.preventDefault();
            nextIndex = 0;
            break;
          case 'End':
            event.preventDefault();
            nextIndex = tabButtons.length - 1;
            break;
        }

        if (nextIndex !== null) {
          tabButtons[nextIndex].focus();
          tabButtons[nextIndex].click();
        }
      },
      [orientation],
    );

    return (
      <div
        ref={mergedRef}
        role="tablist"
        aria-orientation={orientation}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row' : 'flex-col',
          tabListVariantStyles[variant][orientation],
          fullWidth && orientation === 'horizontal' && '[&>button]:flex-1',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

TabList.displayName = 'TabList';

// ============================================
// Tab Component (Composable)
// ============================================

export const Tab = forwardRef<HTMLButtonElement, TabProps>(
  (
    {
      id,
      index,
      icon,
      badge,
      isDisabled = false,
      children,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const { activeTab, setActiveTab, variant, size, registerTab } =
      useTabsContext();

    const tabId = id || `tab-${index}`;
    const isActive = activeTab === tabId;

    // Register tab ID on mount
    useEffect(() => {
      registerTab(tabId);
    }, [tabId, registerTab]);

    const styles = tabVariantStyles[variant];

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isDisabled) {
        setActiveTab(tabId);
        onClick?.(e);
      }
    };

    return (
      <button
        ref={ref}
        id={`tab-${tabId}`}
        role="tab"
        type="button"
        aria-selected={isActive}
        aria-controls={`tabpanel-${tabId}`}
        aria-disabled={isDisabled}
        disabled={isDisabled}
        tabIndex={isActive ? 0 : -1}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap',
          styles.base,
          tabSizeStyles[size],
          isActive
            ? styles.active
            : isDisabled
              ? styles.disabled
              : styles.inactive,
          className,
        )}
        {...props}
      >
        {/* Icon */}
        {icon && (
          <span className={cn('flex-shrink-0', iconSizeStyles[size])}>
            {icon}
          </span>
        )}

        {/* Label */}
        <span>{children}</span>

        {/* Badge */}
        {badge !== undefined && badge !== null && (
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full font-semibold',
              badgeSizeStyles[size],
              isActive
                ? variant === 'pills'
                  ? 'bg-white/20 text-white'
                  : 'bg-primary-500/15 text-primary-400'
                : 'bg-dark-700 text-dark-400',
            )}
          >
            {badge}
          </span>
        )}
      </button>
    );
  },
);

Tab.displayName = 'Tab';

// ============================================
// TabPanels Component (Composable)
// ============================================

export const TabPanels = forwardRef<HTMLDivElement, TabPanelsProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex-1', className)} {...props}>
        {children}
      </div>
    );
  },
);

TabPanels.displayName = 'TabPanels';

// ============================================
// TabPanel Component (Composable)
// ============================================

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(
  ({ id, index, children, className, ...props }, ref) => {
    const { activeTab, lazyMount, keepMounted } = useTabsContext();
    const panelId = id || `tab-${index}`;
    const isActive = activeTab === panelId;

    // Track if this panel has ever been active (for keepMounted)
    const [hasBeenActive, setHasBeenActive] = useState(isActive);

    useEffect(() => {
      if (isActive && !hasBeenActive) {
        setHasBeenActive(true);
      }
    }, [isActive, hasBeenActive]);

    // Lazy mount: don't render until first activated
    if (lazyMount && !hasBeenActive) return null;

    // Keep mounted: hide with CSS after first mount
    if (keepMounted && hasBeenActive) {
      return (
        <div
          ref={ref}
          role="tabpanel"
          id={`tabpanel-${panelId}`}
          aria-labelledby={`tab-${panelId}`}
          hidden={!isActive}
          className={cn(
            'mt-4',
            !isActive && 'hidden',
            isActive && 'animate-fade-in',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      );
    }

    // Default: only render when active
    if (!isActive) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabpanel-${panelId}`}
        aria-labelledby={`tab-${panelId}`}
        className={cn('mt-4 animate-fade-in', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

TabPanel.displayName = 'TabPanel';

// ============================================
// Exports
// ============================================

export default Tabs;
