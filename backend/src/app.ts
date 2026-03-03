// ============================================
// Express Application Setup
// ============================================
// Configures the Express application with all middleware,
// route mounting, error handling, and security settings.
// This module exports the configured app instance which
// is then started by server.ts.

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { corsOptions } from './config/cors';
import { env } from './config/env';
import apiRoutes from './routes';
import { globalErrorHandler, notFoundHandler } from './middlewares/errorHandler';

// ============================================
// Create Express Application
// ============================================

const app: Express = express();

// ============================================
// Security Middleware
// ============================================

// Helmet — sets various HTTP headers for security
// (Content-Security-Policy, X-Content-Type-Options, etc.)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS — Cross-Origin Resource Sharing
// Configured in config/cors.ts based on CORS_ORIGIN env variable
app.use(cors(corsOptions));

// Rate Limiting — prevents brute-force and DDoS attacks
// Default: 100 requests per 15-minute window per IP
const generalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs, // 15 minutes
  max: env.rateLimitMaxRequests, // limit each IP
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
  skip: (_req: Request) => {
    // Skip rate limiting in test environments
    return env.nodeEnv === 'test';
  },
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Stricter rate limit for auth endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window for auth routes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
    code: 'AUTH_RATE_LIMITED',
  },
  skip: (_req: Request) => {
    return env.nodeEnv === 'test';
  },
});

// Apply auth-specific rate limiter to login and register routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ============================================
// Body Parsing Middleware
// ============================================

// Parse JSON request bodies (limit to 10MB to prevent payload attacks)
app.use(
  express.json({
    limit: '10mb',
  }),
);

// Parse URL-encoded request bodies (for form submissions)
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  }),
);

// Parse cookies (used for refresh token storage)
app.use(cookieParser());

// ============================================
// Logging Middleware
// ============================================

// Morgan — HTTP request logger
// Use 'dev' format in development (colorized, concise)
// Use 'combined' format in production (Apache-style, detailed)
if (env.isDevelopment) {
  app.use(
    morgan('dev', {
      skip: (req: Request, _res: Response) => {
        // Skip logging for health check endpoints to reduce noise
        return req.url === '/api/health';
      },
    }),
  );
} else {
  app.use(morgan('combined'));
}

// ============================================
// Static Files
// ============================================

// Serve uploaded files from the uploads directory
app.use(
  '/uploads',
  express.static(path.resolve(env.uploadDir), {
    maxAge: '7d', // Cache static files for 7 days
    etag: true,
  }),
);

// ============================================
// Request Enrichment Middleware
// ============================================

// Add request timestamp for logging and auditing
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestTime = new Date().toISOString();
  next();
});

// ============================================
// API Routes
// ============================================

// Mount all API routes under the /api prefix
// Individual route files handle their own sub-paths:
//   /api/auth        — Authentication
//   /api/dashboard   — Dashboard statistics & charts
//   /api/employees   — Employee CRUD
//   /api/leaves      — Leave management
//   /api/attendance  — Attendance tracking
//   /api/departments — Department management
//   /api/settings    — System settings
//   /api/health      — Health check
app.use('/api', apiRoutes);

// ============================================
// Root Route
// ============================================

// Redirect root URL to the API info endpoint
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/api');
});

// ============================================
// Error Handling
// ============================================

// 404 Handler — catches requests to undefined routes
// Must be registered AFTER all valid routes
app.use(notFoundHandler);

// Global Error Handler — catches all errors thrown in route handlers
// Must be registered LAST in the middleware chain
// Express recognizes it as an error handler because it has 4 parameters
app.use(globalErrorHandler);

// ============================================
// Export
// ============================================

export default app;
