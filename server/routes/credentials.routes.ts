import { Router } from 'express';
import { query, queryOne, execute } from '../db/index.js';
import { requireAuth, requirePermission, requireReAuthIfConfigured, AuthRequest } from '../middleware/auth.middleware.js';
import { revealLimiter } from '../middleware/rateLimit.middleware.js';
import { encryptSecret, decryptSecret } from '../services/encryption.service.js';
import { logAudit } from '../services/audit.service.js';
import crypto from 'crypto';

const router = Router();

// Helper to calculate rotation status
function getRotationStatus(nextRotationAtStr: string, dueSoonDays = 14): 'CURRENT' | 'DUE_SOON' | 'OVERDUE' {
  const now = new Date().getTime();
  const nextRot = new Date(nextRotationAtStr).getTime();
  const diffDays = (nextRot - now) / (1000 * 3600 * 24);

  if (diffDays < 0) return 'OVERDUE';
  if (diffDays <= dueSoonDays) return 'DUE_SOON';
  return 'CURRENT';
}

// Helper to calculate password age in days
function getPasswordAgeDays(changedAtStr: string): number {
  const now = new Date().getTime();
  const changedAt = new Date(changedAtStr).getTime();
  return Math.max(0, Math.floor((now - changedAt) / (1000 * 3600 * 24)));
}

