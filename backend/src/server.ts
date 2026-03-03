// ============================================
// HRMS Backend - Server Entry Point
// ============================================
// This is the main entry point for the HRMS backend server.
// It initializes the Express application, connects to the
// database, and starts listening for incoming HTTP requests.
//
// Responsibilities:
//   1. Load environment configuration
//   2. Connect to the PostgreSQL database via Prisma
//   3. Import the configured Express app
//   4. Start the HTTP server on the configured port
//   5. Register process-level error handlers for graceful shutdown

import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import app from './app';
import { registerProcessErrorHandlers } from './middlewares/errorHandler';

// ============================================
// Server Startup
// ============================================

/**
 * Bootstraps the entire application:
 *   1. Connects to PostgreSQL via Prisma
 *   2. Imports the Express app with all middleware and routes
 *   3. Starts the HTTP server
 *   4. Registers shutdown handlers for SIGTERM/SIGINT
 *
 * If the database connection fails, the process exits with code 1.
 */
async function bootstrap(): Promise<void> {
  try {
    // ---- Step 1: Connect to the database ----
    console.info('🚀 Starting HRMS Backend Server...');
    console.info('');

    await connectDatabase();

    // ---- Step 2: Start listening for HTTP requests ----
    const server = app.listen(env.port, env.host, () => {
      console.info('');
      console.info('========================================');
      console.info('  🌐 HRMS Backend Server is running!');
      console.info('========================================');
      console.info(
        `  URL         : http://${env.host === '0.0.0.0' ? 'localhost' : env.host}:${env.port}`,
      );
      console.info(
        `  API Base    : http://${env.host === '0.0.0.0' ? 'localhost' : env.host}:${env.port}/api`,
      );
      console.info(
        `  Health      : http://${env.host === '0.0.0.0' ? 'localhost' : env.host}:${env.port}/api/health`,
      );
      console.info(`  Environment : ${env.nodeEnv}`);
      console.info(`  PID         : ${process.pid}`);
      console.info('========================================');
      console.info('');

      if (env.isDevelopment) {
        console.info('📋 Available API endpoints:');
        console.info('   POST   /api/auth/register');
        console.info('   POST   /api/auth/login');
        console.info('   POST   /api/auth/logout');
        console.info('   GET    /api/auth/me');
        console.info('   POST   /api/auth/refresh');
        console.info('   GET    /api/dashboard');
        console.info('   GET    /api/dashboard/stats');
        console.info('   GET    /api/employees');
        console.info('   POST   /api/employees');
        console.info('   GET    /api/employees/:id');
        console.info('   PUT    /api/employees/:id');
        console.info('   DELETE /api/employees/:id');
        console.info('   GET    /api/leaves');
        console.info('   POST   /api/leaves');
        console.info('   PUT    /api/leaves/:id/approve');
        console.info('   PUT    /api/leaves/:id/reject');
        console.info('   POST   /api/attendance/clock-in');
        console.info('   POST   /api/attendance/clock-out');
        console.info('   GET    /api/attendance');
        console.info('   GET    /api/departments');
        console.info('   GET    /api/settings');
        console.info('   GET    /api/health');
        console.info('');
      }
    });

    // ---- Step 3: Configure server timeouts ----
    // Set keep-alive timeout to 65 seconds (slightly higher than typical
    // load balancer idle timeout of 60 seconds) to prevent premature
    // connection closures behind reverse proxies.
    server.keepAliveTimeout = 65 * 1000; // 65 seconds
    server.headersTimeout = 66 * 1000; // Slightly higher than keepAliveTimeout

    // ---- Step 4: Register process-level error handlers ----
    // These handle unhandled promise rejections, uncaught exceptions,
    // and OS signals (SIGTERM, SIGINT) for graceful shutdown.
    registerProcessErrorHandlers(server);

    // Register a graceful shutdown handler that disconnects the database
    const gracefulShutdown = async (signal: string) => {
      console.info(`\n📡 ${signal} received. Shutting down gracefully...`);

      // Close the HTTP server (stop accepting new connections)
      server.close(async () => {
        console.info('🔌 HTTP server closed.');

        // Disconnect from the database
        await disconnectDatabase();

        console.info('✅ Graceful shutdown complete.');
        process.exit(0);
      });

      // Force shutdown after 30 seconds if graceful shutdown hangs
      setTimeout(() => {
        console.error(
          '⚠️  Forced shutdown after timeout (30s). Some connections may not have been closed cleanly.',
        );
        process.exit(1);
      }, 30 * 1000);
    };

    // Override the default SIGTERM/SIGINT handlers with our graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    // ---- Fatal startup error ----
    console.error('');
    console.error('❌ ==========================================');
    console.error('❌  FATAL: Failed to start the HRMS server');
    console.error('❌ ==========================================');
    console.error('');

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);

      // Provide helpful hints based on common error types
      if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
        console.error('');
        console.error('💡 Hint: The database connection was refused.');
        console.error('   - Is PostgreSQL running?');
        console.error('   - Is the DATABASE_URL in your .env file correct?');
        console.error('   - If using Docker, make sure the postgres container is healthy.');
        console.error(
          `   - Current DATABASE_URL: ${env.databaseUrl.replace(/\/\/.*:.*@/, '//*****:*****@')}`,
        );
      }

      if (error.message.includes('EADDRINUSE')) {
        console.error('');
        console.error(`💡 Hint: Port ${env.port} is already in use.`);
        console.error('   - Another instance of the server may be running.');
        console.error('   - Change the PORT in your .env file, or stop the other process.');
      }

      if (error.message.includes('prisma') || error.message.includes('migration')) {
        console.error('');
        console.error('💡 Hint: There may be a Prisma/database schema issue.');
        console.error('   - Run: npx prisma migrate dev');
        console.error('   - Run: npx prisma generate');
      }

      if (env.isDevelopment) {
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Unknown error:', error);
    }

    console.error('');

    // Attempt to disconnect the database before exiting
    try {
      await disconnectDatabase();
    } catch {
      // Ignore disconnect errors during fatal shutdown
    }

    process.exit(1);
  }
}

// ============================================
// Start the server
// ============================================

bootstrap();
