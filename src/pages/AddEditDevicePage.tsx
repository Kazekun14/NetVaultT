import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { Device, DeviceType, Site } from '../types/index.js';
import { useToast } from '../components/common/Toast.js';
import { ArrowLeft, Save, Router } from 'lucide-react';

export const AddEditDevicePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [types, setTypes] = useState<DeviceType[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    device_name: '',
    device_type_id: '',
    site_id: '',
    vendor: '',
    model: '',
    management_ip: '',
    hostname: '',
    management_vlan: '',
    mac_address: '',
    serial_number: '',
    asset_tag: '',
    ssh_port: '22',
    http_port: '80',
    https_port: '443',
    telnet_port: '23',
    snmp_port: '161',
    description: '',
    notes: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    fetchMetadata();
    if (isEdit && id) fetchExistingDevice(id);
  }, [id]);

  const fetchMetadata = async () => {
    try {
      const typesRes = await apiFetch<{ success: boolean; deviceTypes: DeviceType[] }>('/devices/types');
      if (typesRes.success) {
        setTypes(typesRes.deviceTypes);
      }

      const sitesRes = await apiFetch<{ success: boolean; sites: Site[] }>('/sites');
      if (sitesRes.success) {
        setSites(sitesRes.sites);
      }
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  const fetchExistingDevice = async (deviceId: string) => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; device: Device }>(`/devices/${deviceId}`);
      if (res.success && res.device) {
        const d = res.device;
        setFormData({
          device_name: d.device_name || '',
          device_type_id: d.device_type_id || '',
          site_id: d.site_id || '',
          vendor: d.vendor || '',
          model: d.model || '',
          management_ip: d.management_ip || '',
          hostname: d.hostname || '',
          management_vlan: d.management_vlan ? d.management_vlan.toString() : '',
          mac_address: d.mac_address || '',
          serial_number: d.serial_number || '',
          asset_tag: d.asset_tag || '',
          ssh_port: d.ssh_port ? d.ssh_port.toString() : '22',
          http_port: d.http_port ? d.http_port.toString() : '80',
          https_port: d.https_port ? d.https_port.toString() : '443',
          telnet_port: d.telnet_port ? d.telnet_port.toString() : '23',
          snmp_port: d.snmp_port ? d.snmp_port.toString() : '161',
          description: d.description || '',
          notes: d.notes || '',
          status: d.status || 'ACTIVE',
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load device data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.device_name || !formData.device_name.trim()) {
      showToast('Device name is required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const url = isEdit ? `/devices/${id}` : '/devices';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await apiFetch<{ success: boolean; message: string; deviceId?: string }>(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (res.success) {
        showToast(res.message || (isEdit ? 'Device updated.' : 'Device created.'));
        const targetId = isEdit ? id : res.deviceId;
        navigate(`/devices/${targetId}`);
      }
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading form data...</div>;
  }

  return (
    <div className="w-full space-y-4">
      {/* Back Link */}
      <div>
        <Link
          to="/devices"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>
      </div>

      {/* Device Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Router className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isEdit ? 'Edit Network Device' : 'Add Network Device'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter the device details, network information, site assignment, and access configuration.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Device Name *</label>
                <input
                  type="text"
                  name="device_name"
                  required
                  value={formData.device_name}
                  onChange={handleChange}
                  placeholder="e.g. SGY-OLT1 or CORE-RTR"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Device Type</label>
                <select
                  name="device_type_id"
                  value={formData.device_type_id}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select Device Type (Optional)</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Site</label>
                <select
                  name="site_id"
                  value={formData.site_id}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select Site (Optional)</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Vendor</label>
                <input
                  type="text"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleChange}
                  placeholder="MikroTik, Huawei, Cisco, Dell..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="CCR2004, MA5608T, PowerEdge R640..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Network Information */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Network Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Management IP</label>
                <input
                  type="text"
                  name="management_ip"
                  value={formData.management_ip}
                  onChange={handleChange}
                  placeholder="192.168.1.1"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-cyan-600 dark:text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">MAC Address</label>
                <input
                  type="text"
                  name="mac_address"
                  value={formData.mac_address}
                  onChange={handleChange}
                  placeholder="00:11:22:33:44:55"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Hostname</label>
                <input
                  type="text"
                  name="hostname"
                  value={formData.hostname}
                  onChange={handleChange}
                  placeholder="core-rtr.hq.internal"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Management VLAN</label>
                <input
                  type="number"
                  name="management_vlan"
                  value={formData.management_vlan}
                  onChange={handleChange}
                  placeholder="10"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Serial Number</label>
                <input
                  type="text"
                  name="serial_number"
                  value={formData.serial_number}
                  onChange={handleChange}
                  placeholder="SN-99882211"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Access Ports */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Access Ports</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">SSH Port</label>
                <input
                  type="number"
                  name="ssh_port"
                  value={formData.ssh_port}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-600 dark:text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">HTTP Port</label>
                <input
                  type="number"
                  name="http_port"
                  value={formData.http_port}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-600 dark:text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">HTTPS Port</label>
                <input
                  type="number"
                  name="https_port"
                  value={formData.https_port}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-600 dark:text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">Telnet Port</label>
                <input
                  type="number"
                  name="telnet_port"
                  value={formData.telnet_port}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-600 dark:text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">SNMP Port</label>
                <input
                  type="number"
                  name="snmp_port"
                  value={formData.snmp_port}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-600 dark:text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Description & Notes */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Description & Notes</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Primary core router serving HQ network..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Link
              to="/devices"
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : isEdit ? 'Update Device' : 'Save Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

