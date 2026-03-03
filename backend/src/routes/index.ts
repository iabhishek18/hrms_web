// ============================================
// Master Route Index
// ============================================
// Combines all route modules into a single router that
// is mounted at /api in the Express application.
//
// Route structure:
//   /api/auth          — Authentication (login, register, logout, refresh)
//   /api/dashboard     — Dashboard statistics and chart data
//   /api/employees     — Employee CRUD operations
//   /api/leaves        — Leave management
//   /api/attendance    — Attendance tracking
//   /api/departments   — Department management
//   /api/settings      — System settings
//   /api/health        — Health check endpoint

import { Router, Request, Response } from 'express';

import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import employeeRoutes from './employee.routes';
import leaveRoutes from './leave.routes';
import attendanceRoutes from './attendance.routes';
import departmentRoutes from './department.routes';
import settingsRoutes from './settings.routes';

const router = Router();

// ============================================
// Health Check Endpoint
// ============================================
// Returns a simple JSON response to verify the API is running.
// Used by Docker health checks, load balancers, and monitoring tools.

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'HRMS API is running',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    },
  });
});

// ============================================
// Mount Route Modules
// ============================================

// Authentication routes — login, register, logout, token refresh, password change
router.use('/auth', authRoutes);

// Dashboard routes — stats, charts, department breakdown, top performers
router.use('/dashboard', dashboardRoutes);

// Employee routes — CRUD, search, stats, top performers/absentees
router.use('/employees', employeeRoutes);

// Leave routes — apply, approve, reject, cancel, balance management
router.use('/leaves', leaveRoutes);

// Attendance routes — clock in/out, records, summaries, bulk operations
router.use('/attendance', attendanceRoutes);

// Department routes — CRUD for departments
router.use('/departments', departmentRoutes);

// Settings routes — system configuration key-value pairs
router.use('/settings', settingsRoutes);

// ============================================
// API Info Endpoint (Root)
// ============================================
// Returns API metadata when hitting the base /api URL.

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the HRMS API',
    data: {
      name: 'HRMS REST API',
      version: '1.0.0',
      description: 'Human Resource Management System API',
      documentation: '/api/docs',
      endpoints: {
        health: 'GET /api/health',
        auth: {
          login: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
          logout: 'POST /api/auth/logout',
          me: 'GET /api/auth/me',
          refresh: 'POST /api/auth/refresh',
          changePassword: 'POST /api/auth/change-password',
          verify: 'GET /api/auth/verify',
        },
        dashboard: {
          stats: 'GET /api/dashboard/stats',
          full: 'GET /api/dashboard',
          departmentBreakdown: 'GET /api/dashboard/department-breakdown',
          attendanceSummary: 'GET /api/dashboard/attendance-summary',
          topPerformers: 'GET /api/dashboard/top-performers',
          topAbsentees: 'GET /api/dashboard/top-absentees',
          monthlyAttendance: 'GET /api/dashboard/charts/monthly-attendance',
          leaveDistribution: 'GET /api/dashboard/charts/leave-distribution',
          recentActivity: 'GET /api/dashboard/recent-activity',
        },
        employees: {
          list: 'GET /api/employees',
          create: 'POST /api/employees',
          getById: 'GET /api/employees/:id',
          update: 'PUT /api/employees/:id',
          delete: 'DELETE /api/employees/:id',
          search: 'GET /api/employees/search',
          stats: 'GET /api/employees/stats',
        },
        leaves: {
          list: 'GET /api/leaves',
          apply: 'POST /api/leaves',
          getById: 'GET /api/leaves/:id',
          approve: 'PUT /api/leaves/:id/approve',
          reject: 'PUT /api/leaves/:id/reject',
          cancel: 'PUT /api/leaves/:id/cancel',
          balance: 'GET /api/leaves/balance',
          myLeaves: 'GET /api/leaves/my-leaves',
        },
        attendance: {
          list: 'GET /api/attendance',
          clockIn: 'POST /api/attendance/clock-in',
          clockOut: 'POST /api/attendance/clock-out',
          today: 'GET /api/attendance/today',
          summary: 'GET /api/attendance/summary/:employeeId',
          overallSummary: 'GET /api/attendance/overall-summary',
        },
        departments: {
          list: 'GET /api/departments',
          create: 'POST /api/departments',
          getById: 'GET /api/departments/:id',
          update: 'PUT /api/departments/:id',
          delete: 'DELETE /api/departments/:id',
        },
        settings: {
          list: 'GET /api/settings',
          update: 'PUT /api/settings',
        },
      },
    },
  });
});

export default router;
