// ============================================
// Employee Service
// ============================================
// Business logic layer for Employee CRUD operations,
// search, filtering, and related queries. This service
// is called by the employee controller and interacts
// with the database through Prisma.

import { Prisma, Employee, EmployeeStatus, Gender } from '@prisma/client';

import prisma from '../config/database';
import { ApiError } from '../utils/ApiError';
import { hashPassword } from '../utils/password';
import { generateEmployeeId, buildWhereClause, paginate, calculateHoursWorked } from '../utils/helpers';

// ============================================
// Types
// ============================================

/** Input shape for creating an employee */
export interface CreateEmployeeData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | null;
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
  terminationDate?: string | null;
  salary?: number | null;
  employmentType?: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankIfscCode?: string | null;
  avatar?: string | null;
  // Optional user account creation fields
  createUserAccount?: boolean;
  password?: string;
  role?: 'ADMIN' | 'HR' | 'EMPLOYEE';
}

/** Input shape for updating an employee */
export interface UpdateEmployeeData extends Partial<Omit<CreateEmployeeData, 'createUserAccount' | 'password' | 'role'>> {}

/** Filter parameters for listing employees */
export interface EmployeeFilters {
  search?: string;
  departmentId?: string;
  status?: EmployeeStatus;
  employmentType?: string;
  gender?: Gender;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Shape of employee data returned from queries (with relations) */
export interface EmployeeWithRelations extends Employee {
  department?: { id: string; name: string; code: string } | null;
  manager?: { id: string; firstName: string; lastName: string } | null;
  user?: { id: string; email: string; role: string; isActive: boolean } | null;
  _count?: {
    subordinates: number;
    leaveRequests: number;
  };
}

/** Paginated result shape */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ============================================
// Default include/select for employee queries
// ============================================

const employeeInclude: Prisma.EmployeeInclude = {
  department: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  manager: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      designation: true,
      avatar: true,
    },
  },
  user: {
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      lastLogin: true,
    },
  },
  _count: {
    select: {
      subordinates: true,
      leaveRequests: true,
    },
  },
};

/** Minimal select for list views to improve performance */
const employeeListSelect: Prisma.EmployeeSelect = {
  id: true,
  employeeId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  designation: true,
  status: true,
  joiningDate: true,
  avatar: true,
  employmentType: true,
  salary: true,
  gender: true,
  createdAt: true,
  updatedAt: true,
  department: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  manager: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  user: {
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  },
};

// ============================================
// Employee Service Class
// ============================================

export class EmployeeService {
  // ----------------------------------------
  // List Employees (with search, filter, pagination)
  // ----------------------------------------

  /**
   * Retrieves a paginated, filtered, and sorted list of employees.
   *
   * Supports:
   *   - Text search across firstName, lastName, email, designation, employeeId
   *   - Exact-match filters for departmentId, status, employmentType, gender
   *   - Configurable sorting by any employee field
   *   - Pagination with page/limit
   *
   * @param filters - The filter, search, sort, and pagination parameters
   * @returns Paginated result with employees and metadata
   */
  static async list(filters: EmployeeFilters): Promise<PaginatedResult<any>> {
    const {
      search,
      departmentId,
      status,
      employmentType,
      gender,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build the WHERE clause from provided filters
    const where = buildWhereClause(
      { search, departmentId, status, employmentType, gender },
      {
        searchFields: ['firstName', 'lastName', 'email', 'designation', 'employeeId'],
        exactFields: ['departmentId', 'status', 'employmentType', 'gender'],
      },
    );

    // Get total count for pagination metadata
    const total = await prisma.employee.count({ where });

    // Calculate pagination offsets
    const pagination = paginate(page, limit, total);

    // Determine sort configuration
    // Handle nested sorts (e.g., "department.name")
    let orderBy: Prisma.EmployeeOrderByWithRelationInput;
    if (sortBy.includes('.')) {
      const [relation, field] = sortBy.split('.');
      orderBy = { [relation]: { [field]: sortOrder } } as any;
    } else {
      orderBy = { [sortBy]: sortOrder } as Prisma.EmployeeOrderByWithRelationInput;
    }

    // Fetch the employees with filtering, sorting, and pagination
    const employees = await prisma.employee.findMany({
      where,
      select: employeeListSelect,
      orderBy,
      skip: pagination.skip,
      take: pagination.take,
    });

    return {
      data: employees,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
        hasNextPage: pagination.hasNextPage,
        hasPrevPage: pagination.hasPrevPage,
      },
    };
  }

  // ----------------------------------------
  // Get Employee by ID
  // ----------------------------------------

