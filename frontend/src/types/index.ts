// ============================================
// HRMS Frontend — TypeScript Type Definitions
// ============================================
// Centralized type definitions used across the entire frontend.
// Organized by domain: Auth, Employee, Department, Leave,
// Attendance, Dashboard, Settings, and UI.

// ============================================
// Common / Shared Types
// ============================================

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

/** Pagination metadata returned with list endpoints */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Standard API error response */
export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: ValidationError[];
  stack?: string;
}

/** Field-level validation error */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/** Pagination query params sent to the API */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/** Generic ID parameter */
export interface IdParam {
  id: string;
}

/** Select option for dropdowns */
export interface SelectOption<T = string> {
  label: string;
  value: T;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
}

/** Key-value pair */
export interface KeyValue<V = string> {
  key: string;
  value: V;
}

// ============================================
// Enums (mirror backend Prisma enums)
// ============================================

export type Role = 'ADMIN' | 'HR' | 'EMPLOYEE';

export type EmployeeStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ON_LEAVE'
  | 'TERMINATED'
  | 'PROBATION';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';

export type LeaveType =
  | 'CASUAL'
  | 'SICK'
  | 'EARNED'
  | 'MATERNITY'
  | 'PATERNITY'
  | 'UNPAID'
  | 'COMPENSATORY';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'WEEKEND';

export type EmploymentType = 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern';

export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================
// Authentication Types
// ============================================

/** Stored JWT tokens */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Login request payload */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Registration request payload */
export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role?: Role;
}

/** Change password request payload */
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/** Auth API login/register response */
export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

/** Authenticated user object */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  isActive?: boolean;
  lastLogin?: string | null;
  createdAt?: string;
  employee?: UserEmployee | null;
}

/** Minimal employee info attached to the auth user */
export interface UserEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  designation: string;
  department: {
    id: string;
    name: string;
    code?: string;
  } | null;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    designation?: string;
  } | null;
  leaveBalances?: LeaveBalance[];
}

// ============================================
// Employee Types
// ============================================

/** Full employee record */
export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  maritalStatus: MaritalStatus | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  avatar: string | null;

  // Employment
  designation: string;
  status: EmployeeStatus;
  joiningDate: string;
  confirmationDate: string | null;
  terminationDate: string | null;
  salary: number | string | null;
  employmentType: EmploymentType | string | null;

  // Emergency contact
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;

  // Bank
  bankName: string | null;
  bankAccountNo: string | null;
  bankIfscCode: string | null;

  // Relations
  departmentId: string | null;
  department: Pick<Department, 'id' | 'name' | 'code'> | null;
  managerId: string | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    designation?: string;
    avatar?: string | null;
  } | null;
  user: {
    id: string;
    email: string;
    role: Role;
    isActive: boolean;
    lastLogin?: string | null;
  } | null;

  // Counts
  _count?: {
    subordinates: number;
    leaveRequests: number;
  };

  createdAt: string;
  updatedAt: string;
}

/** Minimal employee info for list views */
export interface EmployeeListItem {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  designation: string;
  status: EmployeeStatus;
  joiningDate: string;
  avatar: string | null;
  employmentType: string | null;
  salary: number | string | null;
  gender: Gender | null;
  department: Pick<Department, 'id' | 'name' | 'code'> | null;
  manager: { id: string; firstName: string; lastName: string } | null;
  user: { id: string; email: string; role: Role; isActive: boolean } | null;
  createdAt: string;
  updatedAt: string;
}

/** Create employee request payload */
export interface CreateEmployeeData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  maritalStatus?: MaritalStatus | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  designation: string;
  departmentId?: string | null;
  managerId?: string | null;
  status?: EmployeeStatus;
  joiningDate: string;
  confirmationDate?: string | null;
  salary?: number | null;
  employmentType?: EmploymentType;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankIfscCode?: string | null;
  createUserAccount?: boolean;
  password?: string;
  role?: Role;
}

/** Update employee (all fields optional) */
export type UpdateEmployeeData = Partial<
  Omit<CreateEmployeeData, 'createUserAccount' | 'password' | 'role'>
>;

/** Employee list filter / query parameters */
export interface EmployeeFilters extends PaginationParams {
  departmentId?: string;
  status?: EmployeeStatus;
  employmentType?: EmploymentType | string;
  gender?: Gender;
}

/** Employee quick search result (autocomplete) */
export interface EmployeeSearchResult {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  avatar: string | null;
  department: { name: string } | null;
}

