import React, { useState, useEffect } from 'react';
import { Credential } from '../../types/index.js';
import { apiFetch } from '../../lib/api.js';
import { useToast } from '../common/Toast.js';
import { KeyRound, X, Save, Lock } from 'lucide-react';

interface AddEditCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  credential?: Credential | null;
  onSuccess: () => void;
}

export const AddEditCredentialModal: React.FC<AddEditCredentialModalProps> = ({
  isOpen,
  onClose,
  deviceId,
  credential,
  onSuccess,
}) => {
  const isEdit = Boolean(credential);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    credential_name: '',
    username: '',
    password: '',
    confirmPassword: '',
    protocol: 'HTTPS',
    port: '443',
    login_url: '',
    privilege_level: 'ADMIN',
    rotation_interval_days: '90',
    description: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (credential) {
      setFormData({
        credential_name: credential.credential_name || '',
        username: credential.username || '',
        password: '',
        confirmPassword: '',
        protocol: credential.protocol || 'HTTPS',
        port: credential.port ? credential.port.toString() : '443',
        login_url: credential.login_url || '',
        privilege_level: credential.privilege_level || 'ADMIN',
        rotation_interval_days: credential.rotation_interval_days
          ? credential.rotation_interval_days.toString()
          : '90',
        description: credential.description || '',
      });
    } else {
      setFormData({
        credential_name: '',
        username: '',
        password: '',
        confirmPassword: '',
        protocol: 'HTTPS',
        port: '443',
        login_url: '',
        privilege_level: 'ADMIN',
        rotation_interval_days: '90',
        description: '',
      });
    }
  }, [credential, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.credential_name || !formData.username) {
      showToast('Credential name and username are required.', 'error');
      return;
    }

    if (!isEdit && !formData.password) {
      showToast('Password is required for new credentials.', 'error');
      return;
    }

    if (!isEdit && formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    try {
      setSubmitting(true);

      if (isEdit && credential) {
        // Update Metadata Endpoint (doesn't touch password)
        const res = await apiFetch<{ success: boolean; message: string }>(`/credentials/${credential.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });

        if (res.success) {
          showToast(res.message || 'Credential metadata updated.');
          onSuccess();
          onClose();
        }
      } else {
        // Create Endpoint (encrypts password on backend)
        const res = await apiFetch<{ success: boolean; message: string }>(`/credentials/device/${deviceId}`, {
          method: 'POST',
          body: JSON.stringify(formData),
        });

        if (res.success) {
          showToast(res.message || 'Credential added.');
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">
                {isEdit ? 'Edit Credential Metadata' : 'Add Device Credential'}
              </h3>
              <p className="text-xs text-slate-400">AES-256 encrypted credential storage</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Credential Name *</label>
              <input
                type="text"
                name="credential_name"
                required
                value={formData.credential_name}
                onChange={handleChange}
                placeholder="Web Admin, SSH Root, API User..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Username *</label>
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="admin or root"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Password fields only for new credentials */}
          {!isEdit ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password *</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" /> Current password is securely stored.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Protocol *</label>
              <select
                name="protocol"
                value={formData.protocol}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="WEB">WEB</option>
                <option value="HTTP">HTTP</option>
                <option value="HTTPS">HTTPS</option>
                <option value="SSH">SSH</option>
                <option value="TELNET">TELNET</option>
                <option value="API">API</option>
                <option value="SNMP">SNMP</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Port</label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                placeholder="443"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Privilege</label>
              <select
                name="privilege_level"
                value={formData.privilege_level}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="OPERATOR">OPERATOR</option>
                <option value="READ ONLY">READ ONLY</option>
                <option value="SERVICE ACCOUNT">SERVICE ACCOUNT</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rotation Interval (Days)</label>
            <input
              type="number"
              name="rotation_interval_days"
              value={formData.rotation_interval_days}
              onChange={handleChange}
              placeholder="90"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Login URL (Optional)</label>
            <input
              type="text"
              name="login_url"
              value={formData.login_url}
              onChange={handleChange}
              placeholder="https://192.168.1.1"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-blue-600/20"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : isEdit ? 'Update Metadata' : 'Save Credential'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

