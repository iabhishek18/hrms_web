// ============================================
// Configuration Barrel Export
// ============================================
// Centralizes all configuration exports for easy importing
// Usage: import { env, db } from '@/config';

export { env } from './env';
export { default as prisma } from './database';
export { corsOptions } from './cors';
