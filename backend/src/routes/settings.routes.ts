// ============================================
// Settings Routes
// ============================================
// Defines API routes for system settings management.
// Settings are stored as key-value pairs grouped by category
// (e.g., general, leave, attendance, email).
//
// Route prefix: /api/settings
//
// Most routes are restricted to Admin role only.
// Read access is available to Admin and HR.

import { Router, Request, Response } from 'express';

import { authenticate, authorize } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import prisma from '../config/database';
import { updateSettingSchema, bulkUpdateSettingsSchema } from '../utils/validators';

const router = Router();

// ============================================
// All routes require authentication
// ============================================
router.use(authenticate);

// ============================================
// GET /api/settings
// ============================================
/**
 * Retrieves all system settings, optionally filtered by group.
 *
 * Query Parameters:
 *   - group: string (optional) — Filter by setting group (e.g., "general", "leave", "attendance")
 *
 * Access: Admin, HR
 */
router.get(
  '/',
  authorize('ADMIN', 'HR'),
  asyncHandler(async (req: Request, res: Response) => {
    const { group } = req.query;

    const where: Record<string, any> = {};

    if (group && typeof group === 'string' && group.trim() !== '') {
      where.group = group.trim();
    }

    const settings = await prisma.setting.findMany({
      where,
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    // Group settings by their group field for easier frontend consumption
    const grouped: Record<string, Record<string, string>> = {};

    for (const setting of settings) {
      if (!grouped[setting.group]) {
        grouped[setting.group] = {};
      }
      grouped[setting.group][setting.key] = setting.value;
    }

    res.status(200).json({
      success: true,
      message: 'Settings retrieved successfully',
      data: {
        settings,
        grouped,
      },
    });
  }),
);

// ============================================
// GET /api/settings/:key
// ============================================
/**
 * Retrieves a single setting by its key.
 *
 * Route Params:
 *   - key: string — The setting key (e.g., "company.name", "leave.max_carry_forward")
 *
 * Access: Admin, HR
 */
router.get(
  '/:key',
  authorize('ADMIN', 'HR'),
  asyncHandler(async (req: Request, res: Response) => {
    const key = req.params.key as string;

    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw ApiError.notFound(`Setting with key "${key}" not found.`);
    }

    res.status(200).json({
      success: true,
      message: 'Setting retrieved successfully',
      data: setting,
    });
  }),
);

// ============================================
// PUT /api/settings
// ============================================
/**
 * Creates or updates a single setting.
 * Uses upsert logic — if the key exists, it updates the value;
 * otherwise, it creates a new setting entry.
 *
 * Request Body:
 *   - key: string (required) — The setting key
 *   - value: string (required) — The setting value
 *   - group: string (optional, default: "general") — Setting group/category
 *   - description: string (optional) — Human-readable description
 *
 * Access: Admin only
 */
router.put(
  '/',
  authorize('ADMIN'),
  validate(updateSettingSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { key, value, group = 'general', description } = req.body;

    const setting = await prisma.setting.upsert({
      where: { key },
      update: {
        value,
        group,
        ...(description !== undefined && { description }),
      },
      create: {
        key,
        value,
        group,
        description: description || null,
      },
    });

    // Log the settings change in the audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_SETTING',
        entity: 'Setting',
        entityId: setting.id,
        details: JSON.stringify({
          key,
          value,
          group,
          updatedBy: req.user?.email,
        }),
        userId: req.user?.userId,
        userEmail: req.user?.email,
      },
    });

    res.status(200).json({
      success: true,
      message: `Setting "${key}" updated successfully`,
      data: setting,
    });
  }),
);

// ============================================
// PUT /api/settings/bulk
// ============================================
/**
 * Creates or updates multiple settings at once.
 * Each setting in the array is upserted independently.
 *
 * Request Body:
 *   - settings: Array of { key, value, group?, description? }
 *
 * Access: Admin only
 */
router.put(
  '/bulk',
  authorize('ADMIN'),
  validate(bulkUpdateSettingsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { settings } = req.body;

    if (!Array.isArray(settings) || settings.length === 0) {
      throw ApiError.badRequest('An array of settings is required.');
    }

    // Process each setting in a transaction for atomicity
    const results = await prisma.$transaction(
      settings.map(
        (s: { key: string; value: string; group?: string; description?: string | null }) =>
          prisma.setting.upsert({
            where: { key: s.key },
            update: {
              value: s.value,
              group: s.group || 'general',
              ...(s.description !== undefined && { description: s.description }),
            },
            create: {
              key: s.key,
              value: s.value,
              group: s.group || 'general',
              description: s.description || null,
            },
          }),
      ),
    );

    // Log the bulk update
    await prisma.auditLog.create({
      data: {
        action: 'BULK_UPDATE_SETTINGS',
        entity: 'Setting',
        details: JSON.stringify({
          count: results.length,
          keys: settings.map((s: { key: string }) => s.key),
          updatedBy: req.user?.email,
        }),
        userId: req.user?.userId,
        userEmail: req.user?.email,
      },
    });

    res.status(200).json({
      success: true,
      message: `${results.length} settings updated successfully`,
      data: results,
    });
  }),
);

// ============================================
// DELETE /api/settings/:key
// ============================================
/**
 * Deletes a setting by its key.
 *
 * Route Params:
 *   - key: string — The setting key to delete
 *
 * Access: Admin only
 */
router.delete(
  '/:key',
  authorize('ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const key = req.params.key as string;

    // Verify the setting exists
    const existing = await prisma.setting.findUnique({
      where: { key },
    });

    if (!existing) {
      throw ApiError.notFound(`Setting with key "${key}" not found.`);
    }

    await prisma.setting.delete({
      where: { key },
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_SETTING',
        entity: 'Setting',
        entityId: existing.id,
        details: JSON.stringify({
          key,
          previousValue: existing.value,
          deletedBy: req.user?.email,
        }),
        userId: req.user?.userId,
        userEmail: req.user?.email,
      },
    });

    res.status(200).json({
      success: true,
      message: `Setting "${key}" deleted successfully`,
      data: null,
    });
  }),
);

// ============================================
// GET /api/settings/groups/list
// ============================================
/**
 * Returns a list of all unique setting groups.
 * Useful for building a settings UI with grouped tabs/sections.
 *
 * Note: This route must be defined after the /:key route,
 * but since "groups" could be mistaken for a key, we use
 * a nested path to avoid conflicts.
 *
 * Access: Admin, HR
 */
router.get(
  '/groups/list',
  authorize('ADMIN', 'HR'),
  asyncHandler(async (_req: Request, res: Response) => {
    const groups = await prisma.setting.findMany({
      select: {
        group: true,
      },
      distinct: ['group'],
      orderBy: {
        group: 'asc',
      },
    });

    const groupNames = groups.map((g) => g.group);

    res.status(200).json({
      success: true,
      message: 'Setting groups retrieved successfully',
      data: groupNames,
    });
  }),
);

export default router;
