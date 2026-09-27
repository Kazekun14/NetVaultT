import { asyncHandler } from '../middleware/async.middleware.js';
import { Router } from 'express';
import { query, queryOne, execute } from '../db/index.js';
import { comparePassword, hashPassword } from '../services/password.service.js';
import { logAudit } from '../services/audit.service.js';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware.js';
import { loginLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  if (username.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please enter a valid username. Email addresses are not supported.' });
  }

  const user = await queryOne<{
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password_hash: string;
    status: string;
  }>('SELECT id, first_name, last_name, username, email, password_hash, status FROM users WHERE username = $1', [
    username.trim(),
  ]);

  if (!user || !(await comparePassword(password, user.password_hash))) {
    await logAudit({
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
    await logAudit({
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
  await execute('UPDATE users SET last_login_at = $1, last_login_ip = $2 WHERE id = $3', [now, ipAddress, user.id]);

  // Set session
  (req.session as any).userId = user.id;

  // Fetch permissions
  const permsRows = await query<{ code: string }>(
    `SELECT DISTINCT p.code
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     JOIN user_roles ur ON rp.role_id = ur.role_id
     WHERE ur.user_id = $1`,
    [user.id]
  );

  const rolesRows = await query<{ id: string; name: string }>(
    `SELECT r.id, r.name
     FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [user.id]
  );

  await logAudit({
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
}));

router.post('/logout', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  if (req.user) {
    await logAudit({
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
}));

router.get('/me', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const user = req.user!;
  const rolesRows = await query<{ id: string; name: string }>(
    `SELECT r.id, r.name
     FROM roles r
     JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
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
}));

router.post('/change-password', requireAuth, asyncHandler(async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
  }

  const userDb = await queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [req.user!.id]);
  if (!userDb || !(await comparePassword(currentPassword, userDb.password_hash))) {
    return res.status(400).json({ success: false, message: 'Incorrect current password.' });
  }

  const newHash = await hashPassword(newPassword);
  await execute('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [newHash, new Date().toISOString(), req.user!.id]);

  await logAudit({
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
}));

export default router;

