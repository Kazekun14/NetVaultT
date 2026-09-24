import { Router } from 'express';
import { query, queryOne, execute } from '../db/index.js';
import { comparePassword, hashPassword } from '../services/password.service.js';
import { logAudit } from '../services/audit.service.js';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { loginLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const user = queryOne<{
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password_hash: string;
    status: string;
  }>('SELECT id, first_name, last_name, username, email, password_hash, status FROM users WHERE username = ? OR email = ?', [
    username.trim(),
    username.trim(),
  ]);

  if (!user || !(await comparePassword(password, user.password_hash))) {
    logAudit({
      usernameSnapshot: username,
      action: 'LOGIN_FAILURE',
      resourceType: 'AUTH',
      ipAddress,
      userAgent,
      metadata: { reason: 'Invalid credentials' },
    });

    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }

  if (user.status !== 'ACTIVE') {
    logAudit({
      userId: user.id,
      usernameSnapshot: user.username,
      action: 'LOGIN_FAILURE',
      resourceType: 'AUTH',
      ipAddress,
      userAgent,
      metadata: { reason: 'Account disabled' },
    });

    return res.status(403).json({ success: false, message: 'Account is disabled. Please contact administrator.' });
  }

  // Update last login
  const now = new Date().toISOString();
  execute('UPDATE users SET last_login_at = ?, last_login_ip = ? WHERE id = ?', [now, ipAddress, user.id]);

  // Set session
  (req.session as any).userId = user.id;

  // Fetch permissions
  const permsRows = query<{ code: string }>(
    `SELECT DISTINCT p.code
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     JOIN user_roles ur ON rp.role_id = ur.role_id
     WHERE ur.user_id = ?`,
    [user.id]
  );

  const rolesRows = query<{ id: string; name: string }>(
    `SELECT r.id, r.name
     FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [user.id]
  );

  logAudit({
    userId: user.id,
    usernameSnapshot: user.username,
    action: 'LOGIN_SUCCESS',
    resourceType: 'AUTH',
    ipAddress,
    userAgent,
  });

  return res.json({
    success: true,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      email: user.email,
      status: user.status,
      roles: rolesRows,
      permissions: permsRows.map((r) => r.code),
    },
  });
});

router.post('/logout', requireAuth, (req: AuthRequest, res) => {
  if (req.user) {
    logAudit({
      userId: req.user.id,
      usernameSnapshot: req.user.username,
      action: 'LOGOUT',
      resourceType: 'AUTH',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to destroy session.' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  const user = req.user!;
  const rolesRows = query<{ id: string; name: string }>(
    `SELECT r.id, r.name
     FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [user.id]
  );

  res.json({
    success: true,
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      email: user.email,
      status: user.status,
      roles: rolesRows,
      permissions: user.permissions,
    },
  });
});

router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
  }

  const userDb = queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [req.user!.id]);
  if (!userDb || !(await comparePassword(currentPassword, userDb.password_hash))) {
    return res.status(400).json({ success: false, message: 'Incorrect current password.' });
  }

  const newHash = await hashPassword(newPassword);
  execute('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [newHash, new Date().toISOString(), req.user!.id]);

  logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'USER_UPDATED',
    resourceType: 'USER',
    resourceId: req.user!.id,
    resourceName: req.user!.username,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { change: 'Password update' },
  });

  res.json({ success: true, message: 'Password changed successfully.' });
});

export default router;