/** Employee stats summary (dashboard) */
export interface EmployeeStatsSummary {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  probation: number;
  newThisMonth: number;
  byDepartment: { department: string; count: number }[];
  byGender: { gender: string; count: number }[];
  byEmploymentType: { type: string; count: number }[];
}

// ============================================
// Department Types
// ============================================

/** Full department record */
export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  headId: string | null;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Create department payload */
export interface CreateDepartmentData {
  name: string;
  code: string;
  description?: string | null;
  headId?: string | null;
  isActive?: boolean;
}

/** Update department (all fields optional) */
export type UpdateDepartmentData = Partial<CreateDepartmentData>;

// ============================================
// Leave Types
// ============================================

/** Full leave request record */
export interface LeaveRequest {
  id: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  remarks: string | null;
  appliedOn: string;
  approvedOn: string | null;
  approvedBy: string | null;
  employeeId: string;
  employee: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email?: string;
    designation: string;
    avatar?: string | null;
    department: { id: string; name: string } | null;
  };
  createdAt: string;
  updatedAt: string;
}

/** Apply leave request payload */
export interface ApplyLeaveData {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

/** Leave status update payload */
export interface UpdateLeaveStatusData {
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED';
  remarks?: string | null;
}

/** Leave balance for one type/year */
export interface LeaveBalance {
  leaveType: LeaveType;
  totalLeaves: number;
  usedLeaves: number;
  remainingLeaves?: number;
  year: number;
}

/** Leave filter params */
export interface LeaveFilters extends PaginationParams {
  employeeId?: string;
  leaveType?: LeaveType;
  status?: LeaveStatus;
  startDate?: string;
  endDate?: string;
}

/** Leave statistics (dashboard) */
export interface LeaveStats {
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  };
  byType: {
    leaveType: LeaveType;
    count: number;
    totalDays: number;
  }[];
  recentRequests: LeaveRequest[];
  onLeaveToday: LeaveRequest[];
  onLeaveTodayCount: number;
}

// ============================================
// Attendance Types
// ============================================

/** Full attendance record */
export interface AttendanceRecord {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  status: AttendanceStatus;
  notes: string | null;
  ipAddress: string | null;
  location: string | null;
  employeeId: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    avatar?: string | null;
    designation?: string;
    department?: { id: string; name: string } | null;
  };
  createdAt: string;
  updatedAt: string;
}

/** Clock in payload */
export interface ClockInData {
  notes?: string | null;
  location?: string | null;
}

/** Clock out payload */
export interface ClockOutData {
  notes?: string | null;
}

/** Manual attendance entry payload */
export interface ManualAttendanceData {
  employeeId: string;
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  status: AttendanceStatus;
  notes?: string | null;
}

/** Today's attendance status for current user */
export interface TodayAttendanceStatus {
  hasClockedIn: boolean;
  hasClockedOut: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalHours: number | null;
  status: AttendanceStatus | 'UNMARKED';
}

/** Attendance filter params */
export interface AttendanceFilters extends PaginationParams {
  employeeId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
}

/** Attendance summary stats */
export interface AttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
  weekend: number;
  attendanceRate: number;
  averageHoursWorked: number;
}

/** Department attendance summary (today) */
export interface DepartmentAttendanceSummary {
  departmentId: string;
  departmentName: string;
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  attendanceRate: number;
}

/** Overall organization attendance summary (today) */
export interface OverallAttendanceSummary {
  totalEmployees: number;
  totalMarked: number;
  unmarked: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
  attendanceRate: number;
}

// ============================================
// Dashboard Types
// ============================================

/** Main dashboard stats (summary cards) */
export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  onLeaveEmployees: number;
  newHiresThisMonth: number;
  pendingLeaveRequests: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  attendanceRate: number;
  departments: number;
}

/** Department breakdown for pie/donut chart */
export interface DepartmentBreakdown {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  employeeCount: number;
  activeCount: number;
  percentage: number;
  color: string;
}

/** Attendance summary for dashboard */
export interface DashboardAttendanceSummary {
  totalWorkingDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  onLeaveCount: number;
  holidayCount: number;
  unmarkedCount: number;
  attendanceRate: number;
  onTimeRate: number;
  lateRate: number;
  absentRate: number;
}

/** Top performer entry */
export interface TopPerformer {
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  avatar: string | null;
  rating: number;
  reviewPeriod: string;
}

/** Top absentee entry */
export interface TopAbsentee {
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  avatar: string | null;
  absentDays: number;
  totalDays: number;
  absentPercentage: number;
}

