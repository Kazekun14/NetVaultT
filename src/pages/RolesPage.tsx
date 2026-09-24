import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { Role, Permission } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../components/common/Toast.js';
import { ShieldCheck, Plus, Edit, Check, X, Save } from 'lucide-react';

export const RolesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissionCodes: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const rolesRes = await apiFetch<{ success: boolean; roles: Role[] }>('/roles');
      if (rolesRes.success) setRoles(rolesRes.roles);

      const permsRes = await apiFetch<{ success: boolean; permissions: Permission[] }>('/roles/permissions');
      if (permsRes.success) setAllPermissions(permsRes.permissions);
    } catch (err) {
      console.error('Failed to load roles data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', permissionCodes: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name || '',
      description: role.description || '',
      permissionCodes: role.permissions ? role.permissions.map((p) => p.code) : [],
    });
    setIsModalOpen(true);
  };

  const togglePermission = (code: string) => {
    setFormData((prev) => {
      const exists = prev.permissionCodes.includes(code);
      return {
        ...prev,
        permissionCodes: exists ? prev.permissionCodes.filter((c) => c !== code) : [...prev.permissionCodes, code],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('Role name is required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const url = editingRole ? `/roles/${editingRole.id}` : '/roles';
      const method = editingRole ? 'PATCH' : 'POST';

      const res = await apiFetch<{ success: boolean; message: string }>(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (res.success) {
        showToast(res.message || (editingRole ? 'Role updated.' : 'Role created.'));
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Roles & Granular Permissions</h1>
          <p className="text-xs text-slate-400 mt-1">Configure role capabilities and access permissions matrix</p>
        </div>

        {hasPermission('roles.manage') && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Create Custom Role
          </button>
        )}
      </div>

      {/* Roles List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs animate-pulse">Loading permissions matrix...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">{role.name}</h3>
                      {role.is_system_role === 1 && (
                        <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] px-2 py-0.5 rounded font-mono font-semibold">
                          SYSTEM ROLE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{role.description || 'No description'}</p>
                  </div>
                </div>

                {hasPermission('roles.manage') && (
                  <button
                    onClick={() => handleOpenEdit(role)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    title="Edit Role Permissions"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Permission Pills */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Granted Permissions ({role.permissions?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions?.map((p) => (
                    <span
                      key={p.code}
                      className="px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800 text-[10px] font-mono"
                    >
                      {p.code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">
                    {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure granted permission codes</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Role Name *</label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.is_system_role === 1}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Permission Matrix Checkboxes */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Permissions Matrix ({formData.permissionCodes.length} selected)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  {allPermissions.map((perm) => {
                    const checked = formData.permissionCodes.includes(perm.code);
                    return (
                      <label
                        key={perm.code}
                        onClick={() => togglePermission(perm.code)}
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                          checked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            checked ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-700'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="text-xs">
                          <span className="font-mono font-bold block">{perm.code}</span>
                          <span className="text-[10px] text-slate-400 block">{perm.name}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  <Save className="w-4 h-4" />
                  {submitting ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

