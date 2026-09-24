import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../components/common/Toast.js';
import { Settings as SettingsIcon, Save, ShieldAlert, Clock, RefreshCw, Layers } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState({
    app_name: 'NetVaultT',
    organization_name: 'NetVaultT Enterprise Network',
    timezone: 'Asia/Manila',
    pagination_size: 10,
    session_timeout: 30,
    require_reauth_reveal: false,
    reveal_timeout: 20,
    login_attempt_limit: 5,
    account_lock_duration: 15,
    default_rotation_days: 90,
    due_soon_threshold: 14,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; settings: any }>('/settings');
      if (res.success && res.settings) {
        setSettings((prev) => ({ ...prev, ...res.settings }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let val: any = value;
    if (type === 'checkbox') {
      val = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      val = parseFloat(value);
    }
    setSettings((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await apiFetch<{ success: boolean; message: string }>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });

      if (res.success) {
        showToast(res.message || 'System settings saved.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading system settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Configure global vault security controls, session behavior, and rotation thresholds</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* General Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">General Application Settings</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">Application Name</label>
              <input
                type="text"
                name="app_name"
                value={settings.app_name}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">Organization Name</label>
              <input
                type="text"
                name="organization_name"
                value={settings.organization_name}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">Time Zone</label>
              <select
                name="timezone"
                value={settings.timezone}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Asia/Manila">Asia/Manila (PHT, UTC+8)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">Default Pagination Size</label>
              <input
                type="number"
                name="pagination_size"
                value={settings.pagination_size}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Security Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Security & Reveal Policy Controls</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                name="require_reauth_reveal"
                checked={settings.require_reauth_reveal}
                onChange={handleChange}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-0 bg-slate-900 border-slate-700"
              />
              <div className="text-xs">
                <span className="font-bold text-white block">Require Re-authentication for Credential Reveal</span>
                <span className="text-slate-400 block">
                  When enabled, users must re-enter their NetVaultT account password before revealing device credentials.
                </span>
              </div>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Password Reveal Auto-Hide (Seconds)</label>
                <input
                  type="number"
                  name="reveal_timeout"
                  value={settings.reveal_timeout}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Session Inactivity Timeout (Minutes)</label>
                <input
                  type="number"
                  name="session_timeout"
                  value={settings.session_timeout}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Login Attempt Limit</label>
                <input
                  type="number"
                  name="login_attempt_limit"
                  value={settings.login_attempt_limit}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Account Lock Duration (Minutes)</label>
                <input
                  type="number"
                  name="account_lock_duration"
                  value={settings.account_lock_duration}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Credential Rotation Policy */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <RefreshCw className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Credential Rotation Policy</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">Default Rotation Interval (Days)</label>
              <input
                type="number"
                name="default_rotation_days"
                value={settings.default_rotation_days}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase">Due Soon Alert Threshold (Days)</label>
              <input
                type="number"
                name="due_soon_threshold"
                value={settings.due_soon_threshold}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        {hasPermission('settings.manage') && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving Settings...' : 'Save System Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

