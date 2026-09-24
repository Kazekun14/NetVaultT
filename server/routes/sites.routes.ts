import { Router } from 'express';
import { query, queryOne, execute } from '../db/index.js';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import crypto from 'crypto';

const router = Router();

router.get('/', requireAuth, requirePermission('sites.view'), (req: AuthRequest, res) => {
  const { search, status } = req.query;

  let sql = 'SELECT * FROM sites WHERE 1=1';
  const params: any[] = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    sql += ' AND (code LIKE ? OR name LIKE ? OR description LIKE ? OR address LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  sql += ' ORDER BY name ASC';
  const sites = query(sql, params);

  res.json({ success: true, sites });
});

router.get('/:id', requireAuth, requirePermission('sites.view'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const site = queryOne('SELECT * FROM sites WHERE id = ?', [id]);

  if (!site) {
    return res.status(404).json({ success: false, message: 'Site not found.' });
  }

  const devices = query(
    `SELECT d.*, dt.name as device_type_name, dt.code as device_type_code
     FROM devices d
     JOIN device_types dt ON d.device_type_id = dt.id
     WHERE d.site_id = ?
     ORDER BY d.device_name ASC`,
    [id]
  );

  res.json({ success: true, site: { ...site, devices } });
});

router.post('/', requireAuth, requirePermission('sites.create'), (req: AuthRequest, res) => {
  const { code, name, description, address, contact_person, contact_number, notes, status } = req.body;

  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Site code and site name are required.' });
  }

  const existing = queryOne('SELECT id FROM sites WHERE code = ?', [code.trim().toUpperCase()]);
  if (existing) {
    return res.status(409).json({ success: false, message: `Site code '${code}' already exists.` });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const siteCode = code.trim().toUpperCase();

  execute(
    `INSERT INTO sites (id, code, name, description, address, contact_person, contact_number, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  logAudit({
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
});

router.patch('/:id', requireAuth, requirePermission('sites.update'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, description, address, contact_person, contact_number, notes, status } = req.body;

  const existing = queryOne<{ id: string; name: string }>('SELECT id, name FROM sites WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Site not found.' });
  }

  const now = new Date().toISOString();

  execute(
    `UPDATE sites SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      address = COALESCE(?, address),
      contact_person = COALESCE(?, contact_person),
      contact_number = COALESCE(?, contact_number),
      notes = COALESCE(?, notes),
      status = COALESCE(?, status),
      updated_at = ?
     WHERE id = ?`,
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

  logAudit({
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
});

export default router;

