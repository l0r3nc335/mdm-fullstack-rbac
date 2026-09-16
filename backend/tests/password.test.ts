import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  looksLikeBcryptHash,
  passwordPolicySchema,
  verifyPassword,
} from '../src/services/password.js';

describe('password service', () => {
  it('hashes passwords with bcrypt and never stores plaintext', async () => {
    const plain = 'Password123!';
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(looksLikeBcryptHash(hash)).toBe(true);
    expect(await verifyPassword(plain, hash)).toBe(true);
    expect(await verifyPassword('WrongPass1!', hash)).toBe(false);
  });

  it('enforces a production-oriented password policy', () => {
    expect(passwordPolicySchema.safeParse('short').success).toBe(false);
    expect(passwordPolicySchema.safeParse('alllowercase1').success).toBe(false);
    expect(passwordPolicySchema.safeParse('ALLUPPERCASE1').success).toBe(false);
    expect(passwordPolicySchema.safeParse('NoDigitsHere').success).toBe(false);
    expect(passwordPolicySchema.safeParse('Password123!').success).toBe(true);
  });
});
