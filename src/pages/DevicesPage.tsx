import React, { useEffect, useState, useRef } from 'react';
import { apiFetch } from '../lib/api.js';
import { Device, DeviceType, Site } from '../types/index.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../components/common/Toast.js';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  KeyRound,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Server,
  Layers,
  MapPin,
} from 'lucide-react';

export const DevicesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [devices, setDevices] = useState<Device[]>([]);
  const [types, setTypes] = useState<DeviceType[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeId, setTypeId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Action Menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuId]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [search, typeId, siteId, status, page]);

  const fetchMetadata = async () => {
    try {
      const typesRes = await apiFetch<{ success: boolean; deviceTypes: DeviceType[] }>('/devices/types');
      if (typesRes.success) setTypes(typesRes.deviceTypes);

      const sitesRes = await apiFetch<{ success: boolean; sites: Site[] }>('/sites');
      if (sitesRes.success) setSites(sitesRes.sites);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(typeId && { typeId }),
        ...(siteId && { siteId }),
        ...(status && { status }),
      });

      const res = await apiFetch<{
        success: boolean;
        devices: Device[];
        pagination: { totalPages: number };
      }>(`/devices?${queryParams}`);

      if (res.success) {
        setDevices(res.devices);
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to mark device "${name}" as DECOMMISSIONED?`)) return;

    try {
      const res = await apiFetch<{ success: boolean; message: string }>(`/devices/${id}/deactivate`, {
        method: 'POST',
        body: JSON.stringify({ status: 'DECOMMISSIONED' }),
      });

      if (res.success) {
        showToast(res.message);
        fetchDevices();
      }
    } catch (err: any) {
      showToast(err.message || 'Deactivation failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Network Devices</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Centralized inventory for routers, OLTs, switches, firewalls, and servers</p>
        </div>

        {hasPermission('devices.create') && (
          <Link
            to="/devices/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" />
            Add Network Device
          </Link>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-xl space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by device name, management IP, hostname, vendor, model, site, serial..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 pl-10"
          />
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {/* Device Type */}
          <select
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Device Types</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Site */}
          <select
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="DECOMMISSIONED">DECOMMISSIONED</option>
          </select>
        </div>
      </div>

      {/* Devices Responsive Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs">Loading network devices...</div>
        ) : devices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Server className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No network devices found.</p>
            <p className="text-xs text-slate-500">Try adjusting your search query or filter settings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Device Name</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Site</th>
                  <th className="px-4 py-3.5">Management IP</th>
                  <th className="px-4 py-3.5">Vendor / Model</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-center">Credentials</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
                {devices.map((device) => (
                  <tr key={device.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Device Name */}
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white font-sans">
                      <Link to={`/devices/${device.id}`} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                        {device.device_name}
                      </Link>
                      {device.hostname && <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{device.hostname}</p>}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400 font-sans">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                        <Layers className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        {device.device_type_name}
                      </span>
                    </td>

                    {/* Site */}
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300 font-sans">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>{device.site_name}</span>
                      </div>
                    </td>

                    {/* Management IP */}
                    <td className="px-4 py-4 text-cyan-600 dark:text-cyan-400 font-mono font-semibold">{device.management_ip || '—'}</td>

                    {/* Vendor / Model */}
                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400 font-sans">
                      {device.vendor || '-'} {device.model ? `(${device.model})` : ''}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <StatusBadge status={device.status} />
                    </td>

                    {/* Credentials Count */}
                    <td className="px-4 py-4 text-center font-sans">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold">
                        <KeyRound className="w-3 h-3" />
                        {device.credential_count || 0}
                      </span>
                    </td>

                    {/* Actions Menu */}
                    <td className="px-6 py-4 text-right relative font-sans" ref={activeMenuId === device.id ? menuRef : null}>
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === device.id ? null : device.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Actions menu"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === device.id && (
                        <div
                          className="absolute right-6 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1 z-20 text-left font-sans animate-in fade-in zoom-in-95"
                          onClick={() => setActiveMenuId(null)}
                        >
                          <Link
                            to={`/devices/${device.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                          >
                            <Eye className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> View Details
                          </Link>

                          {hasPermission('devices.update') && (
                            <Link
                              to={`/devices/${device.id}/edit`}
                              className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                            >
                              <Edit className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Edit Device
                            </Link>
                          )}

                          <Link
                            to={`/devices/${device.id}#credentials`}
                            className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                          >
                            <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Manage Credentials
                          </Link>

                          {hasPermission('devices.deactivate') && device.status !== 'DECOMMISSIONED' && (
                            <div className="border-t border-slate-200 dark:border-slate-800 mt-1 pt-1">
                              <button
                                onClick={() => handleDeactivate(device.id, device.device_name)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 text-left"
                              >
                                <Trash2 className="w-4 h-4" /> Deactivate / Decommission
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
