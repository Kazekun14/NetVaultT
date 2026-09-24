import { describe, it, expect, beforeAll } from 'vitest';
import { initDb, execute, queryOne, query } from '../server/db/index.js';
import { encryptSecret } from '../server/services/encryption.service.js';
import { logAudit } from '../server/services/audit.service.js';

describe('Credential Vault & Audit Logging Integration', () => {
  beforeAll(() => {
    process.env.NETVAULT_MASTER_KEY = '4a8f9c1e2b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f';
    initDb();
  });

  it('should store encrypted credentials in DB without plain text secrets', () => {
    const rawPass = 'SecretDevicePassword!99';
    const encrypted = encryptSecret(rawPass);

    execute(
      `INSERT INTO credentials (
        id, device_id, credential_name, username, encrypted_password, encryption_iv, authentication_tag,
        encryption_version, protocol, port, privilege_level, password_changed_at, rotation_interval_days, next_rotation_at,
        status, created_at, updated_at
      ) VALUES ('test-cred-1', 'test-dev-1', 'SSH Admin', 'root', ?, ?, ?, 1, 'SSH', 22, 'ADMIN', ?, 90, ?, 'ACTIVE', ?, ?)`,
      [
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );

    const credDb = queryOne<{ encrypted_password: string }>('SELECT encrypted_password FROM credentials WHERE id = ?', ['test-cred-1']);
    expect(credDb).toBeDefined();
    expect(credDb?.encrypted_password).not.toBe(rawPass);
    expect(credDb?.encrypted_password).toBe(encrypted.ciphertext);
  });

  it('should write audit log entries when reveal and copy actions occur', () => {
    logAudit({
      userId: 'test-user-123',
      usernameSnapshot: 'admin',
      action: 'CREDENTIAL_REVEALED',
      resourceType: 'CREDENTIAL',
      resourceId: 'test-cred-1',
      resourceName: 'SSH Admin (root)',
      deviceId: 'test-dev-1',
      ipAddress: '192.168.1.50',
    });

    const logs = query<{ action: string; username_snapshot: string }>(
      'SELECT action, username_snapshot FROM audit_logs WHERE action = ? AND user_id = ?',
      ['CREDENTIAL_REVEALED', 'test-user-123']
    );

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('CREDENTIAL_REVEALED');
    expect(logs[0].username_snapshot).toBe('admin');
  });
});

