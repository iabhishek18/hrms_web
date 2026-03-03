// ============================================
// Database Configuration - Prisma Client Singleton
// ============================================
// This module creates and exports a single instance of the Prisma client
// to be used throughout the application. Using a singleton pattern prevents
// creating multiple database connections during development with hot-reload.

import { PrismaClient } from '@prisma/client';

// Extend the global namespace to store the Prisma client instance
// This prevents multiple instances during hot-reload in development
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Creates a new Prisma client instance with logging configuration
 * based on the current environment.
 */
function createPrismaClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production';

  const client = new PrismaClient({
    log: isProduction
      ? [{ emit: 'stdout', level: 'error' }]
      : [
          { emit: 'stdout', level: 'query' },
          { emit: 'stdout', level: 'info' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ],
    errorFormat: isProduction ? 'minimal' : 'pretty',
  });

  return client;
}

/**
 * Singleton Prisma client instance.
 *
 * In development, we store the client on the global object so that
 * hot-reloading (e.g., with tsx watch or nodemon) does not create
 * a new connection pool on every restart.
 *
 * In production, a single instance is created per process.
 */
const prisma: PrismaClient = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

/**
 * Connects to the database and logs the result.
 * Call this during server startup to verify connectivity.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.info('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

/**
 * Gracefully disconnects from the database.
 * Call this during server shutdown (e.g., SIGTERM, SIGINT handlers).
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.info('🔌 Database disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
}

export default prisma;
