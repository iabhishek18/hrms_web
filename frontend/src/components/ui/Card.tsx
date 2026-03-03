// ============================================
// Card UI Component
// ============================================
// A versatile card component with composable sub-components:
//   - Card (wrapper)
//   - CardHeader (top section with title, subtitle, actions)
//   - CardBody (main content area)
//   - CardFooter (bottom section, typically for actions)
//   - StatCard (specialized card for dashboard statistics)
//
// Features:
//   - Dark theme compatible with dark-800/dark-900 backgrounds
//   - Hover effects with subtle elevation change
//   - Clickable variant with cursor pointer
//   - Multiple padding sizes
//   - Border and shadow customization
//   - Gradient accent variant
//   - Loading skeleton state
//   - Fully composable — use any combination of sub-components

import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

// ============================================
// Types
// ============================================

export type CardVariant = 'default' | 'bordered' | 'ghost' | 'gradient';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual style variant */
  variant?: CardVariant;
  /** Whether the card has a hover effect */
  hoverable?: boolean;
  /** Whether the card is clickable (adds cursor-pointer and active state) */
  clickable?: boolean;
  /** Whether the card is in a selected/active state */
  isSelected?: boolean;
  /** Whether the card is in a loading state (shows skeleton overlay) */
  isLoading?: boolean;
  /** Padding size for the card content (applies to CardBody if used standalone) */
  padding?: CardPadding;
  /** Additional gradient colors for the gradient variant */
  gradientFrom?: string;
  gradientTo?: string;
  /** Remove all default styling */
  unstyled?: boolean;
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Title text */
  title?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Action elements rendered on the right side of the header */
  action?: React.ReactNode;
  /** Whether to show a bottom border */
  bordered?: boolean;
  /** Padding size */
  padding?: CardPadding;
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Padding size */
  padding?: CardPadding;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to show a top border */
  bordered?: boolean;
  /** Padding size */
  padding?: CardPadding;
  /** Horizontal alignment of footer content */
  align?: 'left' | 'center' | 'right' | 'between';
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The stat label / title */
  label: string;
  /** The stat value (number or formatted string) */
  value: string | number;
  /** Change indicator value (e.g., "+12%", "-3.5%") */
  change?: string;
  /** Whether the change is positive (green) or negative (red) */
  changeType?: 'positive' | 'negative' | 'neutral';
  /** Icon element displayed in the top-right corner */
  icon?: React.ReactNode;
  /** Background color class for the icon container */
  iconBg?: string;
  /** Icon color class */
  iconColor?: string;
  /** Description text below the value */
  description?: string;
  /** Whether the card has a hover effect */
  hoverable?: boolean;
  /** Whether the card is clickable */
  clickable?: boolean;
  /** Whether the card is loading */
  isLoading?: boolean;
}

// ============================================
// Style Maps
// ============================================

const variantStyles: Record<CardVariant, string> = {
  default: cn(
    'bg-dark-800 border border-dark-700/50',
    'shadow-card-dark',
  ),
  bordered: cn(
    'bg-dark-800/50 border border-dark-600',
  ),
  ghost: cn(
    'bg-transparent',
  ),
  gradient: cn(
    'border border-dark-700/30',
    'shadow-card-dark',
  ),
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

const headerPaddingStyles: Record<CardPadding, string> = {
  none: 'px-0 py-0',
  sm: 'px-3 py-2.5',
  md: 'px-4 py-3.5 sm:px-5',
  lg: 'px-5 py-4 sm:px-6',
};

const bodyPaddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'px-3 py-3',
  md: 'px-4 py-4 sm:px-5',
  lg: 'px-5 py-5 sm:px-6',
};

const footerPaddingStyles: Record<CardPadding, string> = {
  none: 'px-0 py-0',
  sm: 'px-3 py-2.5',
  md: 'px-4 py-3 sm:px-5',
  lg: 'px-5 py-4 sm:px-6',
};

const footerAlignStyles: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
};

