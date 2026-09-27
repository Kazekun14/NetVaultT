import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, getMasterKey } from '../server/services/encryption.service.js';

describe('AES-256-GCM Encryption Service', () => {
  it('should validate and extract a 32-byte master key from environment', () => {
    const key = getMasterKey();
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it('should successfully encrypt and decrypt a device credential secret', () => {
    const originalSecret = 'RouterAdminPassword2026!';
    const encrypted = encryptSecret(originalSecret);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.version).toBe(1);

    const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
    expect(decrypted).toBe(originalSecret);
  });

  it('should generate unique IVs for identical plaintext inputs', () => {
    const secret = 'SamePasswordValue123';
    const enc1 = encryptSecret(secret);
    const enc2 = encryptSecret(secret);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);

    // Both decrypt back to same original secret
    expect(decryptSecret(enc1.ciphertext, enc1.iv, enc1.authTag)).toBe(secret);
    expect(decryptSecret(enc2.ciphertext, enc2.iv, enc2.authTag)).toBe(secret);
  });

  it('should throw authentication error when ciphertext or authTag is tampered', () => {
    const secret = 'TamperTestPassword';
    const encrypted = encryptSecret(secret);

    // Tamper single hex character in ciphertext
    const tamperedCipher = encrypted.ciphertext.substring(0, encrypted.ciphertext.length - 1) + (encrypted.ciphertext.endsWith('0') ? '1' : '0');

    expect(() => {
      decryptSecret(tamperedCipher, encrypted.iv, encrypted.authTag);
    }).toThrow();
  });
});

