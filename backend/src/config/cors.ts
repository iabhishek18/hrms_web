// ============================================
// CORS Configuration
// ============================================
// Configures Cross-Origin Resource Sharing (CORS) options
// to control which origins can access the API.

import { CorsOptions } from 'cors';

import { env } from './env';

/**
 * Parses the CORS_ORIGIN environment variable.
 * Supports:
 *   - A single origin string: "http://localhost:5173"
 *   - A comma-separated list: "http://localhost:5173,http://localhost:3000"
 *   - A wildcard: "*" (not recommended for production)
 */
function parseOrigins(): string | string[] | boolean {
  const raw = env.corsOrigin;

  // Allow all origins (development convenience, NOT for production)
  if (raw === '*') {
    return true;
  }

  // Multiple origins separated by commas
  if (raw.includes(',')) {
    return raw.split(',').map((origin) => origin.trim());
  }

  // Single origin
  return raw;
}

/**
 * CORS options used by the Express cors() middleware.
 *
 * - `origin`: Which origins are allowed to make requests.
 * - `credentials`: Allow cookies and authorization headers to be sent.
 * - `methods`: Allowed HTTP methods.
 * - `allowedHeaders`: Headers the client is allowed to send.
 * - `exposedHeaders`: Headers the client is allowed to read from the response.
 * - `maxAge`: How long (in seconds) browsers should cache preflight responses.
 */
export const corsOptions: CorsOptions = {
  origin: parseOrigins(),

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],

  // Headers the client is permitted to include in requests
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma',
  ],

  // Headers exposed to the browser from the response
  exposedHeaders: [
    'Content-Length',
    'Content-Range',
    'X-Total-Count',
    'X-Request-Id',
  ],

  // Cache preflight response for 24 hours (in seconds)
  maxAge: 86400,

  // Respond to preflight with 204 (some legacy browsers choke on 200)
  optionsSuccessStatus: 204,
};

export default corsOptions;
