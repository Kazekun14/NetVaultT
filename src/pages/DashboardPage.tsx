import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { DashboardSummary } from '../types/index.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import {
  Router as RouterIcon,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  MapPin,
  Users,
  Activity,
  ArrowRight,
  ShieldAlert,
  Server,
  Layers,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean } & DashboardSummary>('/dashboard/summary');
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, devicesByType, recentlyAddedDevices, recentCredentialActivity, rotationAlerts } = data;

  const statCards = [
    { label: 'Total Devices', value: stats.totalDevices, icon: RouterIcon, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { label: 'Active Devices', value: stats.activeDevices, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Inactive Devices', value: stats.inactiveDevices, icon: AlertTriangle, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
    { label: 'Total Credentials', value: stats.totalCredentials, icon: KeyRound, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Due for Rotation', value: stats.passwordsDueForRotation, icon: ShieldAlert, color: stats.passwordsDueForRotation > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400', bg: stats.passwordsDueForRotation > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-500/10 border-slate-500/20' },
    { label: 'Total Sites', value: stats.totalSites, icon: MapPin, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Infrastructure Dashboard</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time overview of network device inventory, credentials, and rotation health</p>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 shadow-sm dark:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</span>
                <div className={`p-2.5 rounded-xl border ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">{card.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Sections */}
      <div className="space-y-8">
        {/* Password Rotation Alerts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Password Rotation Alerts</h2>
            </div>
            <Link to="/credentials" className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-medium">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {rotationAlerts.length === 0 ? (
            <div className="p-5 text-center bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 text-xs flex items-center justify-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>All active network credentials comply with rotation policies.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Device</th>
                    <th className="px-4 py-3">Credential</th>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Rotation Status</th>
                    <th className="px-4 py-3 text-right">Days Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
                  {rotationAlerts.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{item.device_name}</td>
                      <td className="px-4 py-3 text-cyan-600 dark:text-cyan-400">{item.credential_name} ({item.username})</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.site_name}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.rotationStatus} />
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)} days overdue` : `${item.daysRemaining} days`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Balanced 2-Column Row: Recently Added Devices & Recent Credential Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Recently Added Devices */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Recently Added Devices</h2>
              </div>
              <Link to="/devices" className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-medium">
                View Devices <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Device Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Management IP</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
                  {recentlyAddedDevices.map((device) => (
                    <tr key={device.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        <Link to={`/devices/${device.id}`} className="hover:text-cyan-600 dark:hover:text-cyan-400">
                          {device.device_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{device.device_type_name}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{device.site_name}</td>
                      <td className="px-4 py-3 text-cyan-600 dark:text-cyan-400 font-mono">{device.management_ip}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={device.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Credential Activity Feed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Credential Activity</h2>
              </div>
              <Link to="/audit-logs" className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-medium">
                View Audit Logs <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3 divide-y divide-slate-200 dark:divide-slate-800/60 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin flex-1">
              {recentCredentialActivity.length === 0 ? (
                <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">No recent activity logged.</div>
              ) : (
                recentCredentialActivity.map((act) => (
                  <div key={act.id} className="pt-3 first:pt-0 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-900 dark:text-white">{act.user}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-[10px] text-cyan-700 dark:text-cyan-400 border border-slate-200 dark:border-slate-800">
                        {act.action}
                      </span>
                      <span className="truncate">{act.device_name || act.credential}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Devices By Type Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Devices by Type</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devicesByType.map((dt) => (
              <div key={dt.type_code} className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{dt.type_name}</span>
                  <span className="text-cyan-700 dark:text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{dt.count}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.totalDevices > 0 ? (dt.count / stats.totalDevices) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
