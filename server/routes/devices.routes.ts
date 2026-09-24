import { Router } from 'express';
import { query, queryOne, execute } from '../db/index.js';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../services/audit.service.js';
import crypto from 'crypto';

const router = Router();

// Device types list helper
router.get('/types', requireAuth, requirePermission('devices.view'), (req, res) => {
  const types = query('SELECT * FROM device_types WHERE status = ? ORDER BY name ASC', ['ACTIVE']);
  res.json({ success: true, deviceTypes: types });
});

// List devices with search, pagination, and filters
router.get('/', requireAuth, requirePermission('devices.view'), (req: AuthRequest, res) => {
  const { search, typeId, siteId, status, vendor, page = '1', limit = '10', sortBy = 'device_name', sortOrder = 'ASC' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = ['1=1'];
  const params: any[] = [];

  if (typeId) {
    whereClauses.push('d.device_type_id = ?');
    params.push(typeId);
  }

  if (siteId) {
    whereClauses.push('d.site_id = ?');
    params.push(siteId);
  }

  if (status) {
    whereClauses.push('d.status = ?');
    params.push(status);
  }

  if (vendor) {
    whereClauses.push('d.vendor LIKE ?');
    params.push(`%${vendor}%`);
  }

  if (search) {
    whereClauses.push(
      '(d.device_name LIKE ? OR d.management_ip LIKE ? OR d.hostname LIKE ? OR d.vendor LIKE ? OR d.model LIKE ? OR d.serial_number LIKE ? OR s.name LIKE ?)'
    );
    const term = `%${search}%`;
    params.push(term, term, term, term, term, term, term);
  }

  const whereSql = whereClauses.join(' AND ');

  const countRow = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM devices d
     JOIN sites s ON d.site_id = s.id
     JOIN device_types dt ON d.device_type_id = dt.id
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

  const items = query(
    `SELECT d.*, s.name as site_name, s.code as site_code, dt.name as device_type_name, dt.code as device_type_code,
            (SELECT COUNT(*) FROM credentials c WHERE c.device_id = d.id) as credential_count
     FROM devices d
     JOIN sites s ON d.site_id = s.id
     JOIN device_types dt ON d.device_type_id = dt.id
     WHERE ${whereSql}
     ORDER BY ${sortCol} ${sortDir}
     LIMIT ? OFFSET ?`,
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
});

// Single Device Details with Masked Credentials
router.get('/:id', requireAuth, requirePermission('devices.view'), (req: AuthRequest, res) => {
  const { id } = req.params;

  const device = queryOne(
    `SELECT d.*, s.name as site_name, s.code as site_code, dt.name as device_type_name, dt.code as device_type_code
     FROM devices d
     JOIN sites s ON d.site_id = s.id
     JOIN device_types dt ON d.device_type_id = dt.id
     WHERE d.id = ?`,
    [id]
  );

  if (!device) {
    return res.status(404).json({ success: false, message: 'Device not found.' });
  }

  // Fetch credentials WITHOUT returning encrypted password / iv / auth tag
  const credentials = query(
    `SELECT id, device_id, credential_name, username, protocol, port, login_url, privilege_level, description,
            password_changed_at, rotation_interval_days, next_rotation_at, status, created_at, updated_at
     FROM credentials
     WHERE device_id = ?
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
});

// Create Device
router.post('/', requireAuth, requirePermission('devices.create'), (req: AuthRequest, res) => {
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

  if (!device_name || !device_type_id || !site_id || !management_ip) {
    return res.status(400).json({
      success: false,
      message: 'Device name, device type, site, and management IP address are required.',
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

  execute(
    `INSERT INTO devices (
      id, device_name, device_type_id, site_id, vendor, model, management_ip, hostname,
      management_vlan, mac_address, serial_number, asset_tag, ssh_port, http_port, https_port,
      telnet_port, snmp_port, firmware_version, software_version, rack, rack_unit, physical_location,
      uplink, parent_device, description, notes, status, created_by, updated_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      device_name.trim(),
      device_type_id,
      site_id,
      vendor || null,
      model || null,
      management_ip.trim(),
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

  logAudit({
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
});

// Update Device
router.patch('/:id', requireAuth, requirePermission('devices.update'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const existing = queryOne<{ id: string; device_name: string }>('SELECT id, device_name FROM devices WHERE id = ?', [id]);
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

  const now = new Date().toISOString();

  execute(
    `UPDATE devices SET
      device_name = COALESCE(?, device_name),
      device_type_id = COALESCE(?, device_type_id),
      site_id = COALESCE(?, site_id),
      vendor = COALESCE(?, vendor),
      model = COALESCE(?, model),
      management_ip = COALESCE(?, management_ip),
      hostname = COALESCE(?, hostname),
      management_vlan = COALESCE(?, management_vlan),
      mac_address = COALESCE(?, mac_address),
      serial_number = COALESCE(?, serial_number),
      asset_tag = COALESCE(?, asset_tag),
      ssh_port = COALESCE(?, ssh_port),
      http_port = COALESCE(?, http_port),
      https_port = COALESCE(?, https_port),
      telnet_port = COALESCE(?, telnet_port),
      snmp_port = COALESCE(?, snmp_port),
      firmware_version = COALESCE(?, firmware_version),
      software_version = COALESCE(?, software_version),
      rack = COALESCE(?, rack),
      rack_unit = COALESCE(?, rack_unit),
      physical_location = COALESCE(?, physical_location),
      uplink = COALESCE(?, uplink),
      parent_device = COALESCE(?, parent_device),
      description = COALESCE(?, description),
      notes = COALESCE(?, notes),
      status = COALESCE(?, status),
      updated_by = ?,
      updated_at = ?
     WHERE id = ?`,
    [
      device_name || null,
      device_type_id || null,
      site_id || null,
      vendor || null,
      model || null,
      management_ip || null,
      hostname || null,
      management_vlan !== undefined ? management_vlan : null,
      mac_address || null,
      serial_number || null,
      asset_tag || null,
      ssh_port !== undefined ? ssh_port : null,
      http_port !== undefined ? http_port : null,
      https_port !== undefined ? https_port : null,
      telnet_port !== undefined ? telnet_port : null,
      snmp_port !== undefined ? snmp_port : null,
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

  logAudit({
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
});

// Deactivate Device
router.post('/:id/deactivate', requireAuth, requirePermission('devices.deactivate'), (req: AuthRequest, res) => {
  const { id } = req.params;
  const existing = queryOne<{ id: string; device_name: string }>('SELECT id, device_name FROM devices WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Device not found.' });
  }

  const { status = 'DECOMMISSIONED' } = req.body;
  const now = new Date().toISOString();

  execute('UPDATE devices SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?', [status, req.user!.id, now, id]);

  logAudit({
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
});

export default router;