// Global Credentials List (No Passwords)
router.get('/', requireAuth, requirePermission('credentials.view'), (req: AuthRequest, res) => {
  const { siteId, deviceTypeId, protocol, privilege, rotationStatus, status, search, page = '1', limit = '10' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = ['1=1'];
  const params: any[] = [];

  if (siteId) {
    whereClauses.push('d.site_id = ?');
    params.push(siteId);
  }

  if (deviceTypeId) {
    whereClauses.push('d.device_type_id = ?');
    params.push(deviceTypeId);
  }

  if (protocol) {
    whereClauses.push('c.protocol = ?');
    params.push(protocol);
  }

  if (privilege) {
    whereClauses.push('c.privilege_level = ?');
    params.push(privilege);
  }

  if (status) {
    whereClauses.push('c.status = ?');
    params.push(status);
  }

  if (search) {
    whereClauses.push('(c.credential_name LIKE ? OR c.username LIKE ? OR d.device_name LIKE ? OR d.management_ip LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const whereSql = whereClauses.join(' AND ');

  const items = query(
    `SELECT c.id, c.device_id, c.credential_name, c.username, c.protocol, c.port, c.login_url,
            c.privilege_level, c.description, c.password_changed_at, c.rotation_interval_days,
            c.next_rotation_at, c.status, c.created_at, c.updated_at,
            d.device_name, d.management_ip, s.name as site_name, s.code as site_code,
            dt.name as device_type_name
     FROM credentials c
     JOIN devices d ON c.device_id = d.id
     JOIN sites s ON d.site_id = s.id
     JOIN device_types dt ON d.device_type_id = dt.id
     WHERE ${whereSql}
     ORDER BY d.device_name ASC, c.credential_name ASC`,
    params
  );

  // Filter by rotation status in memory if provided
  let filtered = items.map((c) => ({
    ...c,
    passwordAgeDays: getPasswordAgeDays(c.password_changed_at),
    rotationStatus: getRotationStatus(c.next_rotation_at),
    passwordMasked: '••••••••••••',
  }));

  if (rotationStatus) {
    filtered = filtered.filter((c) => c.rotationStatus === rotationStatus);
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limitNum);

  res.json({
    success: true,
    credentials: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// Credentials for a specific device
router.get('/device/:deviceId', requireAuth, requirePermission('credentials.view'), (req: AuthRequest, res) => {
  const { deviceId } = req.params;

  const credentials = query(
    `SELECT id, device_id, credential_name, username, protocol, port, login_url, privilege_level,
            description, password_changed_at, rotation_interval_days, next_rotation_at, status,
            created_at, updated_at
     FROM credentials
     WHERE device_id = ?
     ORDER BY credential_name ASC`,
    [deviceId]
  );

  const formatted = credentials.map((c) => ({
    ...c,
    passwordAgeDays: getPasswordAgeDays(c.password_changed_at),
    rotationStatus: getRotationStatus(c.next_rotation_at),
    passwordMasked: '••••••••••••',
  }));

  res.json({ success: true, credentials: formatted });
});

// Create Credential
router.post('/device/:deviceId', requireAuth, requirePermission('credentials.create'), (req: AuthRequest, res) => {
  const { deviceId } = req.params;
  const {
    credential_name,
    username,
    password,
    confirmPassword,
    protocol,
    port,
    login_url,
    privilege_level,
    rotation_interval_days = 90,
    description,
  } = req.body;

  const device = queryOne<{ id: string; device_name: string }>('SELECT id, device_name FROM devices WHERE id = ?', [deviceId]);
  if (!device) {
    return res.status(404).json({ success: false, message: 'Device not found.' });
  }

  if (!credential_name || !username || !password) {
    return res.status(400).json({ success: false, message: 'Credential name, username, and password are required.' });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  }

  if (port !== undefined && port !== null && port !== '') {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return res.status(400).json({ success: false, message: 'Port must be between 1 and 65535.' });
    }
  }

  const encrypted = encryptSecret(password);
  const now = new Date();
  const nowStr = now.toISOString();

  const rotInterval = Math.max(1, parseInt(rotation_interval_days as any, 10) || 90);
  const nextRotDate = new Date(now.getTime() + rotInterval * 86400000).toISOString();
  const id = crypto.randomUUID();

  execute(
    `INSERT INTO credentials (
      id, device_id, credential_name, username, encrypted_password, encryption_iv, authentication_tag,
      encryption_version, protocol, port, login_url, privilege_level, description, password_changed_at,
      rotation_interval_days, next_rotation_at, status, created_by, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      deviceId,
      credential_name.trim(),
      username.trim(),
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      encrypted.version,
      protocol || 'HTTPS',
      port ? parseInt(port, 10) : null,
      login_url || null,
      privilege_level || 'ADMIN',
      description || null,
      nowStr,
      rotInterval,
      nextRotDate,
      'ACTIVE',
      req.user!.id,
      req.user!.id,
      nowStr,
      nowStr,
    ]
  );

  logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'CREDENTIAL_CREATED',
    resourceType: 'CREDENTIAL',
    resourceId: id,
    resourceName: `${credential_name} (${username})`,
    deviceId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, message: 'Credential added successfully.', credentialId: id });
});

// Update Credential Metadata (No password change)
router.patch('/:id', requireAuth, requirePermission('credentials.update'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const existing = queryOne<{ id: string; device_id: string; credential_name: string; password_changed_at: string }>(
    'SELECT id, device_id, credential_name, password_changed_at FROM credentials WHERE id = ?',
    [id]
  );

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Credential not found.' });
  }

  const { credential_name, username, protocol, port, login_url, privilege_level, rotation_interval_days, description, status } =
    req.body;

  const nowStr = new Date().toISOString();

  let nextRotDateSql = 'next_rotation_at';
  let rotDays = rotation_interval_days;

  if (rotation_interval_days) {
    const rotInterval = Math.max(1, parseInt(rotation_interval_days as any, 10) || 90);
    const lastChanged = new Date(existing.password_changed_at).getTime();
    nextRotDateSql = `'${new Date(lastChanged + rotInterval * 86400000).toISOString()}'`;
    rotDays = rotInterval;
  }

  execute(
    `UPDATE credentials SET
      credential_name = COALESCE(?, credential_name),
      username = COALESCE(?, username),
      protocol = COALESCE(?, protocol),
      port = COALESCE(?, port),
      login_url = COALESCE(?, login_url),
      privilege_level = COALESCE(?, privilege_level),
      rotation_interval_days = COALESCE(?, rotation_interval_days),
      next_rotation_at = ${nextRotDateSql},
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      updated_by = ?,
      updated_at = ?
     WHERE id = ?`,
    [
      credential_name?.trim() || null,
      username?.trim() || null,
      protocol || null,
      port !== undefined ? port : null,
      login_url || null,
      privilege_level || null,
      rotDays || null,
      description !== undefined ? description : null,
      status || null,
      req.user!.id,
      nowStr,
      id,
    ]
  );

  logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'CREDENTIAL_UPDATED',
    resourceType: 'CREDENTIAL',
    resourceId: id,
    resourceName: credential_name || existing.credential_name,
    deviceId: existing.device_id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Credential metadata updated successfully.' });
});

// Change Password
router.post('/:id/change-password', requireAuth, requirePermission('credentials.update'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { newPassword, confirmNewPassword } = req.body;

  const existing = queryOne<{ id: string; device_id: string; credential_name: string; rotation_interval_days: number }>(
    'SELECT id, device_id, credential_name, rotation_interval_days FROM credentials WHERE id = ?',
    [id]
  );

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Credential not found.' });
  }

  if (!newPassword) {
    return res.status(400).json({ success: false, message: 'New password is required.' });
  }

  if (confirmNewPassword !== undefined && newPassword !== confirmNewPassword) {
    return res.status(400).json({ success: false, message: 'New passwords do not match.' });
  }

  const encrypted = encryptSecret(newPassword);
  const now = new Date();
  const nowStr = now.toISOString();

  const nextRotDate = new Date(now.getTime() + existing.rotation_interval_days * 86400000).toISOString();

  execute(
    `UPDATE credentials SET
      encrypted_password = ?,
      encryption_iv = ?,
      authentication_tag = ?,
      encryption_version = ?,
      password_changed_at = ?,
      next_rotation_at = ?,
      updated_by = ?,
      updated_at = ?
     WHERE id = ?`,
    [
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      encrypted.version,
      nowStr,
      nextRotDate,
      req.user!.id,
      nowStr,
      id,
    ]
  );

  logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'CREDENTIAL_PASSWORD_CHANGED',
    resourceType: 'CREDENTIAL',
    resourceId: id,
    resourceName: existing.credential_name,
    deviceId: existing.device_id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Credential password updated successfully.' });
});

// Reveal Password Endpoint
router.post(
  '/:id/reveal',
  requireAuth,
  requirePermission('credentials.reveal'),
  requireReAuthIfConfigured,
  revealLimiter,
  (req: AuthRequest, res) => {
    const { id } = req.params;

    const cred = queryOne<{
      id: string;
      device_id: string;
      credential_name: string;
      username: string;
      encrypted_password: string;
      encryption_iv: string;
      authentication_tag: string;
      device_name: string;
    }>(
      `SELECT c.*, d.device_name
       FROM credentials c
       JOIN devices d ON c.device_id = d.id
       WHERE c.id = ?`,
      [id]
    );

    if (!cred) {
      return res.status(404).json({ success: false, message: 'Credential not found.' });
    }

    try {
      const plaintextPassword = decryptSecret(cred.encrypted_password, cred.encryption_iv, cred.authentication_tag);

      logAudit({
        userId: req.user!.id,
        usernameSnapshot: req.user!.username,
        action: 'CREDENTIAL_REVEALED',
        resourceType: 'CREDENTIAL',
        resourceId: id,
        resourceName: `${cred.credential_name} (${cred.username})`,
        deviceId: cred.device_id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Get reveal timeout setting from DB
      const revealTimeoutSetting = queryOne<{ setting_value: string }>(
        'SELECT setting_value FROM system_settings WHERE setting_key = ?',
        ['reveal_timeout']
      );

      const revealTimeoutSeconds = parseInt(revealTimeoutSetting?.setting_value || '20', 10);

      res.json({
        success: true,
        password: plaintextPassword,
        autoHideSeconds: revealTimeoutSeconds,
      });
    } catch (err: any) {
      console.error('Decryption failure for credential ID:', id, err);
      res.status(500).json({ success: false, message: 'Failed to decrypt credential securely.' });
    }
  }
);

// Copy Password Endpoint
router.post(
  '/:id/copy-access',
  requireAuth,
  requirePermission('credentials.copy'),
  revealLimiter,
  (req: AuthRequest, res) => {
    const { id } = req.params;

    const cred = queryOne<{
      id: string;
      device_id: string;
      credential_name: string;
      username: string;
      encrypted_password: string;
      encryption_iv: string;
      authentication_tag: string;
    }>(
      `SELECT c.*
       FROM credentials c
       WHERE c.id = ?`,
      [id]
    );

    if (!cred) {
      return res.status(404).json({ success: false, message: 'Credential not found.' });
    }

    try {
      const plaintextPassword = decryptSecret(cred.encrypted_password, cred.encryption_iv, cred.authentication_tag);

      logAudit({
        userId: req.user!.id,
        usernameSnapshot: req.user!.username,
        action: 'CREDENTIAL_COPIED',
        resourceType: 'CREDENTIAL',
        resourceId: id,
        resourceName: `${cred.credential_name} (${cred.username})`,
        deviceId: cred.device_id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        password: plaintextPassword,
      });
    } catch (err: any) {
      console.error('Decryption failure during copy:', id, err);
      res.status(500).json({ success: false, message: 'Failed to decrypt credential securely.' });
    }
  }
);

// Disable Credential
router.post('/:id/disable', requireAuth, requirePermission('credentials.disable'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const existing = queryOne<{ id: string; device_id: string; credential_name: string }>(
    'SELECT id, device_id, credential_name FROM credentials WHERE id = ?',
    [id]
  );

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Credential not found.' });
  }

  const nowStr = new Date().toISOString();
  execute('UPDATE credentials SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?', ['DISABLED', req.user!.id, nowStr, id]);

  logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'CREDENTIAL_DISABLED',
    resourceType: 'CREDENTIAL',
    resourceId: id,
    resourceName: existing.credential_name,
    deviceId: existing.device_id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Credential disabled successfully.' });
});

export default router;

