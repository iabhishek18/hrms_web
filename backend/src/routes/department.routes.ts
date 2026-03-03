// ============================================
// Department Routes
// ============================================
// Defines all API routes for department management.
// Includes CRUD operations with role-based access control.
//
// Route prefix: /api/departments

import { Router, Request, Response } from 'express';

import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import prisma from '../config/database';
import { createDepartmentSchema, updateDepartmentSchema } from '../utils/validators';

const router = Router();

// ============================================
// All routes require authentication
// ============================================
router.use(authenticate);

// ============================================
// GET /api/departments
// List all departments
// ============================================

/**
 * Returns a list of all departments with their employee counts.
 * Optionally filters by active/inactive status.
 *
 * Query Parameters:
 *   - isActive: 'true' | 'false' (optional, defaults to all)
 *   - search: string (optional, searches name and code)
 *
 * Access: All authenticated users
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { isActive, search } = req.query;

    // Build where clause
    const where: Record<string, any> = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search && String(search).trim()) {
      const searchTerm = String(search).trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { code: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const departments = await prisma.department.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        isActive: true,
        headId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            employees: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Map the _count to a friendlier shape
    const result = departments.map((dept) => ({
      ...dept,
      employeeCount: dept._count.employees,
      _count: undefined,
    }));

    res.status(200).json({
      success: true,
      message: 'Departments retrieved successfully',
      data: result,
    });
  }),
);

// ============================================
// GET /api/departments/:id
// Get a single department by ID
// ============================================

/**
 * Returns a single department with its employees list.
 *
 * Access: All authenticated users
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            designation: true,
            status: true,
            avatar: true,
            joiningDate: true,
          },
          orderBy: { firstName: 'asc' },
        },
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    if (!department) {
      throw ApiError.notFound(`Department with ID "${id}" not found.`);
    }

    res.status(200).json({
      success: true,
      message: 'Department retrieved successfully',
      data: {
        ...department,
        employeeCount: department._count.employees,
      },
    });
  }),
);

// ============================================
// POST /api/departments
// Create a new department
// ============================================

/**
 * Creates a new department record.
 *
 * Body:
 *   - name: string (required, unique)
 *   - code: string (required, unique, uppercase)
 *   - description: string (optional)
 *   - headId: UUID (optional, the department head employee ID)
 *   - isActive: boolean (optional, default true)
 *
 * Access: Admin, HR
 */
router.post(
  '/',
  authorize('ADMIN', 'HR'),
  validate(createDepartmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, code, description, headId, isActive } = req.body;

    // Check for duplicate name
    const existingByName = await prisma.department.findUnique({
      where: { name },
    });

    if (existingByName) {
      throw ApiError.conflict(`A department with the name "${name}" already exists.`);
    }

    // Check for duplicate code
    const existingByCode = await prisma.department.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingByCode) {
      throw ApiError.conflict(`A department with the code "${code}" already exists.`);
    }

    // Validate head employee if provided
    if (headId) {
      const headEmployee = await prisma.employee.findUnique({
        where: { id: headId },
        select: { id: true },
      });

      if (!headEmployee) {
        throw ApiError.notFound(
          `Employee with ID "${headId}" not found. Cannot set as department head.`,
        );
      }
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        code: code.toUpperCase().trim(),
        description: description?.trim() || null,
        headId: headId || null,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: {
        ...department,
        employeeCount: department._count.employees,
      },
    });
  }),
);

// ============================================
// PUT /api/departments/:id
// Update a department
// ============================================

/**
 * Updates an existing department. Supports partial updates.
 *
 * Body (all optional):
 *   - name: string
 *   - code: string
 *   - description: string
 *   - headId: UUID | null
 *   - isActive: boolean
 *
 * Access: Admin, HR
 */
