import { Router } from 'express';
import { query, queryOne } from '../db/index.js';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, requirePermission('audit.view'), (req: AuthRequest, res) => {
  const { search, userId, action, resourceType, deviceId, startDate, endDate, page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  let whereClauses = ['1=1'];
  const params: any[] = [];

  if (userId) {
    whereClauses.push('a.user_id = ?');
    params.push(userId);
  }

  if (action) {
    whereClauses.push('a.action = ?');
    params.push(action);
  }

  if (resourceType) {
    whereClauses.push('a.resource_type = ?');
    params.push(resourceType);
  }

  if (deviceId) {
    whereClauses.push('a.device_id = ?');
    params.push(deviceId);
  }

  if (startDate) {
    whereClauses.push('a.created_at >= ?');
    params.push(`${startDate}T00:00:00.000Z`);
  }

  if (endDate) {
    whereClauses.push('a.created_at <= ?');
    params.push(`${endDate}T23:59:59.999Z`);
  }

  if (search) {
    whereClauses.push(
      '(a.username_snapshot LIKE ? OR a.action LIKE ? OR a.resource_name LIKE ? OR a.ip_address LIKE ? OR d.device_name LIKE ?)'
    );
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  const whereSql = whereClauses.join(' AND ');

  const countRow = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM audit_logs a
     LEFT JOIN devices d ON a.device_id = d.id
     WHERE ${whereSql}`,
    params
  );

  const total = countRow?.count || 0;

  const logs = query(
    `SELECT a.*, d.device_name
     FROM audit_logs a
     LEFT JOIN devices d ON a.device_id = d.id
     WHERE ${whereSql}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  res.json({
    success: true,
    logs,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

export default router;

