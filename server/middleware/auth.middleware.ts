import { Request, Response, NextFunction } from 'express';
import { query, queryOne } from '../db/index.js';
import { comparePassword } from '../services/password.service.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    status: string;
    permissions: string[];
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthenticated. Session expired or missing.' });
  }

  const user = queryOne<{
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    status: string;
  }>('SELECT id, username, email, first_name, last_name, status FROM users WHERE id = ?', [userId]);

  if (!user || user.status !== 'ACTIVE') {
    (req.session as any).destroy(() => {});
    return res.status(401).json({ success: false, message: 'Account disabled or user not found.' });
  }

  // Fetch permissions
  const permsRows = query<{ code: string }>(
    `SELECT DISTINCT p.code
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     JOIN user_roles ur ON rp.role_id = ur.role_id
     WHERE ur.user_id = ?`,
    [userId]
  );

  req.user = {
    ...user,
    permissions: permsRows.map((r) => r.code),
  };

  next();
}

export function requirePermission(permissionCode: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    if (!req.user.permissions.includes(permissionCode)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Required permission '${permissionCode}' is missing.`,
      });
    }

    next();
  };
}

export async function requireReAuthIfConfigured(req: AuthRequest, res: Response, next: NextFunction) {
  const setting = queryOne<{ setting_value: string }>(
    'SELECT setting_value FROM system_settings WHERE setting_key = ?',
    ['require_reauth_reveal']
  );

  const isReAuthRequired = setting?.setting_value === 'true';

  if (isReAuthRequired) {
    const reAuthPass = req.headers['x-reauth-password'] || req.body?.reauthPassword;
    if (!reAuthPass) {
      return res.status(401).json({
        success: false,
        reauthRequired: true,
        message: 'Re-authentication required: Please provide your NetVaultT account password.',
      });
    }

    const userDb = queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [req.user!.id]);
    if (!userDb || !(await comparePassword(reAuthPass as string, userDb.password_hash))) {
      return res.status(401).json({
        success: false,
        reauthRequired: true,
        message: 'Re-authentication failed: Invalid account password.',
      });
    }
  }

  next();
}