/** Monthly attendance chart data point */
export interface MonthlyAttendanceChart {
  month: string;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
}

/** Leave type distribution for pie chart */
export interface LeaveTypeDistribution {
  leaveType: string;
  count: number;
  percentage: number;
  color: string;
}

/** Recent activity item */
export interface RecentActivity {
  id: string;
  type: 'leave' | 'attendance' | 'employee' | 'announcement';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
}

/** Full dashboard data payload */
export interface DashboardData {
  stats: DashboardStats;
  departmentBreakdown: DepartmentBreakdown[];
  attendanceSummary: DashboardAttendanceSummary;
  topPerformers: TopPerformer[];
  topAbsentees: TopAbsentee[];
  charts: {
    monthlyAttendance: MonthlyAttendanceChart[];
    leaveDistribution: LeaveTypeDistribution[];
  };
  recentActivity: RecentActivity[];
}

// ============================================
// Settings Types
// ============================================

/** System setting record */
export interface Setting {
  id: string;
  key: string;
  value: string;
  group: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Settings update payload */
export interface UpdateSettingData {
  key: string;
  value: string;
  group?: string;
  description?: string | null;
}

/** Grouped settings for UI */
export interface GroupedSettings {
  settings: Setting[];
  grouped: Record<string, Record<string, string>>;
}

// ============================================
// Holiday Types
// ============================================

/** Holiday record */
export interface Holiday {
  id: string;
  name: string;
  date: string;
  description: string | null;
  isOptional: boolean;
  year: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Announcement Types
// ============================================

/** Announcement record */
export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  isActive: boolean;
  publishedBy: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Performance Review Types
// ============================================

/** Performance review record */
export interface PerformanceReview {
  id: string;
  reviewPeriod: string;
  rating: number;
  strengths: string | null;
  areasToImprove: string | null;
  goals: string | null;
  comments: string | null;
  reviewedBy: string | null;
  employeeId: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ============================================
// UI / Component Types
// ============================================

/** Sidebar navigation item */
export interface SidebarNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  children?: SidebarNavItem[];
  roles?: Role[];
  disabled?: boolean;
}

/** Breadcrumb item */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Table column definition */
export interface TableColumn<T = unknown> {
  key: string;
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

/** Tab item for tab navigation */
export interface TabItem {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number;
  disabled?: boolean;
  content?: React.ReactNode;
}

/** Stat card data for dashboard */
export interface StatCardData {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBgColor?: string;
  href?: string;
  loading?: boolean;
}

/** Toast / notification data */
export interface ToastData {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/** Modal configuration */
export interface ModalConfig {
  isOpen: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
}

/** Confirmation dialog data */
export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

/** Theme mode */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Color variant for badges, buttons, etc. */
export type ColorVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'default';

/** Size variant for components */
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// ============================================
// Form Types
// ============================================

/** Generic form field error state */
export interface FormFieldError {
  message: string;
  type?: string;
}

/** Form submission status */
export type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

// ============================================
// Redux Slice State Types
// ============================================

/** Base async state for Redux slices */
export interface AsyncState {
  isLoading: boolean;
  error: string | null;
}

/** Auth slice state */
export interface AuthState extends AsyncState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  registerSuccess: boolean;
}

/** Dashboard slice state */
export interface DashboardState extends AsyncState {
  data: DashboardData | null;
  stats: DashboardStats | null;
  lastFetched: string | null;
}

/** Employee slice state */
export interface EmployeeState extends AsyncState {
  list: EmployeeListItem[];
  selectedEmployee: Employee | null;
  meta: PaginationMeta | null;
  filters: EmployeeFilters;
  stats: EmployeeStatsSummary | null;
}

/** Leave slice state */
export interface LeaveState extends AsyncState {
  list: LeaveRequest[];
  selectedLeave: LeaveRequest | null;
  meta: PaginationMeta | null;
  filters: LeaveFilters;
  balances: LeaveBalance[];
  stats: LeaveStats | null;
}

/** Attendance slice state */
export interface AttendanceState extends AsyncState {
  list: AttendanceRecord[];
  meta: PaginationMeta | null;
  filters: AttendanceFilters;
  todayStatus: TodayAttendanceStatus | null;
  summary: AttendanceSummary | null;
  overallSummary: OverallAttendanceSummary | null;
}

/** UI slice state */
export interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  theme: ThemeMode;
  commandPaletteOpen: boolean;
  confirmDialog: ConfirmDialogData | null;
  globalLoading: boolean;
}
