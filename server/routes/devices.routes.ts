import { asyncHandler } from '../middleware/async.middleware.js';
import { Router } from 'express';
import { query, queryOne, execute } from '../db/index.js';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import crypto from 'crypto';

const router = Router();

// Device types list helper
router.get('/types', requireAuth, requirePermission('devices.view'), asyncHandler(async (req, res) => {
  const types = await query('SELECT * FROM device_types WHERE status = $1 ORDER BY name ASC', ['ACTIVE']);
  res.json({ success: true, deviceTypes: types });
}));

// List devices with search, pagination, and filters
router.get('/', requireAuth, requirePermission('devices.view'), asyncHandler(async (req: AuthRequest, res) => {
  const { search, typeId, siteId, status, vendor, page = '1', limit = '10', sortBy = 'device_name', sortOrder = 'ASC' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = ['1=1'];
  const params: any[] = [];

  if (typeId) {
    whereClauses.push(`d.device_type_id = $${params.length + 1}`);
    params.push(typeId);
  }

  if (siteId) {
    whereClauses.push(`d.site_id = $${params.length + 1}`);
    params.push(siteId);
  }

  if (status) {
    whereClauses.push(`d.status = $${params.length + 1}`);
    params.push(status);
  }

  if (vendor) {
    whereClauses.push(`d.vendor ILIKE $${params.length + 1}`);
    params.push(`%${vendor}%`);
  }

  if (search) {
    whereClauses.push(
      `(d.device_name ILIKE $${params.length + 1} OR d.management_ip ILIKE $${params.length + 2} OR d.hostname ILIKE $${params.length + 3} OR d.vendor ILIKE $${params.length + 4} OR d.model ILIKE $${params.length + 5} OR d.serial_number ILIKE $${params.length + 6} OR s.name ILIKE $${params.length + 7})`
    );
    const term = `%${search}%`;
    params.push(term, term, term, term, term, term, term);
  }

  const whereSql = whereClauses.join(' AND ');

  const countRow = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int as count
     FROM devices d
     LEFT JOIN sites s ON d.site_id = s.id
     LEFT JOIN device_types dt ON d.device_type_id = dt.id
     WHERE ${whereSql}`,
    params
  );

  const total = countRow?.count || 0;

  const allowedSortCols: Record<string, string> = {
    device_name: 'd.device_name',
    management_ip: 'd.management_ip',
    vendor: 'd.vendor',
    model: 'd.model',
    status: 'd.status',
    site: 's.name',
    created_at: 'd.created_at',
  };

  const sortCol = allowedSortCols[sortBy as string] || 'd.device_name';
  const sortDir = (sortOrder as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const items = await query(
    `SELECT d.*, COALESCE(s.name, 'Unassigned') as site_name, COALESCE(s.code, 'N/A') as site_code, COALESCE(dt.name, 'Unspecified') as device_type_name, COALESCE(dt.code, 'OTHER') as device_type_code,
            (SELECT COUNT(*)::int FROM credentials c WHERE c.device_id = d.id) as credential_count
     FROM devices d
     LEFT JOIN sites s ON d.site_id = s.id
     LEFT JOIN device_types dt ON d.device_type_id = dt.id
     WHERE ${whereSql}
     ORDER BY ${sortCol} ${sortDir}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limitNum, offset]
  );

  res.json({
    success: true,
    devices: items,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}));

// Single Device Details with Masked Credentials
router.get('/:id', requireAuth, requirePermission('devices.view'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const device = await queryOne(
    `SELECT d.*, COALESCE(s.name, 'Unassigned') as site_name, COALESCE(s.code, 'N/A') as site_code, COALESCE(dt.name, 'Unspecified') as device_type_name, COALESCE(dt.code, 'OTHER') as device_type_code
     FROM devices d
     LEFT JOIN sites s ON d.site_id = s.id
     LEFT JOIN device_types dt ON d.device_type_id = dt.id
     WHERE d.id = $1`,
    [id]
  );

  if (!device) {
    return res.status(404).json({ success: false, message: 'Device not found.' });
  }

  // Fetch credentials WITHOUT returning encrypted password / iv / auth tag
  const credentials = await query(
    `SELECT id, device_id, credential_name, username, protocol, port, login_url, privilege_level, description,
            password_changed_at, rotation_interval_days, next_rotation_at, status, created_at, updated_at
     FROM credentials
     WHERE device_id = $1
     ORDER BY credential_name ASC`,
    [id]
  );

  res.json({
    success: true,
    device: {
      ...device,
      credentials: credentials.map((c) => ({
        ...c,
        passwordMasked: '••••••••••••',
      })),
    },
  });
}));

