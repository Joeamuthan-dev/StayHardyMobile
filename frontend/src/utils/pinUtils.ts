// src/utils/pinUtils.ts
import bcrypt from 'bcryptjs';

export const isHashed = (value: string): boolean =>
  value.startsWith('$2a$') || value.startsWith('$2b$');

export const hashPin = async (pin: string): Promise<string> => {
  return bcrypt.hash(pin, 10);
};

export const verifyPin = async (
  plain: string,
  hashed: string
): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};
