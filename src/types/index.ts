export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  status: 'ACTIVE' | 'DISABLED';
  roles: { id: string; name: string }[];
  permissions: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  is_system_role: number;
  permissions: { id: string; code: string; name: string }[];
  userCount: number;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  description?: string;
  address?: string;
  contact_person?: string;
  contact_number?: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  created_at: string;
  updated_at: string;
  devices?: Device[];
}

export interface DeviceType {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
}

export interface Device {
  id: string;
  device_name: string;
  device_type_id: string;
  device_type_name: string;
  device_type_code: string;
  site_id: string;
  site_name: string;
  site_code: string;
  vendor?: string;
  model?: string;
  management_ip: string;
  hostname?: string;
  management_vlan?: number;
  mac_address?: string;
  serial_number?: string;
  asset_tag?: string;
  ssh_port: number;
  http_port: number;
  https_port: number;
  telnet_port: number;
  snmp_port: number;
  firmware_version?: string;
  software_version?: string;
  rack?: string;
  rack_unit?: string;
  physical_location?: string;
  uplink?: string;
  parent_device?: string;
  description?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'DECOMMISSIONED';
  credential_count?: number;
  credentials?: Credential[];
  created_at: string;
  updated_at: string;
}

export interface Credential {
  id: string;
  device_id: string;
  device_name?: string;
  management_ip?: string;
  site_name?: string;
  device_type_name?: string;
  credential_name: string;
  username: string;
  protocol: 'WEB' | 'HTTP' | 'HTTPS' | 'SSH' | 'TELNET' | 'API' | 'SNMP' | 'OTHER';
  port?: number;
  login_url?: string;
  privilege_level: 'ADMIN' | 'OPERATOR' | 'READ ONLY' | 'SERVICE ACCOUNT' | 'OTHER';
  description?: string;
  password_changed_at: string;
  rotation_interval_days: number;
  next_rotation_at: string;
  passwordAgeDays: number;
  rotationStatus: 'CURRENT' | 'DUE_SOON' | 'OVERDUE';
  passwordMasked: string;
  status: 'ACTIVE' | 'DISABLED' | 'EXPIRED';
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  username_snapshot: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  resource_name?: string;
  device_id?: string;
  device_name?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: string;
  created_at: string;
}

export interface DashboardSummary {
  stats: {
    totalDevices: number;
    activeDevices: number;
    inactiveDevices: number;
    totalCredentials: number;
    passwordsDueForRotation: number;
    totalSites: number;
    totalUsers: number;
  };
  devicesByType: { type_code: string; type_name: string; count: number }[];
  recentlyAddedDevices: {
    id: string;
    device_name: string;
    management_ip: string;
    status: string;
    created_at: string;
    device_type_name: string;
    site_name: string;
  }[];
  recentCredentialActivity: {
    id: string;
    user: string;
    action: string;
    credential?: string;
    device_name?: string;
    timestamp: string;
    ip?: string;
  }[];
  rotationAlerts: {
    id: string;
    credential_name: string;
    username: string;
    device_name: string;
    site_name: string;
    next_rotation_at: string;
    rotationStatus: 'CURRENT' | 'DUE_SOON' | 'OVERDUE';
    daysRemaining: number;
  }[];
}

export interface SystemSettings {
  app_name: string;
  organization_name: string;
  timezone: string;
  pagination_size: number;
  session_timeout: number;
  require_reauth_reveal: boolean;
  reveal_timeout: number;
  login_attempt_limit: number;
  account_lock_duration: number;
  default_rotation_days: number;
  due_soon_threshold: number;
}

