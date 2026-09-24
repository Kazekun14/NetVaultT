import { Router } from 'express';
import { query, queryOne } from '../db/index.js';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/summary', requireAuth, requirePermission('dashboard.view'), (req: AuthRequest, res) => {
  const totalDevicesRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM devices');
  const activeDevicesRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM devices WHERE status = ?', ['ACTIVE']);
  const inactiveDevicesRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM devices WHERE status != ?', ['ACTIVE']);
  const totalCredentialsRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM credentials WHERE status = ?', ['ACTIVE']);
  const totalSitesRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM sites WHERE status = ?', ['ACTIVE']);
  const totalUsersRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE status = ?', ['ACTIVE']);

  // Fetch all active credentials to compute rotation alerts
  const credentials = query<{
    id: string;
    credential_name: string;
    username: string;
    next_rotation_at: string;
    device_id: string;
    device_name: string;
    site_name: string;
  }>(
    `SELECT c.id, c.credential_name, c.username, c.next_rotation_at, c.device_id, d.device_name, s.name as site_name
     FROM credentials c
     JOIN devices d ON c.device_id = d.id
     JOIN sites s ON d.site_id = s.id
     WHERE c.status = 'ACTIVE'`
  );

  const nowMs = Date.now();
  let dueForRotationCount = 0;
  const rotationAlerts: any[] = [];

  for (const c of credentials) {
    const nextRotMs = new Date(c.next_rotation_at).getTime();
    const diffDays = Math.ceil((nextRotMs - nowMs) / (1000 * 3600 * 24));

    let rotationStatus: 'CURRENT' | 'DUE_SOON' | 'OVERDUE' = 'CURRENT';
    if (diffDays < 0) {
      rotationStatus = 'OVERDUE';
      dueForRotationCount++;
      rotationAlerts.push({ ...c, daysRemaining: diffDays, rotationStatus });
    } else if (diffDays <= 14) {
      rotationStatus = 'DUE_SOON';
      dueForRotationCount++;
      rotationAlerts.push({ ...c, daysRemaining: diffDays, rotationStatus });
    }
  }

  // Sort rotation alerts: OVERDUE first, then lowest daysRemaining
  rotationAlerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Devices by Type
  const devicesByType = query<{ type_code: string; type_name: string; count: number }>(
    `SELECT dt.code as type_code, dt.name as type_name, COUNT(d.id) as count
     FROM device_types dt
     LEFT JOIN devices d ON dt.id = d.device_type_id
     GROUP BY dt.id, dt.code, dt.name
     ORDER BY count DESC, dt.name ASC`
  );

  // Recently Added Devices
  const recentlyAddedDevices = query(
    `SELECT d.id, d.device_name, d.management_ip, d.status, d.created_at, dt.name as device_type_name, s.name as site_name
     FROM devices d
     JOIN device_types dt ON d.device_type_id = dt.id
     JOIN sites s ON d.site_id = s.id
     ORDER BY d.created_at DESC
     LIMIT 5`
  );

  // Recent Credential Activity (SAFE audit log entries)
  const recentCredentialActivity = query(
    `SELECT a.id, a.username_snapshot as user, a.action, a.resource_name as credential, a.created_at as timestamp, a.ip_address as ip, d.device_name
     FROM audit_logs a
     LEFT JOIN devices d ON a.device_id = d.id
     WHERE a.resource_type = 'CREDENTIAL' OR a.action LIKE 'CREDENTIAL_%'
     ORDER BY a.created_at DESC
     LIMIT 7`
  );

  res.json({
    success: true,
    stats: {
      totalDevices: totalDevicesRow?.count || 0,
      activeDevices: activeDevicesRow?.count || 0,
      inactiveDevices: inactiveDevicesRow?.count || 0,
      totalCredentials: totalCredentialsRow?.count || 0,
      passwordsDueForRotation: dueForRotationCount,
      totalSites: totalSitesRow?.count || 0,
      totalUsers: totalUsersRow?.count || 0,
    },
    devicesByType,
    recentlyAddedDevices,
    recentCredentialActivity,
    rotationAlerts: rotationAlerts.slice(0, 10),
  });
});

export default router;

