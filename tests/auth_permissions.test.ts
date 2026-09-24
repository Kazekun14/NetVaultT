import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../server/services/password.service.js';

describe('User Authentication & Password Hashing', () => {
  it('should hash user login passwords with bcrypt and compare correctly', async () => {
    const rawPassword = 'UserAdminPass2026!';
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const isValid = await comparePassword(rawPassword, hash);
    expect(isValid).toBe(true);

    const isInvalid = await comparePassword('WrongPassword123', hash);
    expect(isInvalid).toBe(false);
  });
});

