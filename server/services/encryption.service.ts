import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const MASTER_KEY_HEX = process.env.NETVAULT_MASTER_KEY;

/**
 * Validates the master encryption key configuration.
 * Throws a fatal error if missing or invalid.
 */
export function getMasterKey(): Buffer {
  if (!MASTER_KEY_HEX) {
    throw new Error('FATAL SECURITY ERROR: NETVAULT_MASTER_KEY environment variable is missing.');
  }

  const cleanHex = MASTER_KEY_HEX.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(cleanHex)) {
    throw new Error(
      'FATAL SECURITY ERROR: NETVAULT_MASTER_KEY must be a 64-character hexadecimal string (32 bytes).'
    );
  }

  return Buffer.from(cleanHex, 'hex');
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  version: number;
}

/**
 * Encrypts a secret using AES-256-GCM with a unique 96-bit (12-byte) IV.
 */
export function encryptSecret(plaintext: string): EncryptedData {
  if (typeof plaintext !== 'string') {
    throw new Error('Secret plaintext must be a string.');
  }

  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM

  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag,
    version: 1,
  };
}

/**
 * Decrypts a secret using AES-256-GCM and verifies the authentication tag.
 */
export function decryptSecret(ciphertext: string, ivHex: string, authTagHex: string): string {
  const masterKey = getMasterKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

