// ============================================
// Password Hashing Utilities
// ============================================
// Provides helper functions for hashing and comparing passwords
// using bcryptjs. These are used during registration, login,
// and password change operations.

import bcrypt from 'bcryptjs';

import { env } from '../config/env';

/**
 * Hashes a plain-text password using bcrypt.
 *
 * The salt rounds (work factor) are configured via the
 * BCRYPT_SALT_ROUNDS environment variable. Higher values
 * are more secure but slower. The default is 12.
 *
 * @param plainPassword - The raw password string to hash
 * @returns A promise that resolves to the hashed password string
 *
 * @example
 * ```ts
 * const hashed = await hashPassword('mySecurePassword123');
 * // => "$2a$12$..."
 * ```
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = env.bcryptSaltRounds;
  const salt = await bcrypt.genSalt(saltRounds);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);
  return hashedPassword;
}

/**
 * Compares a plain-text password against a bcrypt hash.
 *
 * This is a constant-time comparison (provided by bcrypt) to
 * prevent timing attacks.
 *
 * @param plainPassword  - The raw password string provided by the user
 * @param hashedPassword - The stored bcrypt hash from the database
 * @returns A promise that resolves to true if the password matches, false otherwise
 *
 * @example
 * ```ts
 * const isValid = await comparePassword('mySecurePassword123', user.password);
 * if (!isValid) {
 *   throw new ApiError(401, 'Invalid credentials');
 * }
 * ```
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Validates whether a plain-text password meets the minimum
 * strength requirements before hashing. This is a secondary
 * check (the primary validation happens via Zod schemas)
 * useful for programmatic / service-layer validation.
 *
 * Requirements:
 *   - At least 8 characters
 *   - Contains at least one lowercase letter
 *   - Contains at least one uppercase letter
 *   - Contains at least one digit
 *
 * @param password - The raw password string to validate
 * @returns An object with `isValid` and optional `errors` array
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generates a random temporary password that satisfies the
 * strength requirements. Useful for admin-initiated password
 * resets or new employee account creation.
 *
 * The generated password will be 16 characters long and contain
 * a mix of uppercase, lowercase, digits, and special characters.
 *
 * @returns A randomly generated password string
 *
 * @example
 * ```ts
 * const tempPassword = generateTemporaryPassword();
 * // => "aB3$kL9mNp2#xQ7w"
 * ```
 */
export function generateTemporaryPassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%&*?';
  const allChars = lowercase + uppercase + digits + special;

  // Ensure at least one character from each required category
  const requiredChars = [
    lowercase[Math.floor(Math.random() * lowercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  // Fill the remaining length with random characters from all categories
  const remainingLength = 12;
  const randomChars: string[] = [];

  for (let i = 0; i < remainingLength; i++) {
    randomChars.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Combine required and random characters, then shuffle
  const combined = [...requiredChars, ...randomChars];

  // Fisher-Yates shuffle for uniform randomness
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}

export default {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateTemporaryPassword,
};
