// ============================================
// UI Components — Barrel Export
// ============================================
// Re-exports all reusable UI components from a single
// entry point for clean and convenient imports:
//
//   import { Button, Input, Card, Modal, Badge, Table } from '@/components/ui';
//
// This index file acts as the public API for the UI
// component library. All components are co-located in
// this directory and exported from here.

// ---- Button ----
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// ---- Input, Textarea, Select, Checkbox, Toggle ----
export { Input, Textarea, Select, Checkbox, Toggle } from './Input';
export type {
  InputProps,
  TextareaProps,
  SelectProps,
  SelectOption,
  CheckboxProps,
  ToggleProps,
  InputSize,
} from './Input';

// ---- Card, CardHeader, CardBody, CardFooter, StatCard ----
export { Card, CardHeader, CardBody, CardFooter, StatCard } from './Card';
export type {
  CardProps,
  CardHeaderProps,
  CardBodyProps,
  CardFooterProps,
  StatCardProps,
  CardVariant,
  CardPadding,
} from './Card';

// ---- Modal, ModalHeader, ModalBody, ModalFooter, ConfirmModal ----
export {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ConfirmModal,
} from './Modal';
export type {
  ModalProps,
  ModalHeaderProps,
  ModalBodyProps,
  ModalFooterProps,
  ConfirmModalProps,
  ModalSize,
} from './Modal';

// ---- Badge, StatusBadge, specialized badges, BadgeGroup, NotificationDot ----
export {
  Badge,
  StatusBadge,
  EmployeeStatusBadge,
  LeaveStatusBadge,
  AttendanceStatusBadge,
  RoleBadge,
  LeaveTypeBadge,
  BadgeGroup,
  NotificationDot,
} from './Badge';
export type {
  BadgeProps,
  StatusBadgeProps,
  EmployeeStatusBadgeProps,
  LeaveStatusBadgeProps,
  AttendanceStatusBadgeProps,
  RoleBadgeProps,
  LeaveTypeBadgeProps,
  BadgeGroupProps,
  NotificationDotProps,
  BadgeVariant,
  BadgeSize,
  BadgeShape,
  BadgeStyle,
} from './Badge';

// ---- Table, Pagination, TableSearchBar ----
export { Table, Pagination, TableSearchBar } from './Table';
export type {
  TableProps,
  TableColumn,
  TableRowAction,
  PaginationProps,
  TableSearchBarProps,
  SortDirection,
  TableDensity,
} from './Table';

// ---- Avatar, AvatarGroup, AvatarWithInfo ----
export { Avatar, AvatarGroup, AvatarWithInfo } from './Avatar';
export type {
  AvatarProps,
  AvatarGroupProps,
  AvatarWithInfoProps,
  AvatarSize,
  AvatarShape,
  AvatarStatus,
} from './Avatar';

// ---- Skeleton and presets ----
export {
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  SkeletonCard,
  SkeletonTable,
  SkeletonAvatarWithText,
  SkeletonStatCard,
  SkeletonListItem,
  SkeletonGroup,
} from './Skeleton';
export type {
  SkeletonProps,
  SkeletonTextProps,
  SkeletonCircleProps,
  SkeletonCardProps,
  SkeletonTableProps,
  SkeletonAvatarWithTextProps,
  SkeletonStatCardProps,
  SkeletonListItemProps,
  SkeletonGroupProps,
  SkeletonAnimation,
} from './Skeleton';

// ---- Tabs and composable sub-components ----
export {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from './Tabs';
export type {
  TabsProps,
  TabListProps,
  TabProps,
  TabPanelsProps,
  TabPanelProps,
  TabItem,
  TabVariant,
  TabSize,
  TabOrientation,
} from './Tabs';
