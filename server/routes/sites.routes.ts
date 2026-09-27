import { asyncHandler } from '../middleware/async.middleware.js';
import { Router } from 'express';
import { query, queryOne, execute } from '../db/index.js';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import crypto from 'crypto';

const router = Router();

router.get('/', requireAuth, requirePermission('sites.view'), asyncHandler(async (req: AuthRequest, res) => {
  const { search, status } = req.query;

  let sql = 'SELECT * FROM sites WHERE 1=1';
  const params: any[] = [];

  if (status) {
    sql += ` AND status = $${params.length + 1}`;
    params.push(status);
  }

  if (search) {
    sql += ` AND (code ILIKE $${params.length + 1} OR name ILIKE $${params.length + 2} OR description ILIKE $${params.length + 3} OR address ILIKE $${params.length + 4})`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  sql += ' ORDER BY name ASC';
  const sites = await query(sql, params);

  res.json({ success: true, sites });
}));

router.get('/:id', requireAuth, requirePermission('sites.view'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const site = await queryOne('SELECT * FROM sites WHERE id = $1', [id]);

  if (!site) {
    return res.status(404).json({ success: false, message: 'Site not found.' });
  }

  const devices = await query(
    `SELECT d.*, dt.name as device_type_name, dt.code as device_type_code
     FROM devices d
     JOIN device_types dt ON d.device_type_id = dt.id
     WHERE d.site_id = $1
     ORDER BY d.device_name ASC`,
    [id]
  );

  res.json({ success: true, site: { ...site, devices } });
}));

router.post('/', requireAuth, requirePermission('sites.create'), asyncHandler(async (req: AuthRequest, res) => {
  const { code, name, description, address, contact_person, contact_number, notes, status } = req.body;

  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Site code and site name are required.' });
  }

  const existing = await queryOne('SELECT id FROM sites WHERE code = $1', [code.trim().toUpperCase()]);
  if (existing) {
    return res.status(409).json({ success: false, message: `Site code '${code}' already exists.` });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const siteCode = code.trim().toUpperCase();

  await execute(
    `INSERT INTO sites (id, code, name, description, address, contact_person, contact_number, status, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      id,
      siteCode,
      name.trim(),
      description || null,
      address || null,
      contact_person || null,
      contact_number || null,
      status || 'ACTIVE',
      notes || null,
      now,
      now,
    ]
  );

  await logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'SITE_CREATED',
    resourceType: 'SITE',
    resourceId: id,
    resourceName: name,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, message: 'Site created successfully.', siteId: id });
}));

router.patch('/:id', requireAuth, requirePermission('sites.update'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, description, address, contact_person, contact_number, notes, status } = req.body;

  const existing = await queryOne<{ id: string; name: string }>('SELECT id, name FROM sites WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Site not found.' });
  }

  const now = new Date().toISOString();

  await execute(
    `UPDATE sites SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      address = COALESCE($3, address),
      contact_person = COALESCE($4, contact_person),
      contact_number = COALESCE($5, contact_number),
      notes = COALESCE($6, notes),
      status = COALESCE($7, status),
      updated_at = $8
     WHERE id = $9`,
    [
      name?.trim() || null,
      description !== undefined ? description : null,
      address !== undefined ? address : null,
      contact_person !== undefined ? contact_person : null,
      contact_number !== undefined ? contact_number : null,
      notes !== undefined ? notes : null,
      status || null,
      now,
      id,
    ]
  );

  await logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'SITE_UPDATED',
    resourceType: 'SITE',
    resourceId: id,
    resourceName: name || existing.name,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Site updated successfully.' });
}));

export default router;

