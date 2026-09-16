import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config/env.js';

/** Production-oriented password policy for create/update (not login). */
export const passwordPolicySchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number');

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.bcryptRounds);
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

export function looksLikeBcryptHash(value: string): boolean {
  return /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}