router.put(
  '/:id',
  authorize('ADMIN', 'HR'),
  validate(updateDepartmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const updateData = req.body;

    // Verify the department exists
    const existing = await prisma.department.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound(`Department with ID "${id}" not found.`);
    }

    // Check for name conflicts if name is being changed
    if (updateData.name && updateData.name !== existing.name) {
      const nameConflict = await prisma.department.findUnique({
        where: { name: updateData.name },
      });
      if (nameConflict && nameConflict.id !== id) {
        throw ApiError.conflict(`A department with the name "${updateData.name}" already exists.`);
      }
    }

    // Check for code conflicts if code is being changed
    if (updateData.code && updateData.code.toUpperCase() !== existing.code) {
      const codeConflict = await prisma.department.findUnique({
        where: { code: updateData.code.toUpperCase() },
      });
      if (codeConflict && codeConflict.id !== id) {
        throw ApiError.conflict(`A department with the code "${updateData.code}" already exists.`);
      }
    }

    // Validate head employee if being changed
    if (updateData.headId) {
      const headEmployee = await prisma.employee.findUnique({
        where: { id: updateData.headId },
        select: { id: true },
      });

      if (!headEmployee) {
        throw ApiError.notFound(
          `Employee with ID "${updateData.headId}" not found. Cannot set as department head.`,
        );
      }
    }

    // Build the Prisma update payload
    const data: Record<string, any> = {};
    if (updateData.name !== undefined) data.name = updateData.name.trim();
    if (updateData.code !== undefined) data.code = updateData.code.toUpperCase().trim();
    if (updateData.description !== undefined)
      data.description = updateData.description?.trim() || null;
    if (updateData.headId !== undefined) data.headId = updateData.headId || null;
    if (updateData.isActive !== undefined) data.isActive = updateData.isActive;

    const department = await prisma.department.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: {
        ...department,
        employeeCount: department._count.employees,
      },
    });
  }),
);

// ============================================
// PATCH /api/departments/:id
// Alias for PUT — same partial update behavior
// ============================================
router.patch(
  '/:id',
  authorize('ADMIN', 'HR'),
  validate(updateDepartmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Redirect to the PUT handler logic
    const id = req.params.id as string;
    const updateData = req.body;

    const existing = await prisma.department.findUnique({ where: { id } });

    if (!existing) {
      throw ApiError.notFound(`Department with ID "${id}" not found.`);
    }

    const data: Record<string, any> = {};
    if (updateData.name !== undefined) data.name = updateData.name.trim();
    if (updateData.code !== undefined) data.code = updateData.code.toUpperCase().trim();
    if (updateData.description !== undefined)
      data.description = updateData.description?.trim() || null;
    if (updateData.headId !== undefined) data.headId = updateData.headId || null;
    if (updateData.isActive !== undefined) data.isActive = updateData.isActive;

    const department = await prisma.department.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: {
        ...department,
        employeeCount: department._count.employees,
      },
    });
  }),
);

// ============================================
// DELETE /api/departments/:id
// Delete a department
// ============================================

/**
 * Deletes a department. This operation will:
 * 1. Set all employees in this department to have no department (null).
 * 2. Delete the department record.
 *
 * If the department has employees, the request will still succeed but
 * those employees will become "unassigned."
 *
 * Alternatively, you can "soft delete" by setting isActive to false
 * using the PUT endpoint instead.
 *
 * Access: Admin only
 */
router.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    // Verify the department exists
    const existing = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound(`Department with ID "${id}" not found.`);
    }

    // Use a transaction to unlink employees and delete the department atomically
    await prisma.$transaction(async (tx) => {
      // Set departmentId to null for all employees in this department
      if (existing._count.employees > 0) {
        await tx.employee.updateMany({
          where: { departmentId: id },
          data: { departmentId: null },
        });
      }

      // Delete the department
      await tx.department.delete({
        where: { id },
      });
    });

    res.status(200).json({
      success: true,
      message: `Department "${existing.name}" deleted successfully. ${existing._count.employees} employee(s) were unassigned.`,
      data: null,
    });
  }),
);

// ============================================
// GET /api/departments/:id/employees
// List employees in a specific department
// ============================================

/**
 * Returns a paginated list of employees belonging to a department.
 *
 * Query Parameters:
 *   - page: number (default: 1)
 *   - limit: number (default: 20, max: 100)
 *   - status: EmployeeStatus (optional filter)
 *   - search: string (optional, search by name/email)
 *
 * Access: All authenticated users
 */
router.get(
  '/:id/employees',
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { page = '1', limit = '20', status, search } = req.query;

    // Verify the department exists
    const department = await prisma.department.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!department) {
      throw ApiError.notFound(`Department with ID "${id}" not found.`);
    }

    // Build where clause
    const where: Record<string, any> = { departmentId: id };

    if (status) {
      where.status = status;
    }

    if (search && String(search).trim()) {
      const searchTerm = String(search).trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { employeeId: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          designation: true,
          status: true,
          avatar: true,
          joiningDate: true,
          employmentType: true,
        },
        orderBy: { firstName: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.employee.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      message: `Employees in "${department.name}" department retrieved successfully`,
      data: employees,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  }),
);

export default router;
