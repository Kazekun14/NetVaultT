import { execute } from '../db/index.js';
import crypto from 'crypto';

export interface AuditParams {
  userId?: string | null;
  usernameSnapshot: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  resourceName?: string | null;
  deviceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
}

export function logAudit(params: AuditParams): void {
  try {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const metadataStr = params.metadata ? JSON.stringify(params.metadata) : null;

    execute(
      `INSERT INTO audit_logs (
        id, user_id, username_snapshot, action, resource_type,
        resource_id, resource_name, device_id, ip_address, user_agent,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.userId || null,
        params.usernameSnapshot || 'SYSTEM',
        params.action,
        params.resourceType,
        params.resourceId || null,
        params.resourceName || null,
        params.deviceId || null,
        params.ipAddress || null,
        params.userAgent || null,
        metadataStr,
        createdAt,
      ]
    );
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
}

