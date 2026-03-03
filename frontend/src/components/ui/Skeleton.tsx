// ============================================
// Skeleton UI Component
// ============================================
// A flexible skeleton / placeholder loading component with:
//   - Multiple preset shapes (text, circle, rectangle, card)
//   - Configurable width, height, and border radius
//   - Shimmer animation effect
//   - Pulse animation (default)
//   - Composable SkeletonGroup for building complex layouts
//   - Dark theme compatible
//   - Lightweight and performant

import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

// ============================================
// Types
// ============================================

export type SkeletonAnimation = 'pulse' | 'shimmer' | 'none';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton (CSS value, e.g., '100%', '200px', '12rem') */
  width?: string | number;
  /** Height of the skeleton (CSS value) */
  height?: string | number;
  /** Border radius (CSS value or Tailwind-like shorthand) */
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string;
  /** Animation type */
  animation?: SkeletonAnimation;
  /** Whether the skeleton is visible (useful for conditional rendering) */
  isLoaded?: boolean;
  /** Content to show when isLoaded is true */
  children?: React.ReactNode;
  /** Base color class (background) */
  baseColor?: string;
  /** Highlight color class (for shimmer) */
  highlightColor?: string;
}

export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of text lines to render */
  lines?: number;
  /** Width of the last line (e.g., '60%', '200px') — shorter for natural look */
  lastLineWidth?: string;
  /** Line height / spacing between lines */
  spacing?: 'tight' | 'normal' | 'loose';
  /** Font size class to match (determines line height) */
  fontSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Animation type */
  animation?: SkeletonAnimation;
}

export interface SkeletonCircleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Diameter of the circle (number in px or CSS string) */
  size?: string | number;
  /** Animation type */
  animation?: SkeletonAnimation;
}

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show a header area */
  showHeader?: boolean;
  /** Whether to show an image/media area */
  showMedia?: boolean;
  /** Number of text lines in the body */
  lines?: number;
  /** Whether to show a footer area */
  showFooter?: boolean;
  /** Height of the media area */
  mediaHeight?: string;
  /** Animation type */
  animation?: SkeletonAnimation;
}

export interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of rows to render */
  rows?: number;
  /** Number of columns to render */
  columns?: number;
  /** Whether to show the header row */
  showHeader?: boolean;
  /** Animation type */
  animation?: SkeletonAnimation;
}

export interface SkeletonAvatarWithTextProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Avatar size */
  avatarSize?: string | number;
  /** Number of text lines beside the avatar */
  lines?: number;
  /** Animation type */
  animation?: SkeletonAnimation;
}

// ============================================
// Style Maps
// ============================================

const radiusStyles: Record<string, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

const textSpacingStyles: Record<string, string> = {
  tight: 'space-y-1.5',
  normal: 'space-y-2.5',
  loose: 'space-y-3.5',
};

const textHeightStyles: Record<string, string> = {
  xs: 'h-3',
  sm: 'h-3.5',
  md: 'h-4',
  lg: 'h-5',
  xl: 'h-6',
};

// ============================================
// Animation styles
// ============================================

const animationStyles: Record<SkeletonAnimation, string> = {
  pulse: 'animate-pulse',
  shimmer: 'animate-shimmer shimmer-bg',
  none: '',
};

