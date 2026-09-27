import { asyncHandler } from '../middleware/async.middleware.js';
import { Router } from 'express';
import { query, queryOne, execute, transaction } from '../db/index.js';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import crypto from 'crypto';

const router = Router();

// List Roles
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const roles = await query('SELECT * FROM roles ORDER BY name ASC');

  const formattedRoles = [];
  for (const r of roles) {
    const permissions = await query<{ id: string; code: string; name: string }>(
      `SELECT p.id, p.code, p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [r.id]
    );

    const userCountRow = await queryOne<{ count: number }>('SELECT COUNT(*)::int as count FROM user_roles WHERE role_id = $1', [r.id]);

    formattedRoles.push({
      ...r,
      permissions,
      userCount: userCountRow?.count || 0,
    });
  }

  res.json({ success: true, roles: formattedRoles });
}));

// List Permissions
router.get('/permissions', requireAuth, asyncHandler(async (req, res) => {
  const permissions = await query('SELECT * FROM permissions ORDER BY code ASC');
  res.json({ success: true, permissions });
}));

// Create Role
router.post('/', requireAuth, requirePermission('roles.manage'), asyncHandler(async (req: AuthRequest, res) => {
  const { name, description, permissionCodes } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Role name is required.' });
  }

  const existing = await queryOne('SELECT id FROM roles WHERE name = $1', [name.trim()]);
  if (existing) {
    return res.status(409).json({ success: false, message: `Role '${name}' already exists.` });
  }

  const roleId = crypto.randomUUID();
  const now = new Date().toISOString();

  await transaction(async () => {
    await execute(
      'INSERT INTO roles (id, name, description, is_system_role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [roleId, name.trim(), description || null, 0, now, now]
    );

    if (Array.isArray(permissionCodes)) {
      for (const code of permissionCodes) {
        const perm = await queryOne<{ id: string }>('SELECT id FROM permissions WHERE code = $1', [code]);
        if (perm) {
          await execute('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [roleId, perm.id]);
        }
      }
    }
  });

  await logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'ROLE_CHANGED',
    resourceType: 'ROLE',
    resourceId: roleId,
    resourceName: name,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, message: 'Role created successfully.', roleId });
}));

// Update Role Permissions
router.patch('/:id', requireAuth, requirePermission('roles.manage'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, description, permissionCodes } = req.body;

  const existing = await queryOne<{ id: string; name: string; is_system_role: number }>('SELECT id, name, is_system_role FROM roles WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Role not found.' });
  }

  const now = new Date().toISOString();

  await transaction(async () => {
    await execute(
      `UPDATE roles SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        updated_at = $3
       WHERE id = $4`,
      [name?.trim() || null, description !== undefined ? description : null, now, id]
    );

    if (Array.isArray(permissionCodes)) {
      await execute('DELETE FROM role_permissions WHERE role_id = $1', [id]);
      for (const code of permissionCodes) {
        const perm = await queryOne<{ id: string }>('SELECT id FROM permissions WHERE code = $1', [code]);
        if (perm) {
          await execute('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [id, perm.id]);
        }
      }
    }
  });

  await logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'PERMISSION_CHANGED',
    resourceType: 'ROLE',
    resourceId: id,
    resourceName: name || existing.name,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Role permissions updated successfully.' });
}));

export default router;

