import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { Site } from '../types/index.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../components/common/Toast.js';
import { MapPin, Plus, Search, Edit, Eye, X, Save } from 'lucide-react';

export const SitesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add/Edit Site Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    address: '',
    contact_person: '',
    contact_number: '',
    status: 'ACTIVE',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSites();
  }, [search, statusFilter]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await apiFetch<{ success: boolean; sites: Site[] }>(`/sites?${queryParams}`);
      if (res.success) {
        setSites(res.sites);
      }
    } catch (err) {
      console.error('Failed to load sites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSite(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      address: '',
      contact_person: '',
      contact_number: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (site: Site) => {
    setEditingSite(site);
    setFormData({
      code: site.code || '',
      name: site.name || '',
      description: site.description || '',
      address: site.address || '',
      contact_person: site.contact_person || '',
      contact_number: site.contact_number || '',
      status: site.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      showToast('Site code and name are required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const url = editingSite ? `/sites/${editingSite.id}` : '/sites';
      const method = editingSite ? 'PATCH' : 'POST';

      const res = await apiFetch<{ success: boolean; message: string }>(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (res.success) {
        showToast(res.message || (editingSite ? 'Site updated.' : 'Site created.'));
        setIsModalOpen(false);
        fetchSites();
      }
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Physical & Logical Sites</h1>
          <p className="text-xs text-slate-400 mt-1">Group network devices by data center, headend, POP, or regional facility</p>
        </div>

        {hasPermission('sites.create') && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-amber-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Site
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by site code, name, address, contact..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 pl-10"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading sites...</div>
      ) : sites.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <MapPin className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No sites have been created yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => (
            <div
              key={site.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-sm">
                    {site.code}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{site.name}</h3>
                    <p className="text-xs text-slate-400">{site.address || 'No address specified'}</p>
                  </div>
                </div>

                <StatusBadge status={site.status} />
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 block">Contact Person</span>
                  <span className="font-semibold text-slate-200">{site.contact_person || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Contact Number</span>
                  <span className="font-mono text-cyan-400">{site.contact_number || '-'}</span>
                </div>
                {site.description && (
                  <div>
                    <span className="text-slate-500 block">Description</span>
                    <span className="text-slate-400">{site.description}</span>
                  </div>
                )}
              </div>

              {hasPermission('sites.update') && (
                <div className="pt-3 border-t border-slate-800/80 flex justify-end">
                  <button
                    onClick={() => handleOpenEdit(site)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Site
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">{editingSite ? 'Edit Site' : 'Add New Site'}</h3>
                  <p className="text-xs text-slate-400">Physical or logical location</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Site Code *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingSite)}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="HQ, SGY, CLP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Site Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Main Office Data Center"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="John Doe"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Number</label>
                  <input
                    type="text"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    placeholder="+63 917 123 4567"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Tech Park Ave..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Notes or details..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-amber-600/20"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? 'Saving...' : editingSite ? 'Update Site' : 'Save Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

