// ============================================
// Environment Configuration
// ============================================
// Loads and validates all environment variables required
// by the application. Throws on startup if any required
// variable is missing so we fail fast.

import dotenv from 'dotenv';
import path from 'path';

// Load .env file from project root (backend/../.env or backend/.env)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Helper to read an environment variable with an optional default.
 * Throws if the variable is required and not set.
 */
function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Helper to read an environment variable as an integer.
 */
function getEnvInt(key: string, defaultValue?: number): number {
  const raw = process.env[key];
  if (raw !== undefined) {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a valid integer. Got: "${raw}"`);
    }
    return parsed;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Missing required environment variable: ${key}`);
}

/**
 * Helper to read a boolean environment variable.
 * Truthy values: "true", "1", "yes"
 */
function getEnvBool(key: string, defaultValue?: boolean): boolean {
  const raw = process.env[key];
  if (raw !== undefined) {
    return ['true', '1', 'yes'].includes(raw.toLowerCase());
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Missing required environment variable: ${key}`);
}

// ============================================
// Validated Configuration Object
// ============================================

export const env = {
  // General
  nodeEnv: getEnv('NODE_ENV', 'development'),
  isProduction: getEnv('NODE_ENV', 'development') === 'production',
  isDevelopment: getEnv('NODE_ENV', 'development') === 'development',

  // Server
  port: getEnvInt('PORT', 5000),
  host: getEnv('HOST', '0.0.0.0'),

  // Database
  databaseUrl: getEnv(
    'DATABASE_URL',
    'postgresql://hrms_user:hrms_password@localhost:5432/hrms_db?schema=public',
  ),

  // JWT Authentication
  jwtSecret: getEnv('JWT_SECRET', 'super_secret_jwt_key_change_in_production'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
  jwtRefreshSecret: getEnv('JWT_REFRESH_SECRET', 'refresh_secret_change_in_production'),
  jwtRefreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '30d'),

  // Bcrypt
  bcryptSaltRounds: getEnvInt('BCRYPT_SALT_ROUNDS', 12),

  // CORS
  corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:5173'),

  // File Uploads
  uploadDir: getEnv('UPLOAD_DIR', './uploads'),
  maxFileSize: getEnvInt('MAX_FILE_SIZE', 5 * 1024 * 1024), // 5MB default

  // Logging
  logLevel: getEnv('LOG_LEVEL', 'debug'),
  logFile: getEnv('LOG_FILE', './logs/app.log'),

  // Rate Limiting
  rateLimitWindowMs: getEnvInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
  rateLimitMaxRequests: getEnvInt('RATE_LIMIT_MAX_REQUESTS', 100),

  // Optional: Email (SMTP)
  smtp: {
    host: getEnv('SMTP_HOST', ''),
    port: getEnvInt('SMTP_PORT', 587),
    user: getEnv('SMTP_USER', ''),
    password: getEnv('SMTP_PASSWORD', ''),
    from: getEnv('SMTP_FROM', 'noreply@hrms.com'),
  },

  // Optional: Redis
  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getEnvInt('REDIS_PORT', 6379),
    password: getEnv('REDIS_PASSWORD', ''),
  },
} as const;

// Type for the config object so other modules can reference it
export type EnvConfig = typeof env;

// Log a startup summary (only in development)
if (env.isDevelopment) {
  console.info('========================================');
  console.info('  HRMS Backend - Configuration Loaded');
  console.info('========================================');
  console.info(`  Environment : ${env.nodeEnv}`);
  console.info(`  Port        : ${env.port}`);
  console.info(`  CORS Origin : ${env.corsOrigin}`);
  console.info(`  Database    : ${env.databaseUrl.replace(/\/\/.*:.*@/, '//*****:*****@')}`);
  console.info('========================================');
}

export default env;
