// ============================================
// Avatar UI Component
// ============================================
// A versatile avatar component with:
//   - Image display with fallback to initials
//   - Multiple sizes (xs, sm, md, lg, xl, 2xl)
//   - Circular and rounded shapes
//   - Online/offline/busy/away status indicator dot
//   - Color generation from name string
//   - AvatarGroup for stacked display
//   - Clickable variant
//   - Dark theme compatible

import React, { forwardRef, useState, useMemo } from 'react';
import { cn } from '@/utils/cn';

// ============================================
// Types
// ============================================

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarShape = 'circle' | 'rounded';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away' | 'none';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image source URL */
  src?: string | null;
  /** Alt text for the image */
  alt?: string;
  /** Name used to generate initials and background color */
  name?: string;
  /** Custom initials to display (overrides name-derived initials) */
  initials?: string;
  /** Size of the avatar */
  size?: AvatarSize;
  /** Shape of the avatar */
  shape?: AvatarShape;
  /** Status indicator dot */
  status?: AvatarStatus;
  /** Whether the avatar is clickable */
  clickable?: boolean;
  /** Custom background color class (overrides name-derived color) */
  bgColor?: string;
  /** Custom text color class */
  textColor?: string;
  /** Whether to show a border ring */
  bordered?: boolean;
  /** Border color class */
  borderColor?: string;
  /** Custom fallback icon (rendered when no image and no name) */
  fallbackIcon?: React.ReactNode;
}

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum number of avatars to display before showing a "+N" indicator */
  max?: number;
  /** Size applied to all avatars in the group */
  size?: AvatarSize;
  /** Children (Avatar components) */
  children: React.ReactNode;
  /** Spacing overlap between avatars */
  spacing?: 'tight' | 'normal' | 'loose';
}

// ============================================
// Style Maps
// ============================================

const sizeStyles: Record<AvatarSize, {
  container: string;
  text: string;
  statusDot: string;
  statusOffset: string;
  icon: string;
}> = {
  xs: {
    container: 'h-6 w-6',
    text: 'text-2xs font-semibold',
    statusDot: 'h-1.5 w-1.5',
    statusOffset: '-bottom-0 -right-0',
    icon: 'h-3 w-3',
  },
  sm: {
    container: 'h-8 w-8',
    text: 'text-xs font-semibold',
    statusDot: 'h-2 w-2',
    statusOffset: '-bottom-0 -right-0',
    icon: 'h-4 w-4',
  },
  md: {
    container: 'h-10 w-10',
    text: 'text-sm font-semibold',
    statusDot: 'h-2.5 w-2.5',
    statusOffset: '-bottom-0.5 -right-0.5',
    icon: 'h-5 w-5',
  },
  lg: {
    container: 'h-12 w-12',
    text: 'text-base font-semibold',
    statusDot: 'h-3 w-3',
    statusOffset: '-bottom-0.5 -right-0.5',
    icon: 'h-6 w-6',
  },
  xl: {
    container: 'h-16 w-16',
    text: 'text-lg font-bold',
    statusDot: 'h-3.5 w-3.5',
    statusOffset: '-bottom-0.5 -right-0.5',
    icon: 'h-7 w-7',
  },
  '2xl': {
    container: 'h-20 w-20',
    text: 'text-xl font-bold',
    statusDot: 'h-4 w-4',
    statusOffset: '-bottom-0.5 -right-0.5',
    icon: 'h-8 w-8',
  },
};

const shapeStyles: Record<AvatarShape, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-xl',
};

const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-success-500',
  offline: 'bg-dark-500',
  busy: 'bg-danger-500',
  away: 'bg-warning-500',
  none: '',
};

const spacingStyles: Record<string, string> = {
  tight: '-space-x-3',
  normal: '-space-x-2',
  loose: '-space-x-1',
};

// ============================================
// Color Generation from Name
// ============================================
// Generates a consistent background color based on a name string.
// The same name will always produce the same color.

