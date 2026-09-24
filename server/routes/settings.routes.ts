import { Router } from 'express';
import { query, queryOne, execute, transaction } from '../db/index.js';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const settingsRows = query<{ setting_key: string; setting_value: string; setting_type: string }>('SELECT * FROM system_settings');

  const settings: Record<string, any> = {};
  for (const row of settingsRows) {
    if (row.setting_type === 'number') {
      settings[row.setting_key] = parseFloat(row.setting_value);
    } else if (row.setting_type === 'boolean') {
      settings[row.setting_key] = row.setting_value === 'true';
    } else {
      settings[row.setting_key] = row.setting_value;
    }
  }

  res.json({ success: true, settings });
});

router.patch('/', requireAuth, requirePermission('settings.manage'), (req: AuthRequest, res) => {
  const updates: Record<string, any> = req.body;

  const allowedKeys = [
    'app_name',
    'organization_name',
    'timezone',
    'pagination_size',
    'session_timeout',
    'require_reauth_reveal',
    'reveal_timeout',
    'login_attempt_limit',
    'account_lock_duration',
    'default_rotation_days',
    'due_soon_threshold',
  ];

  const now = new Date().toISOString();

  transaction(() => {
    for (const [key, value] of Object.entries(updates)) {
      if (allowedKeys.includes(key) && value !== undefined) {
        const valStr = String(value);
        const existing = queryOne('SELECT id FROM system_settings WHERE setting_key = ?', [key]);
        if (existing) {
          execute('UPDATE system_settings SET setting_value = ?, updated_by = ?, updated_at = ? WHERE setting_key = ?', [
            valStr,
            req.user!.id,
            now,
            key,
          ]);
        }
      }
    }
  });

  logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'SETTINGS_CHANGED',
    resourceType: 'SETTINGS',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { updatedKeys: Object.keys(updates).filter((k) => allowedKeys.includes(k)) },
  });

  res.json({ success: true, message: 'System settings updated successfully.' });
});

export default router;