// ============================================
// Skeleton Component (Base)
// ============================================

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      width,
      height,
      radius = 'md',
      animation = 'pulse',
      isLoaded = false,
      children,
      baseColor = 'bg-dark-700/50',
      className,
      style,
      ...props
    },
    ref,
  ) => {
    // If loaded, render children instead of skeleton
    if (isLoaded && children) {
      return <>{children}</>;
    }

    // Determine radius class
    const radiusClass =
      radius in radiusStyles
        ? radiusStyles[radius]
        : ''; // Custom radius will be applied via style

    const customRadius =
      radius in radiusStyles ? undefined : radius;

    // Convert numeric width/height to pixels
    const resolvedWidth =
      typeof width === 'number' ? `${width}px` : width;
    const resolvedHeight =
      typeof height === 'number' ? `${height}px` : height;

    return (
      <div
        ref={ref}
        className={cn(
          // Base skeleton appearance
          baseColor,
          // Border radius
          radiusClass,
          // Animation
          animationStyles[animation],
          className,
        )}
        style={{
          width: resolvedWidth,
          height: resolvedHeight,
          borderRadius: customRadius,
          ...style,
        }}
        aria-hidden="true"
        role="presentation"
        {...props}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';

// ============================================
// SkeletonText Component
// ============================================
// Renders multiple lines of skeleton text with natural
// varying widths. The last line is shorter by default
// to mimic real text blocks.

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  (
    {
      lines = 3,
      lastLineWidth = '60%',
      spacing = 'normal',
      fontSize = 'sm',
      animation = 'pulse',
      className,
      ...props
    },
    ref,
  ) => {
    const lineHeight = textHeightStyles[fontSize] || textHeightStyles.sm;

    return (
      <div
        ref={ref}
        className={cn(textSpacingStyles[spacing], className)}
        aria-hidden="true"
        role="presentation"
        {...props}
      >
        {Array.from({ length: lines }).map((_, index) => {
          const isLastLine = index === lines - 1;
          // Generate slightly varying widths for natural look
          const randomWidth =
            isLastLine && lines > 1
              ? lastLineWidth
              : `${85 + Math.floor(Math.random() * 15)}%`;

          return (
            <Skeleton
              key={index}
              width={randomWidth}
              radius="md"
              animation={animation}
              className={lineHeight}
            />
          );
        })}
      </div>
    );
  },
);

SkeletonText.displayName = 'SkeletonText';

// ============================================
// SkeletonCircle Component
// ============================================
// Renders a circular skeleton, typically used as an
// avatar or icon placeholder.

export const SkeletonCircle = forwardRef<HTMLDivElement, SkeletonCircleProps>(
  (
    {
      size = 40,
      animation = 'pulse',
      className,
      ...props
    },
    ref,
  ) => {
    const resolvedSize = typeof size === 'number' ? `${size}px` : size;

    return (
      <Skeleton
        ref={ref}
        width={resolvedSize}
        height={resolvedSize}
        radius="full"
        animation={animation}
        className={cn('flex-shrink-0', className)}
        {...props}
      />
    );
  },
);

SkeletonCircle.displayName = 'SkeletonCircle';

// ============================================
// SkeletonCard Component
// ============================================
// Pre-built card skeleton with optional media area,
// header, body text lines, and footer. Matches the
// Card component structure.

export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  (
    {
      showHeader = true,
      showMedia = false,
      lines = 3,
      showFooter = false,
      mediaHeight = '160px',
      animation = 'pulse',
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden rounded-xl border border-dark-700/50 bg-dark-800',
          className,
        )}
        aria-hidden="true"
        role="presentation"
        {...props}
      >
        {/* Media area (image placeholder) */}
        {showMedia && (
          <Skeleton
            width="100%"
            height={mediaHeight}
            radius="none"
            animation={animation}
          />
        )}

        {/* Header area */}
        {showHeader && (
          <div className={cn('px-4 pt-4 sm:px-5 sm:pt-5', showMedia && 'pt-4')}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton
                  width="50%"
                  animation={animation}
                  className="h-5"
                  radius="md"
                />
                <Skeleton
                  width="30%"
                  animation={animation}
                  className="h-3.5"
                  radius="md"
                />
              </div>
              <Skeleton
                width={36}
                height={36}
                animation={animation}
                radius="lg"
              />
            </div>
          </div>
        )}

        {/* Body area (text lines) */}
        <div className="px-4 py-4 sm:px-5">
          <SkeletonText
            lines={lines}
            animation={animation}
            fontSize="sm"
            spacing="normal"
          />
        </div>

        {/* Footer area */}
        {showFooter && (
          <div className="flex items-center justify-end gap-3 border-t border-dark-700/50 px-4 py-3 sm:px-5">
            <Skeleton
              width={80}
              animation={animation}
              className="h-8"
              radius="lg"
            />
            <Skeleton
              width={80}
              animation={animation}
              className="h-8"
              radius="lg"
            />
          </div>
        )}
      </div>
    );
  },
);

SkeletonCard.displayName = 'SkeletonCard';

// ============================================
// SkeletonTable Component
// ============================================
// Pre-built table skeleton with header row and
// configurable data rows and columns. Matches
// the Table component styling.

