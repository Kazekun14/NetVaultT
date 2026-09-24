import { Router } from 'express';
import { query, queryOne, execute, transaction } from '../db/index.js';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { hashPassword } from '../services/password.service.js';
import { logAudit } from '../services/audit.service.js';
import crypto from 'crypto';

const router = Router();

// List Users
router.get('/', requireAuth, requirePermission('users.view'), (req: AuthRequest, res) => {
  const { search, status, roleId } = req.query;

  let whereClauses = ['1=1'];
  const params: any[] = [];

  if (status) {
    whereClauses.push('u.status = ?');
    params.push(status);
  }

  if (roleId) {
    whereClauses.push('ur.role_id = ?');
    params.push(roleId);
  }

  if (search) {
    whereClauses.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const whereSql = whereClauses.join(' AND ');

  const users = query(
    `SELECT DISTINCT u.id, u.first_name, u.last_name, u.username, u.email, u.status, u.last_login_at, u.last_login_ip, u.created_at, u.updated_at
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     WHERE ${whereSql}
     ORDER BY u.created_at DESC`,
    params
  );

  const formattedUsers = users.map((u) => {
    const roles = query<{ id: string; name: string }>(
      `SELECT r.id, r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?`,
      [u.id]
    );
    return { ...u, roles };
  });

  res.json({ success: true, users: formattedUsers });
});

// Create User
router.post('/', requireAuth, requirePermission('users.create'), async (req: AuthRequest, res) => {
  const { first_name, last_name, username, email, password, role_id, status = 'ACTIVE' } = req.body;

  if (!first_name || !last_name || !username || !email || !password || !role_id) {
    return res.status(400).json({ success: false, message: 'First name, last name, username, email, password, and role are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username.trim(), email.trim()]);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Username or email already exists.' });
  }

  const role = queryOne<{ id: string }>('SELECT id FROM roles WHERE id = ?', [role_id]);
  if (!role) {
    return res.status(404).json({ success: false, message: 'Selected role not found.' });
  }

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  transaction(() => {
    execute(
      `INSERT INTO users (id, first_name, last_name, username, email, password_hash, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, first_name.trim(), last_name.trim(), username.trim(), email.trim(), passwordHash, status, now, now]
    );

    execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [id, role_id]);
  });

  logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'USER_CREATED',
    resourceType: 'USER',
    resourceId: id,
    resourceName: username,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, message: 'User created successfully.', userId: id });
});

// Update User
router.patch('/:id', requireAuth, requirePermission('users.update'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { first_name, last_name, email, role_id, status } = req.body;

  const existing = queryOne<{ id: string; username: string; status: string }>('SELECT id, username, status FROM users WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  // Prevent disabling the final active Super Administrator
  if (status === 'DISABLED' && existing.status === 'ACTIVE') {
    const superAdminRole = queryOne<{ id: string }>('SELECT id FROM roles WHERE name = ?', ['Super Administrator']);
    if (superAdminRole) {
      const activeSuperAdmins = query<{ user_id: string }>(
        `SELECT ur.user_id
         FROM user_roles ur
         JOIN users u ON ur.user_id = u.id
         WHERE ur.role_id = ? AND u.status = 'ACTIVE'`,
        [superAdminRole.id]
      );

      if (activeSuperAdmins.length <= 1 && activeSuperAdmins.some((sa) => sa.user_id === id)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot disable the final active Super Administrator account.',
        });
      }
    }
  }

  const now = new Date().toISOString();

  transaction(() => {
    execute(
      `UPDATE users SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = COALESCE(?, email),
        status = COALESCE(?, status),
        updated_at = ?
       WHERE id = ?`,
      [first_name?.trim() || null, last_name?.trim() || null, email?.trim() || null, status || null, now, id]
    );

    if (role_id) {
      execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
      execute('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [id, role_id]);
    }
  });

  logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'USER_UPDATED',
    resourceType: 'USER',
    resourceId: id,
    resourceName: existing.username,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'User updated successfully.' });
});

// Reset User Password
router.post('/:id/reset-password', requireAuth, requirePermission('users.update'), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
  }

  const existing = queryOne<{ id: string; username: string }>('SELECT id, username FROM users WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const passwordHash = await hashPassword(newPassword);
  execute('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, new Date().toISOString(), id]);

  logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'USER_UPDATED',
    resourceType: 'USER',
    resourceId: id,
    resourceName: existing.username,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { action: 'Password reset' },
  });

  res.json({ success: true, message: 'User password reset successfully.' });
});

export default router;

