// ============================================
// JWT Utility Functions
// ============================================
// Provides helper functions for signing, verifying,
// and extracting data from JSON Web Tokens. Used by
// the auth middleware and auth controller.

import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

import { env } from '../config/env';

// ============================================
// Types
// ============================================

/** Payload embedded inside every access / refresh token */
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/** The shape returned after successfully verifying a token */
export interface DecodedToken extends TokenPayload, JwtPayload {}

/** Pair returned on login / refresh */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ============================================
// Token Generation
// ============================================

/**
 * Signs an access token with the given payload.
 *
 * @param payload - Data to embed in the token (userId, email, role)
 * @returns A signed JWT access token string
 */
export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as any,
    issuer: 'hrms-api',
    audience: 'hrms-client',
    subject: payload.userId,
  };

  return jwt.sign(payload, env.jwtSecret, options);
}

/**
 * Signs a refresh token with a longer expiry.
 * The refresh token uses a separate secret so that compromising
 * one secret does not compromise the other.
 *
 * @param payload - Data to embed in the token
 * @returns A signed JWT refresh token string
 */
export function signRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwtRefreshExpiresIn as any,
    issuer: 'hrms-api',
    audience: 'hrms-client',
    subject: payload.userId,
  };

  return jwt.sign(payload, env.jwtRefreshSecret, options);
}

/**
 * Convenience function that generates both an access token
 * and a refresh token in one call.
 *
 * @param payload - User data to embed
 * @returns An object containing both tokens
 */
export function generateTokenPair(payload: TokenPayload): TokenPair {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

// ============================================
// Token Verification
// ============================================

/**
 * Verifies and decodes an access token.
 *
 * @param token - The raw JWT string
 * @returns The decoded payload if the token is valid
 * @throws JsonWebTokenError | TokenExpiredError if invalid / expired
 */
export function verifyAccessToken(token: string): DecodedToken {
  return jwt.verify(token, env.jwtSecret, {
    issuer: 'hrms-api',
    audience: 'hrms-client',
  }) as DecodedToken;
}

/**
 * Verifies and decodes a refresh token.
 *
 * @param token - The raw JWT refresh token string
 * @returns The decoded payload if the token is valid
 * @throws JsonWebTokenError | TokenExpiredError if invalid / expired
 */
export function verifyRefreshToken(token: string): DecodedToken {
  return jwt.verify(token, env.jwtRefreshSecret, {
    issuer: 'hrms-api',
    audience: 'hrms-client',
  }) as DecodedToken;
}

// ============================================
// Token Extraction
// ============================================

/**
 * Extracts the Bearer token from an Authorization header value.
 *
 * Expected format: "Bearer <token>"
 *
 * @param authHeader - The full Authorization header string
 * @returns The raw token string, or null if the header is malformed
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Handle both "Bearer <token>" and "bearer <token>"
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  const token = parts[1].trim();

  // Sanity check: a JWT has 3 dot-separated segments
  if (!token || token.split('.').length !== 3) {
    return null;
  }

  return token;
}

/**
 * Decodes a token WITHOUT verifying the signature.
 * Useful for inspecting an expired token's payload (e.g. to
 * identify the user before issuing a new token via refresh flow).
 *
 * ⚠️  Never trust the output of this function for authorization —
 *     always use verifyAccessToken / verifyRefreshToken instead.
 *
 * @param token - The raw JWT string
 * @returns The decoded payload, or null if the token cannot be decoded
 */
export function decodeTokenUnsafe(token: string): DecodedToken | null {
  try {
    const decoded = jwt.decode(token, { complete: false });
    if (!decoded || typeof decoded === 'string') {
      return null;
    }
    return decoded as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * Checks whether a given token is expired by decoding it
 * (without full verification) and comparing the `exp` claim
 * against the current time.
 *
 * @param token - The raw JWT string
 * @returns true if the token is expired or cannot be decoded
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeTokenUnsafe(token);

  if (!decoded || !decoded.exp) {
    return true;
  }

  // `exp` is in seconds; Date.now() is in milliseconds
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return decoded.exp < nowInSeconds;
}

/**
 * Computes the remaining lifetime of a token in seconds.
 *
 * @param token - The raw JWT string
 * @returns Seconds until expiry, or 0 if already expired / invalid
 */
export function tokenTTL(token: string): number {
  const decoded = decodeTokenUnsafe(token);

  if (!decoded || !decoded.exp) {
    return 0;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const remaining = decoded.exp - nowInSeconds;

  return remaining > 0 ? remaining : 0;
}
