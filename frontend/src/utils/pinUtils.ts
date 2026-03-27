// src/utils/pinUtils.ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Pad PIN for Supabase Auth (min 6 chars required)
// Must be used consistently in signup AND login
export const padPinForAuth = (pin: string): string => {
  return 'SH' + pin;
  // "1234" → "SH1234" (6 chars) ✅
  // Consistent prefix ensures signup + login match
};

// Hash PIN for database storage
// NEVER use this for Supabase Auth password
export const hashPin = async (
  pin: string
): Promise<string> => {
  return bcrypt.hash(pin, SALT_ROUNDS);
};

// Verify PIN against stored hash
export const verifyPin = async (
  plainPin: string,
  hashedPin: string
): Promise<boolean> => {
  return bcrypt.compare(plainPin, hashedPin);
};

// Check if value is already hashed
export const isHashed = (value: string): boolean =>
  value.startsWith('$2a$') ||
  value.startsWith('$2b$');