  /**
   * Retrieves a single employee by their UUID, including
   * related department, manager, and user account data.
   *
   * @param id - The employee's UUID
   * @returns The employee record with all relations
   * @throws ApiError 404 if the employee is not found
   */
  static async getById(id: string): Promise<EmployeeWithRelations> {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: employeeInclude,
    });

    if (!employee) {
      throw ApiError.notFound(`Employee with ID "${id}" not found.`);
    }

    return employee as EmployeeWithRelations;
  }

  // ----------------------------------------
  // Get Employee by Employee ID (e.g., EMP-0001)
  // ----------------------------------------

  /**
   * Retrieves a single employee by their human-readable employee ID
   * (e.g., "EMP-0042"), as opposed to the internal UUID.
   *
   * @param employeeId - The human-readable employee ID string
   * @returns The employee record with relations
   * @throws ApiError 404 if not found
   */
  static async getByEmployeeId(employeeId: string): Promise<EmployeeWithRelations> {
    const employee = await prisma.employee.findUnique({
      where: { employeeId },
      include: employeeInclude,
    });

    if (!employee) {
      throw ApiError.notFound(`Employee with ID "${employeeId}" not found.`);
    }

    return employee as EmployeeWithRelations;
  }

  // ----------------------------------------
  // Get Employee by User ID
  // ----------------------------------------

  /**
   * Retrieves the employee record associated with a given user account ID.
   * Useful for fetching the current user's employee profile.
   *
   * @param userId - The user's UUID
   * @returns The employee record, or null if no employee is linked to this user
   */
  static async getByUserId(userId: string): Promise<EmployeeWithRelations | null> {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: employeeInclude,
    });

    return employee as EmployeeWithRelations | null;
  }

  // ----------------------------------------
  // Create Employee
  // ----------------------------------------

  /**
   * Creates a new employee record. Optionally creates an associated
   * user account for login access.
   *
   * Steps:
   * 1. Check for duplicate email
   * 2. Validate department and manager references (if provided)
   * 3. Generate the next sequential employee ID (EMP-XXXX)
   * 4. Optionally create a User record with hashed password
   * 5. Create the Employee record linked to the user
   * 6. Initialize leave balances for the current year
   *
   * @param data - The employee creation data
   * @returns The newly created employee with all relations
   * @throws ApiError 409 if email already exists
   * @throws ApiError 404 if department or manager is invalid
   */
  static async create(data: CreateEmployeeData): Promise<EmployeeWithRelations> {
    // 1. Check for duplicate email
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: data.email },
    });

    if (existingEmployee) {
      throw ApiError.conflict(`An employee with email "${data.email}" already exists.`);
    }

    // 2. Validate department reference
    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!department) {
        throw ApiError.notFound(`Department with ID "${data.departmentId}" not found.`);
      }
    }

    // Validate manager reference
    if (data.managerId) {
      const manager = await prisma.employee.findUnique({
        where: { id: data.managerId },
      });
      if (!manager) {
        throw ApiError.notFound(`Manager with ID "${data.managerId}" not found.`);
      }
    }

    // 3. Generate the next employee ID
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { employeeId: 'desc' },
      select: { employeeId: true },
    });
    const newEmployeeId = generateEmployeeId(lastEmployee?.employeeId ?? null);

    // 4. Use a transaction to create both user and employee atomically
    const result = await prisma.$transaction(async (tx) => {
      let userId: string | undefined;

      // Optionally create a user account for this employee
      if (data.createUserAccount && data.password) {
        // Check if a user with this email already exists
        const existingUser = await tx.user.findUnique({
          where: { email: data.email },
        });

        if (existingUser) {
          throw ApiError.conflict(`A user account with email "${data.email}" already exists.`);
        }

        const hashedPassword = await hashPassword(data.password);

        const user = await tx.user.create({
          data: {
            email: data.email,
            password: hashedPassword,
            role: data.role || 'EMPLOYEE',
            isActive: true,
          },
        });

        userId = user.id;
      }

      // 5. Create the employee record
      const employee = await tx.employee.create({
        data: {
          employeeId: newEmployeeId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender,
          maritalStatus: data.maritalStatus,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          zipCode: data.zipCode,
          avatar: data.avatar,
          designation: data.designation,
          status: data.status || 'ACTIVE',
          joiningDate: new Date(data.joiningDate),
          confirmationDate: data.confirmationDate ? new Date(data.confirmationDate) : null,
          terminationDate: data.terminationDate ? new Date(data.terminationDate) : null,
          salary: data.salary ? new Prisma.Decimal(data.salary) : null,
          employmentType: data.employmentType || 'Full-Time',
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyContactRelation: data.emergencyContactRelation,
          bankName: data.bankName,
          bankAccountNo: data.bankAccountNo,
          bankIfscCode: data.bankIfscCode,
          // Link to user account (if created)
          ...(userId && { userId }),
          // Link to department and manager (if provided)
          ...(data.departmentId && { departmentId: data.departmentId }),
          ...(data.managerId && { managerId: data.managerId }),
        },
        include: employeeInclude,
      });

      // 6. Initialize leave balances for the current year
      const currentYear = new Date().getFullYear();
      const leaveTypes = [
        { type: 'CASUAL' as const, total: 12 },
        { type: 'SICK' as const, total: 12 },
        { type: 'EARNED' as const, total: 15 },
      ];

      await Promise.all(
        leaveTypes.map((leave) =>
          tx.leaveBalance.create({
            data: {
              employeeId: employee.id,
              leaveType: leave.type,
              totalLeaves: leave.total,
              usedLeaves: 0,
              year: currentYear,
            },
          }),
        ),
      );

      return employee;
    });

    return result as EmployeeWithRelations;
  }

  // ----------------------------------------
  // Update Employee
  // ----------------------------------------

  /**
   * Updates an existing employee's information.
   *
   * Only the fields provided in the `data` parameter will be updated;
   * all other fields remain unchanged (partial update / PATCH semantics).
   *
   * @param id - The employee's UUID
   * @param data - Partial employee data to update
   * @returns The updated employee record with relations
   * @throws ApiError 404 if the employee is not found
   * @throws ApiError 409 if the new email conflicts with another employee
   */
  static async update(id: string, data: UpdateEmployeeData): Promise<EmployeeWithRelations> {
    // Verify the employee exists
    const existing = await prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound(`Employee with ID "${id}" not found.`);
    }

    // If email is being changed, check for duplicates
    if (data.email && data.email !== existing.email) {
      const emailConflict = await prisma.employee.findUnique({
        where: { email: data.email },
      });
      if (emailConflict && emailConflict.id !== id) {
        throw ApiError.conflict(`An employee with email "${data.email}" already exists.`);
      }

      // Also update the linked user's email if applicable
      if (existing.userId) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: { email: data.email },
        });
      }
    }

    // Validate department reference if being changed
    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId },
      });
      if (!department) {
        throw ApiError.notFound(`Department with ID "${data.departmentId}" not found.`);
      }
    }

    // Validate manager reference if being changed
    if (data.managerId) {
      // Prevent an employee from being their own manager
      if (data.managerId === id) {
        throw ApiError.badRequest('An employee cannot be their own manager.');
      }

      const manager = await prisma.employee.findUnique({
        where: { id: data.managerId },
      });
      if (!manager) {
        throw ApiError.notFound(`Manager with ID "${data.managerId}" not found.`);
      }
    }

    // Build the Prisma update data object, converting dates as needed
    const updateData: Prisma.EmployeeUpdateInput = {};

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    }
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.maritalStatus !== undefined) updateData.maritalStatus = data.maritalStatus;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.designation !== undefined) updateData.designation = data.designation;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.joiningDate !== undefined) {
      updateData.joiningDate = new Date(data.joiningDate);
    }
    if (data.confirmationDate !== undefined) {
      updateData.confirmationDate = data.confirmationDate
        ? new Date(data.confirmationDate)
        : null;
    }
    if (data.terminationDate !== undefined) {
      updateData.terminationDate = data.terminationDate
        ? new Date(data.terminationDate)
        : null;
    }
    if (data.salary !== undefined) {
      updateData.salary = data.salary !== null ? new Prisma.Decimal(data.salary) : null;
    }
    if (data.employmentType !== undefined) updateData.employmentType = data.employmentType;
    if (data.emergencyContactName !== undefined) updateData.emergencyContactName = data.emergencyContactName;
    if (data.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = data.emergencyContactPhone;
    if (data.emergencyContactRelation !== undefined) updateData.emergencyContactRelation = data.emergencyContactRelation;
    if (data.bankName !== undefined) updateData.bankName = data.bankName;
    if (data.bankAccountNo !== undefined) updateData.bankAccountNo = data.bankAccountNo;
    if (data.bankIfscCode !== undefined) updateData.bankIfscCode = data.bankIfscCode;

    // Handle relation updates
    if (data.departmentId !== undefined) {
      if (data.departmentId === null) {
        updateData.department = { disconnect: true };
      } else {
        updateData.department = { connect: { id: data.departmentId } };
      }
    }

    if (data.managerId !== undefined) {
      if (data.managerId === null) {
        updateData.manager = { disconnect: true };
      } else {
        updateData.manager = { connect: { id: data.managerId } };
      }
    }

    // Perform the update
    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: employeeInclude,
    });

    return updated as EmployeeWithRelations;
  }

  // ----------------------------------------
  // Delete Employee
  // ----------------------------------------

  /**
   * Permanently deletes an employee and their associated user account.
   *
   * This operation:
   *   - Removes the employee record (cascading to attendance, leaves, etc.)
   *   - Deletes the associated user account if one exists
   *   - Reassigns any subordinates to have no manager
   *
   * @param id - The employee's UUID
   * @returns The deleted employee record
   * @throws ApiError 404 if the employee is not found
   */
  static async delete(id: string): Promise<Employee> {
    // Verify the employee exists
    const existing = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      throw ApiError.notFound(`Employee with ID "${id}" not found.`);
    }

    // Use a transaction for atomic deletion
    const deleted = await prisma.$transaction(async (tx) => {
      // 1. Unlink subordinates (set their managerId to null)
      await tx.employee.updateMany({
        where: { managerId: id },
        data: { managerId: null },
      });

      // 2. Delete the employee record (cascading deletes handle
      //    attendance, leaves, leave balances, documents, and reviews)
      const deletedEmployee = await tx.employee.delete({
        where: { id },
      });

      // 3. Delete the associated user account if it exists
      if (existing.userId) {
        await tx.user.delete({
          where: { id: existing.userId },
        });
      }

      return deletedEmployee;
    });

    return deleted;
  }

  // ----------------------------------------
  // Get Employee Count by Status
  // ----------------------------------------

  /**
   * Returns the count of employees grouped by their status.
   * Useful for dashboard summary cards.
   *
   * @returns Object with status keys and count values
   */
  static async getCountByStatus(): Promise<Record<string, number>> {
    const statusCounts = await prisma.employee.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const result: Record<string, number> = {
      ACTIVE: 0,
      INACTIVE: 0,
      ON_LEAVE: 0,
      TERMINATED: 0,
      PROBATION: 0,
    };

    for (const item of statusCounts) {
      result[item.status] = item._count.id;
    }

    // Add total
    result.TOTAL = Object.values(result).reduce((sum, count) => sum + count, 0);

    return result;
  }

  // ----------------------------------------
  // Get Employee Count by Department
  // ----------------------------------------

  /**
   * Returns the count of employees grouped by department.
   * Useful for dashboard charts (e.g., bar chart by department).
   *
   * @returns Array of objects with department name and employee count
   */
  static async getCountByDepartment(): Promise<{ department: string; count: number }[]> {
    const departments = await prisma.department.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return departments.map((dept) => ({
      department: dept.name,
      count: dept._count.employees,
    }));
  }

  // ----------------------------------------
  // Get Recent Employees (New Joiners)
  // ----------------------------------------

  /**
   * Retrieves the most recently joined employees.
   * Useful for dashboard "new joiners" section.
   *
   * @param limit - Maximum number of records to return (default: 5)
   * @returns Array of recently joined employees
   */
  static async getRecentJoiners(limit: number = 5): Promise<any[]> {
    return prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        designation: true,
        joiningDate: true,
        avatar: true,
        department: {
          select: { name: true },
        },
      },
      orderBy: { joiningDate: 'desc' },
      take: limit,
    });
  }

  // ----------------------------------------
  // Get Employees with Birthday This Month
  // ----------------------------------------

  /**
   * Finds employees whose birthday falls in the current month.
   * Useful for dashboard "Birthdays this month" widget.
   *
   * @returns Array of employees with birthdays this month
   */
  static async getBirthdaysThisMonth(): Promise<any[]> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    // Use a raw query since Prisma doesn't support EXTRACT natively in where
    const employees = await prisma.$queryRaw<any[]>`
      SELECT id, "employeeId", "firstName", "lastName", "dateOfBirth",
             "designation", "avatar", "departmentId"
      FROM employees
      WHERE EXTRACT(MONTH FROM "dateOfBirth") = ${currentMonth}
        AND status = 'ACTIVE'
      ORDER BY EXTRACT(DAY FROM "dateOfBirth") ASC
    `;

    return employees;
  }

  // ----------------------------------------
  // Search Employees (Autocomplete / Quick Search)
  // ----------------------------------------

  /**
   * Quick search for employees by name or employee ID.
   * Returns minimal data suitable for autocomplete dropdowns.
   *
   * @param query - The search query string
   * @param limit - Maximum results to return (default: 10)
   * @returns Array of matching employees (minimal fields)
   */
  static async quickSearch(query: string, limit: number = 10): Promise<any[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim();

    return prisma.employee.findMany({
      where: {
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { employeeId: { contains: searchTerm, mode: 'insensitive' } },
          { designation: { contains: searchTerm, mode: 'insensitive' } },
        ],
        status: { not: 'TERMINATED' },
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        designation: true,
        avatar: true,
        department: {
          select: { name: true },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: limit,
    });
  }

  // ----------------------------------------
  // Get Top Performers
  // ----------------------------------------

  /**
   * Retrieves the top-performing employees based on their
   * most recent performance review rating.
   *
   * @param limit - Maximum number of top performers to return (default: 5)
   * @returns Array of employees with their latest performance rating
   */
  static async getTopPerformers(limit: number = 5): Promise<any[]> {
    const employees = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        performanceReviews: {
          some: {},
        },
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        designation: true,
        avatar: true,
        department: {
          select: { name: true },
        },
        performanceReviews: {
          select: {
            rating: true,
            reviewPeriod: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Sort by the latest review's rating (descending) and return top N
    const sorted = employees
      .map((emp) => ({
        ...emp,
        latestRating: emp.performanceReviews[0]?.rating ?? 0,
        latestReviewPeriod: emp.performanceReviews[0]?.reviewPeriod ?? '—',
      }))
      .sort((a, b) => b.latestRating - a.latestRating)
      .slice(0, limit);

    return sorted;
  }

  // ----------------------------------------
  // Get Top Absentees
  // ----------------------------------------

  /**
   * Retrieves employees with the most absences in the current month.
   * Used for the dashboard "Top Absentees" widget.
   *
   * @param limit - Maximum number to return (default: 5)
   * @returns Array of employees with absence counts
   */
  static async getTopAbsentees(limit: number = 5): Promise<any[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const absentees = await prisma.attendance.groupBy({
      by: ['employeeId'],
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        status: 'ABSENT',
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    // Fetch employee details for the absentee IDs
    if (absentees.length === 0) {
      return [];
    }

    const employeeIds = absentees.map((a) => a.employeeId);
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        designation: true,
        avatar: true,
        department: {
          select: { name: true },
        },
      },
    });

    // Merge absence counts with employee data
    return absentees.map((absence) => {
      const employee = employees.find((e) => e.id === absence.employeeId);
      return {
        ...employee,
        absentDays: absence._count.id,
      };
    });
  }

  // ----------------------------------------
  // Get All Employee Emails (for bulk operations)
  // ----------------------------------------

  /**
   * Returns a list of all active employee email addresses.
   * Useful for sending bulk notifications or announcements.
   *
   * @returns Array of email strings
   */
  static async getAllActiveEmails(): Promise<string[]> {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { email: true },
    });

    return employees.map((e) => e.email);
  }

  // ----------------------------------------
  // Get Employee Stats Summary
  // ----------------------------------------

  /**
   * Aggregates various employee statistics for the dashboard overview.
   * Includes total count, active count, department breakdown, and
   * recent activity metrics.
   *
   * @returns Comprehensive employee statistics object
   */
  static async getStatsSummary(): Promise<{
    total: number;
    active: number;
    inactive: number;
    onLeave: number;
    probation: number;
    newThisMonth: number;
    byDepartment: { department: string; count: number }[];
    byGender: { gender: string; count: number }[];
    byEmploymentType: { type: string; count: number }[];
  }> {
    const [
      statusCounts,
      newThisMonth,
      byDepartment,
      genderCounts,
      typeCounts,
    ] = await Promise.all([
      // Count by status
      this.getCountByStatus(),

      // New employees this month
      prisma.employee.count({
        where: {
          joiningDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      // Count by department
      this.getCountByDepartment(),

      // Count by gender
      prisma.employee.groupBy({
        by: ['gender'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
      }),

      // Count by employment type
      prisma.employee.groupBy({
        by: ['employmentType'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
      }),
    ]);

    return {
      total: statusCounts.TOTAL,
      active: statusCounts.ACTIVE,
      inactive: statusCounts.INACTIVE,
      onLeave: statusCounts.ON_LEAVE,
      probation: statusCounts.PROBATION,
      newThisMonth,
      byDepartment,
      byGender: genderCounts.map((g) => ({
        gender: g.gender || 'Not Specified',
        count: g._count.id,
      })),
      byEmploymentType: typeCounts.map((t) => ({
        type: t.employmentType || 'Not Specified',
        count: t._count.id,
      })),
    };
  }
}

export default EmployeeService;