const AVATAR_COLORS = [
  'bg-primary-600',
  'bg-accent-600',
  'bg-success-600',
  'bg-danger-600',
  'bg-warning-600',
  'bg-info-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-lime-600',
  'bg-sky-600',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Extract initials from a name string.
 * - "John Doe" → "JD"
 * - "john.doe@email.com" → "J"
 * - "Alice" → "A"
 * - "" → "?"
 */
function getInitialsFromName(name: string): string {
  if (!name || name.trim().length === 0) return '?';

  const trimmed = name.trim();

  // If it looks like an email, use first character
  if (trimmed.includes('@')) {
    return trimmed.charAt(0).toUpperCase();
  }

  const parts = trimmed.split(/[\s._-]+/).filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  // Use first and last name initials
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
}

// ============================================
// Default Fallback Icon
// ============================================

function DefaultUserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}

// ============================================
// Avatar Component
// ============================================

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name,
      initials: customInitials,
      size = 'md',
      shape = 'circle',
      status = 'none',
      clickable = false,
      bgColor,
      textColor = 'text-white',
      bordered = false,
      borderColor = 'ring-dark-800',
      fallbackIcon,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [imageError, setImageError] = useState(false);

    const styles = sizeStyles[size];

    // Determine what to display
    const hasImage = !!src && !imageError;
    const displayInitials = customInitials || (name ? getInitialsFromName(name) : null);
    const colorClass = bgColor || (name ? getColorFromName(name) : 'bg-dark-600');

    // Memoize to avoid recalculating on every render
    const derivedColor = useMemo(() => colorClass, [colorClass]);

    const handleImageError = () => {
      setImageError(true);
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base layout
          'relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden',
          // Size
          styles.container,
          // Shape
          shapeStyles[shape],
          // Background (only when not showing an image)
          !hasImage && derivedColor,
          // Text color for initials
          !hasImage && textColor,
          // Border ring
          bordered && `ring-2 ${borderColor}`,
          // Clickable
          clickable && 'cursor-pointer transition-opacity hover:opacity-80 active:opacity-70',
          // Focus
          clickable && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-900',
          className,
        )}
        onClick={onClick}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        title={alt || name}
        {...props}
      >
        {/* Image */}
        {hasImage && (
          <img
            src={src!}
            alt={alt || name || 'Avatar'}
            onError={handleImageError}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}

        {/* Initials fallback */}
        {!hasImage && displayInitials && (
          <span className={cn('select-none leading-none', styles.text)}>
            {displayInitials}
          </span>
        )}

        {/* Icon fallback (no image and no name) */}
        {!hasImage && !displayInitials && (
          <span className={cn('text-dark-400', styles.icon)}>
            {fallbackIcon || <DefaultUserIcon className="h-full w-full" />}
          </span>
        )}

        {/* Status indicator dot */}
        {status !== 'none' && (
          <span
            className={cn(
              'absolute box-content border-2',
              shape === 'circle' ? 'rounded-full border-dark-800' : 'rounded-full border-dark-800',
              styles.statusDot,
              styles.statusOffset,
              statusColors[status],
            )}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    );
  },
);

Avatar.displayName = 'Avatar';

