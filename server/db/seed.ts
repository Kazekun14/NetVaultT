import { initDb, execute, queryOne, transaction, db, databaseErrorCode } from './index.js';
import crypto from 'crypto';

export async function seedDatabase() {
  console.log('Seeding NetVaultT database reference configuration...');
  await initDb();

  await transaction(async () => {
    try { await execute('SELECT pg_advisory_xact_lock(726148201)'); } catch {}
    const now = new Date().toISOString();

    // 1. Seed Permissions
    const permissionsList = [
      { code: 'dashboard.view', name: 'View Dashboard', description: 'Access dashboard and statistics' },
      { code: 'devices.view', name: 'View Devices', description: 'View network device list and details' },
      { code: 'devices.create', name: 'Create Devices', description: 'Add new network devices' },
      { code: 'devices.update', name: 'Update Devices', description: 'Edit existing network device details' },
      { code: 'devices.deactivate', name: 'Deactivate Devices', description: 'Deactivate or decommission devices' },
      { code: 'credentials.view', name: 'View Credentials', description: 'View credential metadata' },
      { code: 'credentials.create', name: 'Create Credentials', description: 'Add credentials to devices' },
      { code: 'credentials.update', name: 'Update Credentials', description: 'Edit credential metadata and passwords' },
      { code: 'credentials.reveal', name: 'Reveal Credentials', description: 'Decrypt and reveal credential passwords' },
      { code: 'credentials.copy', name: 'Copy Credentials', description: 'Copy credential passwords to clipboard' },
      { code: 'credentials.disable', name: 'Disable Credentials', description: 'Disable device credentials' },
      { code: 'sites.view', name: 'View Sites', description: 'View physical/logical sites' },
      { code: 'sites.create', name: 'Create Sites', description: 'Add new sites' },
      { code: 'sites.update', name: 'Update Sites', description: 'Edit existing sites' },
      { code: 'users.view', name: 'View Users', description: 'View user accounts' },
      { code: 'users.create', name: 'Create Users', description: 'Create user accounts' },
      { code: 'users.update', name: 'Update Users', description: 'Edit user accounts and roles' },
      { code: 'roles.manage', name: 'Manage Roles', description: 'Create and edit roles and permissions' },
      { code: 'audit.view', name: 'View Audit Logs', description: 'View security and action audit history' },
      { code: 'settings.manage', name: 'Manage Settings', description: 'Modify global system settings' },
    ];

    for (const perm of permissionsList) {
      const existing = await queryOne('SELECT id FROM permissions WHERE code = $1', [perm.code]);
      if (!existing) {
        const id = crypto.randomUUID();
        await execute(
          'INSERT INTO permissions (id, code, name, description) VALUES ($1, $2, $3, $4)',
          [id, perm.code, perm.name, perm.description]
        );
      }
    }

    // 2. Seed Roles and Role Permissions
    const rolesList = [
      {
        name: 'Super Administrator',
        description: 'Full unrestricted system access',
        is_system_role: 1,
        perms: permissionsList.map((p) => p.code),
      },
      {
        name: 'Network Administrator',
        description: 'Full device, credential, site, and audit log management',
        is_system_role: 1,
        perms: [
          'dashboard.view',
          'devices.view',
          'devices.create',
          'devices.update',
          'devices.deactivate',
          'credentials.view',
          'credentials.create',
          'credentials.update',
          'credentials.reveal',
          'credentials.copy',
          'credentials.disable',
          'sites.view',
          'sites.create',
          'sites.update',
          'audit.view',
        ],
      },
      {
        name: 'Network Engineer',
        description: 'View devices and credentials, reveal/copy passwords, edit permitted device info',
        is_system_role: 1,
        perms: [
          'dashboard.view',
          'devices.view',
          'devices.update',
          'credentials.view',
          'credentials.reveal',
          'credentials.copy',
          'sites.view',
        ],
      },
      {
        name: 'Viewer',
        description: 'Read-only device and credential metadata inspection',
        is_system_role: 1,
        perms: ['dashboard.view', 'devices.view', 'credentials.view', 'sites.view'],
      },
    ];

    for (const roleDef of rolesList) {
      let role = await queryOne<{ id: string }>('SELECT id FROM roles WHERE name = $1', [roleDef.name]);
      let roleId = role?.id;

      if (!roleId) {
        roleId = crypto.randomUUID();
        await execute(
          'INSERT INTO roles (id, name, description, is_system_role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [roleId, roleDef.name, roleDef.description, roleDef.is_system_role, now, now]
        );
      }

      // Attach permissions
      for (const code of roleDef.perms) {
        const perm = await queryOne<{ id: string }>('SELECT id FROM permissions WHERE code = $1', [code]);
        if (perm) {
          const link = await queryOne('SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2', [
            roleId,
            perm.id,
          ]);
          if (!link) {
            await execute('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [roleId, perm.id]);
          }
        }
      }
    }

    // 3. Seed Device Types
    const deviceTypesList = [
      { code: 'ROUTER', name: 'Router', description: 'Core/edge network router' },
      { code: 'MIKROTIK', name: 'MikroTik', description: 'MikroTik RouterBOARD or Cloud Core Router' },
      { code: 'OLT', name: 'OLT', description: 'Optical Line Terminal for FTTH' },
      { code: 'ONU_ONT', name: 'ONU / ONT', description: 'Optical Network Unit / Terminal' },
      { code: 'SWITCH', name: 'Managed Switch', description: 'Layer 2 / Layer 3 Managed Network Switch' },
      { code: 'FIREWALL', name: 'Firewall', description: 'Hardware or Virtual Security Firewall' },
      { code: 'SERVER', name: 'Server', description: 'Linux/Windows Infrastructure Server' },
      { code: 'NAS', name: 'NAS', description: 'Network Attached Storage' },
      { code: 'ACCESS_POINT', name: 'Access Point', description: 'Wireless Access Point' },
      { code: 'IPTV_SERVER', name: 'IPTV Server', description: 'IPTV streaming or middleware server' },
      { code: 'MONITORING_SERVER', name: 'Monitoring Server', description: 'NMS / Zabbix / Prometheus server' },
      { code: 'OTHER', name: 'Other', description: 'Other network hardware or appliance' },
    ];

    for (const dt of deviceTypesList) {
      const existing = await queryOne('SELECT id FROM device_types WHERE code = $1', [dt.code]);
      if (!existing) {
        await execute('INSERT INTO device_types (id, code, name, description, status) VALUES ($1, $2, $3, $4, $5)', [
          crypto.randomUUID(),
          dt.code,
          dt.name,
          dt.description,
          'ACTIVE',
        ]);
      }
    }

    // 4. Seed System Settings
    const defaultSettings = [
      { key: 'app_name', value: 'NetVaultT', type: 'string' },
      { key: 'organization_name', value: 'NetVaultT Enterprise Network', type: 'string' },
      { key: 'timezone', value: 'Asia/Manila', type: 'string' },
      { key: 'pagination_size', value: '10', type: 'number' },
      { key: 'session_timeout', value: '30', type: 'number' },
      { key: 'require_reauth_reveal', value: 'false', type: 'boolean' },
      { key: 'reveal_timeout', value: '20', type: 'number' },
      { key: 'login_attempt_limit', value: '5', type: 'number' },
      { key: 'account_lock_duration', value: '15', type: 'number' },
      { key: 'default_rotation_days', value: '90', type: 'number' },
      { key: 'due_soon_threshold', value: '14', type: 'number' },
    ];

    for (const s of defaultSettings) {
      const existing = await queryOne('SELECT id FROM system_settings WHERE setting_key = $1', [s.key]);
      if (!existing) {
        await execute(
          'INSERT INTO system_settings (id, setting_key, setting_value, setting_type, updated_by, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
          [crypto.randomUUID(), s.key, s.value, s.type, null, now]
        );
      }
    }
  });
  console.log('Database reference configuration seeding finished successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(() => db.end())
    .catch((err) => {
      console.error('Seed error:', databaseErrorCode(err));
      process.exitCode = 1;
      return db.end();
    });
}
