import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/auth';

describe('Authentication Logic', () => {
  const password = 'SecurePassword123!';

  it('should hash a password into a string that is different from the original', async () => {
    const hashed = await hashPassword(password);
    expect(hashed).not.toBe(password);
    expect(hashed.length).toBeGreaterThan(0);
  });

  it('should correctly verify a password against its hash', async () => {
    const hashed = await hashPassword(password);
    const isValid = await verifyPassword(password, hashed);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password against a hash', async () => {
    const hashed = await hashPassword(password);
    const isValid = await verifyPassword('wrongpassword', hashed);
    expect(isValid).toBe(false);
  });
});