// Create Device
router.post('/', requireAuth, requirePermission('devices.create'), asyncHandler(async (req: AuthRequest, res) => {
  const {
    device_name,
    device_type_id,
    site_id,
    vendor,
    model,
    management_ip,
    hostname,
    management_vlan,
    mac_address,
    serial_number,
    asset_tag,
    ssh_port,
    http_port,
    https_port,
    telnet_port,
    snmp_port,
    firmware_version,
    software_version,
    rack,
    rack_unit,
    physical_location,
    uplink,
    parent_device,
    description,
    notes,
    status,
  } = req.body;

  if (!device_name || !device_name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Device name is required.',
    });
  }

  // Validate port values if provided
  const ports = [ssh_port, http_port, https_port, telnet_port, snmp_port];
  for (const p of ports) {
    if (p !== undefined && p !== null && p !== '') {
      const portNum = parseInt(p, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return res.status(400).json({ success: false, message: 'Access ports must be integers between 1 and 65535.' });
      }
    }
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO devices (
      id, device_name, device_type_id, site_id, vendor, model, management_ip, hostname,
      management_vlan, mac_address, serial_number, asset_tag, ssh_port, http_port, https_port,
      telnet_port, snmp_port, firmware_version, software_version, rack, rack_unit, physical_location,
      uplink, parent_device, description, notes, status, created_by, updated_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)`,
    [
      id,
      device_name.trim(),
      device_type_id || null,
      site_id || null,
      vendor || null,
      model || null,
      management_ip ? management_ip.trim() : null,
      hostname || null,
      management_vlan ? parseInt(management_vlan, 10) : null,
      mac_address || null,
      serial_number || null,
      asset_tag || null,
      ssh_port ? parseInt(ssh_port, 10) : 22,
      http_port ? parseInt(http_port, 10) : 80,
      https_port ? parseInt(https_port, 10) : 443,
      telnet_port ? parseInt(telnet_port, 10) : 23,
      snmp_port ? parseInt(snmp_port, 10) : 161,
      firmware_version || null,
      software_version || null,
      rack || null,
      rack_unit || null,
      physical_location || null,
      uplink || null,
      parent_device || null,
      description || null,
      notes || null,
      status || 'ACTIVE',
      req.user!.id,
      req.user!.id,
      now,
      now,
    ]
  );

  await logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'DEVICE_CREATED',
    resourceType: 'DEVICE',
    resourceId: id,
    resourceName: device_name,
    deviceId: id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, message: 'Device created successfully.', deviceId: id });
}));

// Update Device
router.patch('/:id', requireAuth, requirePermission('devices.update'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const existing = await queryOne<{ id: string; device_name: string; device_type_id: string | null; site_id: string | null; management_ip: string | null }>(
    'SELECT id, device_name, device_type_id, site_id, management_ip FROM devices WHERE id = $1',
    [id]
  );
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Device not found.' });
  }

  const {
    device_name,
    device_type_id,
    site_id,
    vendor,
    model,
    management_ip,
    hostname,
    management_vlan,
    mac_address,
    serial_number,
    asset_tag,
    ssh_port,
    http_port,
    https_port,
    telnet_port,
    snmp_port,
    firmware_version,
    software_version,
    rack,
    rack_unit,
    physical_location,
    uplink,
    parent_device,
    description,
    notes,
    status,
  } = req.body;

  const parsePort = (val: any, defaultVal: number) => {
    if (val === undefined || val === null || val === '') return defaultVal;
    const num = parseInt(val, 10);
    return isNaN(num) ? defaultVal : num;
  };

  const parseNullableInt = (val: any) => {
    if (val === undefined || val === null || val === '') return null;
    const num = parseInt(val, 10);
    return isNaN(num) ? null : num;
  };

  const deviceNameVal = device_name && device_name.trim() ? device_name.trim() : existing.device_name;
  const deviceTypeIdVal = device_type_id !== undefined ? (device_type_id ? device_type_id : null) : existing.device_type_id;
  const siteIdVal = site_id !== undefined ? (site_id ? site_id : null) : existing.site_id;
  const mgmtIpVal = management_ip !== undefined ? (management_ip && management_ip.trim() ? management_ip.trim() : null) : existing.management_ip;

  const now = new Date().toISOString();

  await execute(
    `UPDATE devices SET
      device_name = $1,
      device_type_id = $2,
      site_id = $3,
      vendor = $4,
      model = $5,
      management_ip = $6,
      hostname = $7,
      management_vlan = $8,
      mac_address = $9,
      serial_number = $10,
      asset_tag = $11,
      ssh_port = $12,
      http_port = $13,
      https_port = $14,
      telnet_port = $15,
      snmp_port = $16,
      firmware_version = $17,
      software_version = $18,
      rack = $19,
      rack_unit = $20,
      physical_location = $21,
      uplink = $22,
      parent_device = $23,
      description = $24,
      notes = $25,
      status = COALESCE($26, status),
      updated_by = $27,
      updated_at = $28
     WHERE id = $29`,
    [
      deviceNameVal,
      deviceTypeIdVal,
      siteIdVal,
      vendor || null,
      model || null,
      mgmtIpVal,
      hostname || null,
      parseNullableInt(management_vlan),
      mac_address || null,
      serial_number || null,
      asset_tag || null,
      parsePort(ssh_port, 22),
      parsePort(http_port, 80),
      parsePort(https_port, 443),
      parsePort(telnet_port, 23),
      parsePort(snmp_port, 161),
      firmware_version || null,
      software_version || null,
      rack || null,
      rack_unit || null,
      physical_location || null,
      uplink || null,
      parent_device || null,
      description || null,
      notes || null,
      status || null,
      req.user!.id,
      now,
      id,
    ]
  );

  await logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'DEVICE_UPDATED',
    resourceType: 'DEVICE',
    resourceId: id,
    resourceName: device_name || existing.device_name,
    deviceId: id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, message: 'Device updated successfully.' });
}));

// Deactivate Device
router.post('/:id/deactivate', requireAuth, requirePermission('devices.deactivate'), asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const existing = await queryOne<{ id: string; device_name: string }>('SELECT id, device_name FROM devices WHERE id = $1', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Device not found.' });
  }

  const { status = 'DECOMMISSIONED' } = req.body;
  const now = new Date().toISOString();

  await execute('UPDATE devices SET status = $1, updated_by = $2, updated_at = $3 WHERE id = $4', [status, req.user!.id, now, id]);

  await logAudit({
    userId: req.user!.id,
    usernameSnapshot: req.user!.username,
    action: 'DEVICE_DEACTIVATED',
    resourceType: 'DEVICE',
    resourceId: id,
    resourceName: existing.device_name,
    deviceId: id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { newStatus: status },
  });

  res.json({ success: true, message: `Device marked as ${status} successfully.` });
}));

export default router;