export const SkeletonTable = forwardRef<HTMLDivElement, SkeletonTableProps>(
  (
    {
      rows = 5,
      columns = 4,
      showHeader = true,
      animation = 'pulse',
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden rounded-xl border border-dark-700/50 bg-dark-800',
          className,
        )}
        aria-hidden="true"
        role="presentation"
        {...props}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header row */}
            {showHeader && (
              <thead className="border-b border-dark-700/50 bg-dark-800/95">
                <tr>
                  {Array.from({ length: columns }).map((_, colIndex) => (
                    <th
                      key={`header-${colIndex}`}
                      className="px-4 py-3"
                    >
                      <Skeleton
                        width={`${50 + Math.random() * 30}%`}
                        animation={animation}
                        className="h-3"
                        radius="md"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
            )}

            {/* Data rows */}
            <tbody>
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <tr
                  key={`row-${rowIndex}`}
                  className="border-b border-dark-700/30 last:border-b-0"
                >
                  {Array.from({ length: columns }).map((_, colIndex) => (
                    <td
                      key={`cell-${rowIndex}-${colIndex}`}
                      className="px-4 py-3"
                    >
                      <Skeleton
                        width={`${40 + Math.random() * 40}%`}
                        animation={animation}
                        className="h-4"
                        radius="md"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  },
);

SkeletonTable.displayName = 'SkeletonTable';

// ============================================
// SkeletonAvatarWithText Component
// ============================================
// Pre-built skeleton combining a circle (avatar)
// with text lines beside it. Commonly used as a
// placeholder for user info rows in lists and tables.

export const SkeletonAvatarWithText = forwardRef<HTMLDivElement, SkeletonAvatarWithTextProps>(
  (
    {
      avatarSize = 40,
      lines = 2,
      animation = 'pulse',
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-3', className)}
        aria-hidden="true"
        role="presentation"
        {...props}
      >
        {/* Avatar circle */}
        <SkeletonCircle size={avatarSize} animation={animation} />

        {/* Text lines */}
        <div className="flex-1 space-y-2">
          <Skeleton
            width="40%"
            animation={animation}
            className="h-4"
            radius="md"
          />
          {lines > 1 && (
            <Skeleton
              width="25%"
              animation={animation}
              className="h-3"
              radius="md"
            />
          )}
          {lines > 2 && (
            <Skeleton
              width="55%"
              animation={animation}
              className="h-3"
              radius="md"
            />
          )}
        </div>
      </div>
    );
  },
);

SkeletonAvatarWithText.displayName = 'SkeletonAvatarWithText';

// ============================================
// SkeletonStatCard Component
// ============================================
// Pre-built skeleton for dashboard stat cards.
// Matches the StatCard component layout.

export interface SkeletonStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  animation?: SkeletonAnimation;
}

export const SkeletonStatCard = forwardRef<HTMLDivElement, SkeletonStatCardProps>(
  (
    {
      animation = 'pulse',
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-dark-700/50 bg-dark-800 p-4 sm:p-5',
          className,
        )}
        aria-hidden="true"
        role="presentation"
        {...props}
      >
        <div className="space-y-3">
          {/* Top row: label + icon */}
          <div className="flex items-center justify-between">
            <Skeleton
              width="45%"
              animation={animation}
              className="h-3.5"
              radius="md"
            />
            <Skeleton
              width={36}
              height={36}
              animation={animation}
              radius="lg"
            />
          </div>

          {/* Value */}
          <Skeleton
            width="55%"
            animation={animation}
            className="h-8"
            radius="md"
          />

          {/* Change indicator + description */}
          <div className="flex items-center gap-2">
            <Skeleton
              width={48}
              animation={animation}
              className="h-3.5"
              radius="md"
            />
            <Skeleton
              width="30%"
              animation={animation}
              className="h-3"
              radius="md"
            />
          </div>
        </div>
      </div>
    );
  },
);

SkeletonStatCard.displayName = 'SkeletonStatCard';

// ============================================
// SkeletonListItem Component
// ============================================
// Pre-built skeleton for list items with optional
// avatar, text, and trailing element.

export interface SkeletonListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show an avatar placeholder */
  showAvatar?: boolean;
  /** Number of text lines */
  lines?: number;
  /** Whether to show a trailing element */
  showTrailing?: boolean;
  /** Animation type */
  animation?: SkeletonAnimation;
}

export const SkeletonListItem = forwardRef<HTMLDivElement, SkeletonListItemProps>(
  (
    {
      showAvatar = true,
      lines = 2,
      showTrailing = false,
      animation = 'pulse',
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3 px-4 py-3',
          'border-b border-dark-700/30 last:border-b-0',
          className,
        )}
        aria-hidden="true"
        role="presentation"
        {...props}
      >
        {/* Avatar */}
        {showAvatar && (
          <SkeletonCircle size={36} animation={animation} />
        )}

        {/* Text */}
        <div className="flex-1 space-y-1.5">
          <Skeleton
            width={`${35 + Math.random() * 25}%`}
            animation={animation}
            className="h-3.5"
            radius="md"
          />
          {lines > 1 && (
            <Skeleton
              width={`${25 + Math.random() * 20}%`}
              animation={animation}
              className="h-3"
              radius="md"
            />
          )}
        </div>

        {/* Trailing element */}
        {showTrailing && (
          <Skeleton
            width={60}
            animation={animation}
            className="h-6 flex-shrink-0"
            radius="full"
          />
        )}
      </div>
    );
  },
);

SkeletonListItem.displayName = 'SkeletonListItem';

// ============================================
// SkeletonGroup Component
// ============================================
// A simple wrapper that applies consistent spacing
// and animation to a group of skeleton elements.

export interface SkeletonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Gap between skeleton elements */
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  /** Direction of the skeleton group */
  direction?: 'row' | 'column';
  /** Number of repeated items (renders children N times) */
  count?: number;
}

const groupGapStyles: Record<string, string> = {
  xs: 'gap-1.5',
  sm: 'gap-2.5',
  md: 'gap-4',
  lg: 'gap-6',
};

export const SkeletonGroup = forwardRef<HTMLDivElement, SkeletonGroupProps>(
  (
    {
      gap = 'md',
      direction = 'column',
      count,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    // If count is specified, repeat children N times
    const content = count
      ? Array.from({ length: count }).map((_, index) => (
          <React.Fragment key={index}>{children}</React.Fragment>
        ))
      : children;

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          direction === 'column' ? 'flex-col' : 'flex-row flex-wrap',
          groupGapStyles[gap],
          className,
        )}
        aria-hidden="true"
        role="presentation"
        {...props}
      >
        {content}
      </div>
    );
  },
);

SkeletonGroup.displayName = 'SkeletonGroup';

// ============================================
// Exports
// ============================================

export default Skeleton;