// ============================================
// Card Component
// ============================================

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      variant = 'default',
      hoverable = false,
      clickable = false,
      isSelected = false,
      isLoading = false,
      padding,
      gradientFrom,
      gradientTo,
      unstyled = false,
      style,
      onClick,
      ...props
    },
    ref,
  ) => {
    const gradientStyle =
      variant === 'gradient' && (gradientFrom || gradientTo)
        ? {
            background: `linear-gradient(135deg, ${gradientFrom || '#1e293b'}, ${gradientTo || '#0f172a'})`,
            ...style,
          }
        : style;

    if (unstyled) {
      return (
        <div ref={ref} className={className} style={style} onClick={onClick} {...props}>
          {children}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative overflow-hidden rounded-xl transition-all duration-200',
          // Variant styles
          variantStyles[variant],
          // Gradient fallback (if no custom colors provided)
          variant === 'gradient' &&
            !gradientFrom &&
            'bg-gradient-to-br from-dark-800 to-dark-900',
          // Hover effect
          hoverable && 'hover:shadow-card-dark-hover hover:border-dark-600/50',
          // Clickable
          clickable && 'cursor-pointer active:scale-[0.99]',
          (hoverable || clickable) && 'hover:-translate-y-0.5',
          // Selected state
          isSelected && 'ring-2 ring-primary-500/50 border-primary-500/30',
          // If padding is passed directly to Card (used without sub-components)
          padding && paddingStyles[padding],
          className,
        )}
        style={gradientStyle}
        onClick={onClick}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        {...props}
      >
        {children}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-dark-800/80 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-2">
              <div className="relative h-6 w-6">
                <div className="absolute inset-0 rounded-full border-2 border-dark-600" />
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary-500" />
              </div>
              <span className="text-2xs text-dark-400">Loading…</span>
            </div>
          </div>
        )}
      </div>
    );
  },
);

Card.displayName = 'Card';

// ============================================
// CardHeader Component
// ============================================

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  (
    {
      children,
      className,
      title,
      subtitle,
      action,
      bordered = false,
      padding = 'md',
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          headerPaddingStyles[padding],
          bordered && 'border-b border-dark-700/50',
          className,
        )}
        {...props}
      >
        {/* If title/subtitle/action are provided, render the standard layout */}
        {(title || subtitle || action) ? (
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-base font-semibold text-white truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-0.5 text-sm text-dark-400 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            {action && (
              <div className="flex-shrink-0">{action}</div>
            )}
          </div>
        ) : (
          // Otherwise render children directly for full customization
          children
        )}
      </div>
    );
  },
);

CardHeader.displayName = 'CardHeader';

// ============================================
// CardBody Component
// ============================================

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  (
    {
      children,
      className,
      padding = 'md',
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(bodyPaddingStyles[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardBody.displayName = 'CardBody';

// ============================================
// CardFooter Component
// ============================================

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  (
    {
      children,
      className,
      bordered = true,
      padding = 'md',
      align = 'right',
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3',
          footerPaddingStyles[padding],
          footerAlignStyles[align],
          bordered && 'border-t border-dark-700/50',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardFooter.displayName = 'CardFooter';

// ============================================
// StatCard Component
// ============================================
// Specialized card component for dashboard statistics.
// Displays a label, large value, optional change indicator,
// icon, and description in a compact format.

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      label,
      value,
      change,
      changeType = 'neutral',
      icon,
      iconBg = 'bg-primary-500/10',
      iconColor = 'text-primary-400',
      description,
      hoverable = true,
      clickable = false,
      isLoading = false,
      className,
      ...props
    },
    ref,
  ) => {
    const changeColor =
      changeType === 'positive'
        ? 'text-success-400'
        : changeType === 'negative'
          ? 'text-danger-400'
          : 'text-dark-400';

    const changeArrow =
      changeType === 'positive'
        ? '↑'
        : changeType === 'negative'
          ? '↓'
          : '';

    if (isLoading) {
      return (
        <Card
          ref={ref}
          padding="md"
          hoverable={hoverable}
          className={className}
          {...props}
        >
          <div className="animate-pulse space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-dark-700" />
              <div className="h-9 w-9 rounded-lg bg-dark-700" />
            </div>
            <div className="h-8 w-28 rounded bg-dark-700" />
            <div className="h-3 w-32 rounded bg-dark-700" />
          </div>
        </Card>
      );
    }

    return (
      <Card
        ref={ref}
        padding="md"
        hoverable={hoverable}
        clickable={clickable}
        className={className}
        {...props}
      >
        {/* Top row: label + icon */}
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-dark-400">{label}</p>
          {icon && (
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                iconBg,
              )}
            >
              <span className={cn('h-5 w-5', iconColor)}>{icon}</span>
            </div>
          )}
        </div>

        {/* Value */}
        <p className="mt-2 text-2xl font-bold text-white tabular-nums">
          {value}
        </p>

        {/* Bottom row: change + description */}
        <div className="mt-1.5 flex items-center gap-2">
          {change && (
            <span className={cn('text-xs font-semibold tabular-nums', changeColor)}>
              {changeArrow} {change}
            </span>
          )}
          {description && (
            <span className="text-xs text-dark-500">{description}</span>
          )}
        </div>
      </Card>
    );
  },
);

StatCard.displayName = 'StatCard';

// ============================================
// Exports
// ============================================

export default Card;