// ============================================
// AvatarGroup Component
// ============================================
// Renders a group of avatars in an overlapping stack.
// When the number of avatars exceeds `max`, a "+N" indicator
// is shown at the end.
//
// Usage:
// ```tsx
// <AvatarGroup max={3} size="sm">
//   <Avatar name="Alice" src="/alice.jpg" />
//   <Avatar name="Bob" />
//   <Avatar name="Charlie" />
//   <Avatar name="Diana" />
//   <Avatar name="Eve" />
// </AvatarGroup>
// ```

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    {
      max = 5,
      size = 'md',
      spacing = 'normal',
      children,
      className,
      ...props
    },
    ref,
  ) => {
    const childArray = React.Children.toArray(children);
    const totalCount = childArray.length;
    const visibleCount = Math.min(totalCount, max);
    const overflowCount = totalCount - visibleCount;
    const styles = sizeStyles[size];

    // Take only the visible children
    const visibleChildren = childArray.slice(0, visibleCount);

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center',
          spacingStyles[spacing],
          className,
        )}
        role="group"
        aria-label={`${totalCount} avatars`}
        {...props}
      >
        {/* Render visible avatars with border ring for overlap clarity */}
        {visibleChildren.map((child, index) => {
          if (!React.isValidElement(child)) return null;

          // Clone each avatar to ensure consistent size and add border
          return React.cloneElement(child as React.ReactElement<AvatarProps>, {
            key: index,
            size,
            bordered: true,
            borderColor: 'ring-dark-800',
            style: {
              zIndex: visibleCount - index,
              ...(child as React.ReactElement<AvatarProps>).props.style,
            },
          });
        })}

        {/* Overflow indicator (+N more) */}
        {overflowCount > 0 && (
          <div
            className={cn(
              'relative inline-flex flex-shrink-0 items-center justify-center',
              'bg-dark-600 ring-2 ring-dark-800',
              'rounded-full',
              styles.container,
            )}
            style={{ zIndex: 0 }}
            title={`${overflowCount} more`}
          >
            <span
              className={cn(
                'select-none leading-none text-dark-200',
                size === 'xs' || size === 'sm' ? 'text-2xs font-semibold' : 'text-xs font-semibold',
              )}
            >
              +{overflowCount}
            </span>
          </div>
        )}
      </div>
    );
  },
);

AvatarGroup.displayName = 'AvatarGroup';

// ============================================
// AvatarWithInfo Component
// ============================================
// A composite component that pairs an avatar with
// name and subtitle text. Commonly used in employee
// lists, tables, and cards.

export interface AvatarWithInfoProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Image source URL */
  src?: string | null;
  /** Name displayed next to the avatar */
  name: string;
  /** Subtitle / secondary text (e.g., role, designation, email) */
  subtitle?: string;
  /** Avatar size */
  size?: AvatarSize;
  /** Status indicator */
  status?: AvatarStatus;
  /** Whether the component is clickable */
  clickable?: boolean;
  /** Whether to truncate the name and subtitle text */
  truncate?: boolean;
  /** Custom initials override */
  initials?: string;
  /** Extra content rendered to the right of the text */
  extra?: React.ReactNode;
  /** Reverse layout: text on the left, avatar on the right */
  reverse?: boolean;
}

const infoTextSizes: Record<AvatarSize, { name: string; subtitle: string }> = {
  xs: { name: 'text-xs', subtitle: 'text-2xs' },
  sm: { name: 'text-sm', subtitle: 'text-xs' },
  md: { name: 'text-sm', subtitle: 'text-xs' },
  lg: { name: 'text-base', subtitle: 'text-sm' },
  xl: { name: 'text-lg', subtitle: 'text-sm' },
  '2xl': { name: 'text-xl', subtitle: 'text-base' },
};

export const AvatarWithInfo = forwardRef<HTMLDivElement, AvatarWithInfoProps>(
  (
    {
      src,
      name,
      subtitle,
      size = 'md',
      status = 'none',
      clickable = false,
      truncate = true,
      initials,
      extra,
      reverse = false,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const textSizes = infoTextSizes[size];

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-3',
          reverse && 'flex-row-reverse',
          clickable && 'cursor-pointer',
          className,
        )}
        onClick={onClick}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        {...props}
      >
        {/* Avatar */}
        <Avatar
          src={src}
          name={name}
          initials={initials}
          size={size}
          status={status}
        />

        {/* Text content */}
        <div className={cn('flex flex-col', truncate && 'min-w-0')}>
          <p
            className={cn(
              'font-medium text-white leading-tight',
              textSizes.name,
              truncate && 'truncate',
            )}
          >
            {name}
          </p>
          {subtitle && (
            <p
              className={cn(
                'text-dark-400 leading-tight mt-0.5',
                textSizes.subtitle,
                truncate && 'truncate',
              )}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Extra content */}
        {extra && (
          <div className="flex-shrink-0 ml-auto">
            {extra}
          </div>
        )}
      </div>
    );
  },
);

AvatarWithInfo.displayName = 'AvatarWithInfo';

// ============================================
// Exports
// ============================================

export default Avatar;
