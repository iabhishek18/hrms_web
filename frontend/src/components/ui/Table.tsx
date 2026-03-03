// ============================================
// Table UI Component
// ============================================
// A comprehensive, reusable table component with:
//   - Column-based configuration with flexible rendering
//   - Sortable columns with ascending/descending indicators
//   - Row click handling and selection
//   - Loading skeleton state
//   - Empty state display
//   - Responsive horizontal scroll
//   - Row actions menu (view, edit, delete, custom)
//   - Pagination sub-component
//   - Striped rows option
//   - Compact and comfortable density modes
//   - Dark theme compatible
//   - Fully typed with generics for row data

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import {
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineChevronUpDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineEllipsisVertical,
  HiOutlineInboxStack,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';

// ============================================
// Types
// ============================================

export type SortDirection = 'asc' | 'desc' | null;
export type TableDensity = 'compact' | 'comfortable' | 'spacious';

export interface TableColumn<T> {
  /** Unique identifier for the column */
  id: string;
  /** Column header label */
  header: string;
  /** Property key to access from the row data (dot notation supported) */
  accessorKey?: keyof T | string;
  /** Custom cell renderer function */
  cell?: (row: T, rowIndex: number) => React.ReactNode;
  /** Custom header renderer function */
  headerCell?: () => React.ReactNode;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Column width (CSS value, e.g., '200px', '25%', 'auto') */
  width?: string;
  /** Minimum width */
  minWidth?: string;
  /** Maximum width */
  maxWidth?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Whether to hide this column on smaller screens */
  hideOnMobile?: boolean;
  /** Whether to truncate content with ellipsis */
  truncate?: boolean;
  /** Additional class name for the column cells */
  className?: string;
  /** Additional class name for the header cell */
  headerClassName?: string;
  /** Whether the column is sticky (left or right) */
  sticky?: 'left' | 'right';
  /** Whether this column should be hidden */
  hidden?: boolean;
}

export interface TableRowAction<T> {
  /** Label for the action */
  label: string;
  /** Icon element */
  icon?: React.ReactNode;
  /** Callback when the action is clicked */
  onClick: (row: T, rowIndex: number) => void;
  /** Whether the action should be hidden for a specific row */
  hidden?: (row: T) => boolean;
  /** Whether the action is disabled for a specific row */
  disabled?: (row: T) => boolean;
  /** Visual variant (affects text color) */
  variant?: 'default' | 'danger' | 'success' | 'warning';
  /** Whether to show a divider above this action */
  divider?: boolean;
}

export interface TableProps<T> {
  /** Array of column definitions */
  columns: TableColumn<T>[];
  /** Array of data rows */
  data: T[];
  /** Unique key extractor for each row (defaults to index) */
  rowKey?: (row: T, index: number) => string | number;
  /** Row actions dropdown menu items */
  rowActions?: TableRowAction<T>[];
  /** Whether the table is in a loading state */
  isLoading?: boolean;
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number;
  /** Whether rows should have alternating (striped) background */
  striped?: boolean;
  /** Density mode (affects row padding) */
  density?: TableDensity;
  /** Whether rows are hoverable */
  hoverable?: boolean;
  /** Callback when a row is clicked */
  onRowClick?: (row: T, rowIndex: number) => void;
  /** Currently sorted column ID */
  sortColumn?: string | null;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Callback when a sortable column header is clicked */
  onSort?: (columnId: string, direction: SortDirection) => void;
  /** Custom empty state component */
  emptyState?: React.ReactNode;
  /** Empty state title text */
  emptyTitle?: string;
  /** Empty state description text */
  emptyDescription?: string;
  /** Empty state icon */
  emptyIcon?: React.ReactNode;
  /** Whether to show the header row */
  showHeader?: boolean;
  /** Additional class name for the table wrapper */
  wrapperClassName?: string;
  /** Additional class name for the table element */
  tableClassName?: string;
  /** Additional class name for the thead element */
  headerClassName?: string;
  /** Additional class name for the tbody element */
  bodyClassName?: string;
  /** Custom row class name (can be a function for conditional styling) */
  rowClassName?: string | ((row: T, index: number) => string);
  /** Selected row keys (for highlighting) */
  selectedRows?: Set<string | number>;
  /** Callback when row selection changes */
  onRowSelect?: (rowKey: string | number, selected: boolean) => void;
  /** Whether to show row selection checkboxes */
  selectable?: boolean;
  /** Caption for accessibility */
  caption?: string;
  /** Fixed table layout (columns won't auto-resize) */
  fixedLayout?: boolean;
  /** Maximum height for the table (enables vertical scrolling) */
  maxHeight?: string;
  /** Footer content (rendered below the table body) */
  footer?: React.ReactNode;
}

export interface PaginationProps {
  /** Current page number (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items across all pages */
  totalItems?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Callback when the page changes */
  onPageChange: (page: number) => void;
  /** Callback when the page size changes */
  onPageSizeChange?: (size: number) => void;
  /** Whether the previous page button is disabled */
  hasPrevPage?: boolean;
  /** Whether the next page button is disabled */
  hasNextPage?: boolean;
  /** Number of visible page number buttons */
  visiblePages?: number;
  /** Whether pagination is loading */
  isLoading?: boolean;
  /** Additional class name */
  className?: string;
  /** Whether to show the page size selector */
  showPageSize?: boolean;
  /** Whether to show the total items count */
  showTotal?: boolean;
  /** Whether to compact the pagination on mobile */
  compact?: boolean;
}

// ============================================
// Style Maps
// ============================================

const densityStyles: Record<TableDensity, { header: string; cell: string }> = {
  compact: {
    header: 'px-3 py-2',
    cell: 'px-3 py-2',
  },
  comfortable: {
    header: 'px-4 py-3',
    cell: 'px-4 py-3',
  },
  spacious: {
    header: 'px-5 py-4',
    cell: 'px-5 py-4',
  },
};

const alignStyles: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const actionVariantStyles: Record<string, string> = {
  default: 'text-dark-300 hover:bg-dark-700 hover:text-white',
  danger: 'text-danger-400 hover:bg-danger-500/10',
  success: 'text-success-400 hover:bg-success-500/10',
  warning: 'text-warning-400 hover:bg-warning-500/10',
};

// ============================================
// Helper: Get nested value from object by path
// ============================================

function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

// ============================================
// RowActionsMenu Sub-component
// ============================================

interface RowActionsMenuProps<T> {
  row: T;
  rowIndex: number;
  actions: TableRowAction<T>[];
}

function RowActionsMenu<T>({ row, rowIndex, actions }: RowActionsMenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter visible actions
  const visibleActions = actions.filter(
    (action) => !action.hidden || !action.hidden(row),
  );

  if (visibleActions.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          'text-dark-400 transition-colors',
          'hover:bg-dark-700 hover:text-dark-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
          isOpen && 'bg-dark-700 text-dark-200',
        )}
        aria-label="Row actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <HiOutlineEllipsisVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute right-0 top-full z-50 mt-1',
            'min-w-[160px] overflow-hidden rounded-xl',
            'border border-dark-700 bg-dark-800',
            'shadow-dropdown-dark',
            'animate-fade-in-down',
            'py-1',
          )}
        >
          {visibleActions.map((action, actionIndex) => {
            const isDisabled = action.disabled?.(row) ?? false;

            return (
              <React.Fragment key={action.label}>
                {action.divider && actionIndex > 0 && (
                  <div className="mx-2 my-1 h-px bg-dark-700" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDisabled) {
                      action.onClick(row, rowIndex);
                      setIsOpen(false);
                    }
                  }}
                  disabled={isDisabled}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                    actionVariantStyles[action.variant || 'default'],
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {action.icon && (
                    <span className="h-4 w-4 flex-shrink-0">{action.icon}</span>
                  )}
                  <span>{action.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// SkeletonRow Sub-component
// ============================================

function SkeletonRow({
  columnsCount,
  density,
  hasActions,
}: {
  columnsCount: number;
  density: TableDensity;
  hasActions: boolean;
}) {
  const cells = densityStyles[density];

  return (
    <tr className="border-b border-dark-700/30">
      {Array.from({ length: columnsCount }).map((_, i) => (
        <td key={i} className={cn(cells.cell)}>
          <div
            className="h-4 animate-pulse rounded bg-dark-700/50"
            style={{ width: `${Math.random() * 40 + 40}%` }}
          />
        </td>
      ))}
      {hasActions && (
        <td className={cn(cells.cell, 'w-12')}>
          <div className="h-4 w-6 animate-pulse rounded bg-dark-700/50 mx-auto" />
        </td>
      )}
    </tr>
  );
}

// ============================================
// Empty State Sub-component
// ============================================

function DefaultEmptyState({
  title,
  description,
  icon,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-dark-700/50">
        {icon || <HiOutlineInboxStack className="h-8 w-8 text-dark-500" />}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-dark-300">
        {title || 'No data found'}
      </h3>
      <p className="mt-1 max-w-sm text-center text-xs text-dark-500">
        {description || 'There are no records to display. Try adjusting your filters or adding new data.'}
      </p>
    </div>
  );
}

// ============================================
// SortIcon Sub-component
// ============================================

function SortIcon({
  direction,
  active,
}: {
  direction: SortDirection;
  active: boolean;
}) {
  if (!active || !direction) {
    return <HiOutlineChevronUpDown className="h-3.5 w-3.5 text-dark-500" />;
  }

  if (direction === 'asc') {
    return <HiOutlineChevronUp className="h-3.5 w-3.5 text-primary-400" />;
  }

  return <HiOutlineChevronDown className="h-3.5 w-3.5 text-primary-400" />;
}

// ============================================
// Table Component
// ============================================

export function Table<T>({
  columns,
  data,
  rowKey,
  rowActions,
  isLoading = false,
  skeletonRows = 5,
  striped = false,
  density = 'comfortable',
  hoverable = true,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  emptyState,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  showHeader = true,
  wrapperClassName,
  tableClassName,
  headerClassName,
  bodyClassName,
  rowClassName,
  selectedRows,
  selectable = false,
  onRowSelect,
  caption,
  fixedLayout = false,
  maxHeight,
  footer,
}: TableProps<T>) {
  // Filter out hidden columns
  const visibleColumns = useMemo(
    () => columns.filter((col) => !col.hidden),
    [columns],
  );

  const hasActions = !!rowActions && rowActions.length > 0;

  // Get the row key for a given row
  const getRowKey = useCallback(
    (row: T, index: number): string | number => {
      if (rowKey) return rowKey(row, index);
      // Try common key fields
      const r = row as Record<string, unknown>;
      if (r.id) return String(r.id);
      if (r.key) return String(r.key);
      return index;
    },
    [rowKey],
  );

  // Handle sort column click
  const handleSort = useCallback(
    (columnId: string) => {
      if (!onSort) return;

      let newDirection: SortDirection;
      if (sortColumn === columnId) {
        // Cycle: null → asc → desc → null
        if (sortDirection === null || sortDirection === undefined) {
          newDirection = 'asc';
        } else if (sortDirection === 'asc') {
          newDirection = 'desc';
        } else {
          newDirection = null;
        }
      } else {
        newDirection = 'asc';
      }

      onSort(columnId, newDirection);
    },
    [onSort, sortColumn, sortDirection],
  );

  // Handle row selection checkbox toggle
  const handleRowSelect = useCallback(
    (key: string | number) => {
      if (!onRowSelect || !selectedRows) return;
      onRowSelect(key, !selectedRows.has(key));
    },
    [onRowSelect, selectedRows],
  );

  // Get cell content
  const getCellContent = useCallback(
    (column: TableColumn<T>, row: T, rowIndex: number): React.ReactNode => {
      if (column.cell) {
        return column.cell(row, rowIndex);
      }

      if (column.accessorKey) {
        const value = getNestedValue(row, column.accessorKey as string);
        if (value === null || value === undefined) return '—';
        return String(value);
      }

      return null;
    },
    [],
  );

  const densityConfig = densityStyles[density];
  const isEmpty = !isLoading && data.length === 0;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-dark-700/50 bg-dark-800',
        wrapperClassName,
      )}
    >
      <div
        className={cn(
          'overflow-x-auto scrollbar-thin',
          maxHeight && 'overflow-y-auto',
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table
          className={cn(
            'w-full',
            fixedLayout && 'table-fixed',
            tableClassName,
          )}
          role="table"
        >
          {/* Accessibility caption */}
          {caption && (
            <caption className="sr-only">{caption}</caption>
          )}

          {/* ---- Table Header ---- */}
          {showHeader && (
            <thead
              className={cn(
                'sticky top-0 z-10',
                'border-b border-dark-700/50',
                'bg-dark-800/95 backdrop-blur-sm',
                headerClassName,
              )}
            >
              <tr>
                {/* Selection checkbox header */}
                {selectable && (
                  <th className={cn(densityConfig.header, 'w-10')}>
                    <span className="sr-only">Select</span>
                  </th>
                )}

                {/* Data columns */}
                {visibleColumns.map((column) => {
                  const isSorted = sortColumn === column.id;
                  const isClickable = column.sortable && !!onSort;

                  return (
                    <th
                      key={column.id}
                      className={cn(
                        densityConfig.header,
                        'text-2xs font-semibold uppercase tracking-wider text-dark-400',
                        alignStyles[column.align || 'left'],
                        isClickable && 'cursor-pointer select-none hover:text-dark-300',
                        isSorted && 'text-primary-400',
                        column.hideOnMobile && 'hidden lg:table-cell',
                        column.sticky === 'left' && 'sticky left-0 z-20 bg-dark-800',
                        column.sticky === 'right' && 'sticky right-0 z-20 bg-dark-800',
                        column.headerClassName,
                      )}
                      style={{
                        width: column.width,
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth,
                      }}
                      onClick={() => isClickable && handleSort(column.id)}
                      aria-sort={
                        isSorted && sortDirection
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                      role="columnheader"
                      scope="col"
                    >
                      {column.headerCell ? (
                        column.headerCell()
                      ) : (
                        <div
                          className={cn(
                            'flex items-center gap-1.5',
                            column.align === 'center' && 'justify-center',
                            column.align === 'right' && 'justify-end',
                          )}
                        >
                          <span>{column.header}</span>
                          {column.sortable && (
                            <SortIcon
                              direction={isSorted ? sortDirection ?? null : null}
                              active={isSorted}
                            />
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}

                {/* Actions column header */}
                {hasActions && (
                  <th
                    className={cn(
                      densityConfig.header,
                      'w-12 text-center text-2xs font-semibold uppercase tracking-wider text-dark-400',
                    )}
                    scope="col"
                  >
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
          )}

          {/* ---- Table Body ---- */}
          <tbody className={cn(bodyClassName)}>
            {/* Loading skeleton rows */}
            {isLoading &&
              Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow
                  key={`skeleton-${i}`}
                  columnsCount={visibleColumns.length + (selectable ? 1 : 0)}
                  density={density}
                  hasActions={hasActions}
                />
              ))}

            {/* Data rows */}
            {!isLoading &&
              data.map((row, rowIndex) => {
                const key = getRowKey(row, rowIndex);
                const isSelected = selectedRows?.has(key) ?? false;
                const isClickable = !!onRowClick;

                const computedRowClassName =
                  typeof rowClassName === 'function'
                    ? rowClassName(row, rowIndex)
                    : rowClassName;

                return (
                  <tr
                    key={key}
                    onClick={() => isClickable && onRowClick?.(row, rowIndex)}
                    className={cn(
                      'border-b border-dark-700/30 transition-colors duration-150',
                      'last:border-b-0',
                      // Striped rows
                      striped && rowIndex % 2 === 1 && 'bg-dark-800/30',
                      // Hoverable
                      hoverable && 'hover:bg-dark-700/30',
                      // Clickable
                      isClickable && 'cursor-pointer',
                      // Selected
                      isSelected && 'bg-primary-500/5 hover:bg-primary-500/10',
                      computedRowClassName,
                    )}
                    role="row"
                    aria-selected={isSelected}
                  >
                    {/* Selection checkbox */}
                    {selectable && (
                      <td className={cn(densityConfig.cell, 'w-10')}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRowSelect(key)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'h-4 w-4 rounded border-dark-600 bg-dark-800',
                            'text-primary-600 cursor-pointer',
                            'focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-0',
                          )}
                          aria-label={`Select row ${rowIndex + 1}`}
                        />
                      </td>
                    )}

                    {/* Data cells */}
                    {visibleColumns.map((column) => (
                      <td
                        key={column.id}
                        className={cn(
                          densityConfig.cell,
                          'text-sm text-dark-200',
                          alignStyles[column.align || 'left'],
                          column.truncate && 'max-w-0 truncate',
                          column.hideOnMobile && 'hidden lg:table-cell',
                          column.sticky === 'left' && 'sticky left-0 z-10 bg-dark-800',
                          column.sticky === 'right' && 'sticky right-0 z-10 bg-dark-800',
                          column.className,
                        )}
                        style={{
                          width: column.width,
                          minWidth: column.minWidth,
                          maxWidth: column.maxWidth,
                        }}
                        role="cell"
                      >
                        {getCellContent(column, row, rowIndex)}
                      </td>
                    ))}

                    {/* Actions cell */}
                    {hasActions && rowActions && (
                      <td
                        className={cn(densityConfig.cell, 'w-12 text-center')}
                        role="cell"
                      >
                        <div className="flex items-center justify-center">
                          <RowActionsMenu
                            row={row}
                            rowIndex={rowIndex}
                            actions={rowActions}
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>

        {/* Empty state */}
        {isEmpty && (
          <div>
            {emptyState || (
              <DefaultEmptyState
                title={emptyTitle}
                description={emptyDescription}
                icon={emptyIcon}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer (typically pagination) */}
      {footer && (
        <div className="border-t border-dark-700/50">
          {footer}
        </div>
      )}
    </div>
  );
}

Table.displayName = 'Table';

// ============================================
// Pagination Component
// ============================================
// A standalone pagination component that can be used
// inside the Table's footer prop or independently.

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  hasPrevPage,
  hasNextPage,
  visiblePages = 5,
  isLoading = false,
  className,
  showPageSize = true,
  showTotal = true,
  compact = false,
}: PaginationProps) {
  // Calculate derived values
  const canGoPrev = hasPrevPage ?? currentPage > 1;
  const canGoNext = hasNextPage ?? currentPage < totalPages;

  // Generate page number array
  const pages = useMemo(() => {
    if (totalPages <= 0) return [];

    const halfVisible = Math.floor(visiblePages / 2);
    let start = Math.max(1, currentPage - halfVisible);
    let end = Math.min(totalPages, start + visiblePages - 1);

    // Adjust start if we're near the end
    if (end - start + 1 < visiblePages) {
      start = Math.max(1, end - visiblePages + 1);
    }

    const pageNumbers: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];

    // Add first page and ellipsis if needed
    if (start > 1) {
      pageNumbers.push(1);
      if (start > 2) {
        pageNumbers.push('ellipsis-start');
      }
    }

    // Add visible page range
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }

    // Add ellipsis and last page if needed
    if (end < totalPages) {
      if (end < totalPages - 1) {
        pageNumbers.push('ellipsis-end');
      }
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  }, [currentPage, totalPages, visiblePages]);

  // Calculate the range of items being displayed
  const startItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems
    ? Math.min(currentPage * pageSize, totalItems)
    : 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        isLoading && 'pointer-events-none opacity-60',
        className,
      )}
    >
      {/* Left side: Items count and page size selector */}
      <div className="flex items-center gap-4">
        {/* Total items display */}
        {showTotal && totalItems !== undefined && (
          <p className="text-xs text-dark-400">
            Showing{' '}
            <span className="font-medium text-dark-200">{startItem}</span>
            {' to '}
            <span className="font-medium text-dark-200">{endItem}</span>
            {' of '}
            <span className="font-medium text-dark-200">
              {totalItems.toLocaleString()}
            </span>{' '}
            results
          </p>
        )}

        {/* Page size selector */}
        {showPageSize && onPageSizeChange && !compact && (
          <div className="hidden items-center gap-2 sm:flex">
            <label
              htmlFor="page-size"
              className="text-xs text-dark-400"
            >
              Rows:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={cn(
                'h-7 rounded-md border border-dark-600 bg-dark-700 px-2 text-xs text-dark-200',
                'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/20',
                'cursor-pointer appearance-none',
              )}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Page navigation */}
      <div className="flex items-center gap-1.5">
        {/* Previous button */}
        <button
          onClick={() => canGoPrev && onPageChange(currentPage - 1)}
          disabled={!canGoPrev || isLoading}
          className={cn(
            'flex h-8 items-center justify-center rounded-lg px-2 text-sm transition-colors',
            'border border-dark-600 bg-dark-700/50',
            'text-dark-300 hover:bg-dark-700 hover:text-dark-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
            'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-dark-700/50',
          )}
          aria-label="Previous page"
        >
          <HiOutlineChevronLeft className="h-4 w-4" />
          {!compact && <span className="ml-1 hidden sm:inline">Prev</span>}
        </button>

        {/* Page number buttons */}
        {!compact && (
          <div className="hidden items-center gap-1 sm:flex">
            {pages.map((page, index) => {
              if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                return (
                  <span
                    key={`${page}-${index}`}
                    className="flex h-8 w-8 items-center justify-center text-xs text-dark-500"
                  >
                    …
                  </span>
                );
              }

              const isCurrentPage = page === currentPage;

              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  disabled={isCurrentPage || isLoading}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                    isCurrentPage
                      ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                      : 'text-dark-300 hover:bg-dark-700 hover:text-dark-100',
                    'disabled:cursor-default',
                  )}
                  aria-label={`Page ${page}`}
                  aria-current={isCurrentPage ? 'page' : undefined}
                >
                  {page}
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile page indicator */}
        {(compact || true) && (
          <span className="flex items-center px-2 text-xs text-dark-400 sm:hidden">
            <span className="font-medium text-dark-200">{currentPage}</span>
            <span className="mx-1">/</span>
            <span>{totalPages || 1}</span>
          </span>
        )}

        {/* Next button */}
        <button
          onClick={() => canGoNext && onPageChange(currentPage + 1)}
          disabled={!canGoNext || isLoading}
          className={cn(
            'flex h-8 items-center justify-center rounded-lg px-2 text-sm transition-colors',
            'border border-dark-600 bg-dark-700/50',
            'text-dark-300 hover:bg-dark-700 hover:text-dark-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
            'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-dark-700/50',
          )}
          aria-label="Next page"
        >
          {!compact && <span className="mr-1 hidden sm:inline">Next</span>}
          <HiOutlineChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

Pagination.displayName = 'Pagination';

// ============================================
// TableSearchBar Sub-component
// ============================================
// A pre-built search bar designed to sit above the table.

export interface TableSearchBarProps {
  /** Current search value */
  value: string;
  /** Callback when the search value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show a clear button */
  clearable?: boolean;
  /** Additional elements to render on the right side (e.g., filter buttons) */
  actions?: React.ReactNode;
  /** Additional class name */
  className?: string;
  /** Debounce delay in ms (0 = no debounce) */
  debounceMs?: number;
}

export function TableSearchBar({
  value,
  onChange,
  placeholder = 'Search…',
  clearable = true,
  actions,
  className,
}: TableSearchBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        'mb-4',
        className,
      )}
    >
      {/* Search input */}
      <div className="relative flex-1 sm:max-w-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <HiOutlineMagnifyingGlass className="h-4 w-4 text-dark-500" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-lg border border-dark-700 bg-dark-800/50',
            'py-2 pl-9 pr-9 text-sm text-white placeholder-dark-500',
            'transition-colors',
            'hover:border-dark-600',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
          )}
        />
        {clearable && value && (
          <button
            onClick={() => onChange('')}
            className={cn(
              'absolute inset-y-0 right-0 flex items-center pr-3',
              'text-dark-500 hover:text-dark-300 transition-colors',
            )}
            aria-label="Clear search"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Right side actions */}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

TableSearchBar.displayName = 'TableSearchBar';

// ============================================
// Exports
// ============================================

export default Table;
