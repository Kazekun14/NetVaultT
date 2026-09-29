import React, { useEffect, useState, useRef } from 'react';
import { apiFetch } from '../lib/api.js';
import { Credential, Site, DeviceType } from '../types/index.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../components/common/Toast.js';
import { RevealModal } from '../components/credentials/RevealModal.js';
import { ReAuthModal } from '../components/credentials/ReAuthModal.js';
import { AddEditCredentialModal } from '../components/credentials/AddEditCredentialModal.js';
import { ChangePasswordModal } from '../components/credentials/ChangePasswordModal.js';
import { Link } from 'react-router-dom';

import {
  KeyRound,
  Search,
  MoreVertical,
  Eye,
  Copy,
  Edit,
  Lock,
  ChevronLeft,
  ChevronRight,
  Server,
} from 'lucide-react';

export const CredentialsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [types, setTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [siteId, setSiteId] = useState('');
  const [deviceTypeId, setDeviceTypeId] = useState('');
  const [protocol, setProtocol] = useState('');
  const [privilege, setPrivilege] = useState('');
  const [rotationStatus, setRotationStatus] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Actions Dropdown state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Reveal / ReAuth state
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealedPass, setRevealedPass] = useState<string | null>(null);
  const [autoHideSecs, setAutoHideSecs] = useState(20);
  const [activeCredInfo, setActiveCredInfo] = useState<{ name: string; username: string; deviceName: string } | null>(null);
  const [reAuthOpen, setReAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  // Edit / Change Pass modals
  const [editingCred, setEditingCred] = useState<Credential | null>(null);
  const [changePassCred, setChangePassCred] = useState<Credential | null>(null);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [search, siteId, deviceTypeId, protocol, privilege, rotationStatus, status, page]);

  const fetchMetadata = async () => {
    try {
      const sitesRes = await apiFetch<{ success: boolean; sites: Site[] }>('/sites');
      if (sitesRes.success) setSites(sitesRes.sites);

      const typesRes = await apiFetch<{ success: boolean; deviceTypes: DeviceType[] }>('/devices/types');
      if (typesRes.success) setTypes(typesRes.deviceTypes);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(siteId && { siteId }),
        ...(deviceTypeId && { deviceTypeId }),
        ...(protocol && { protocol }),
        ...(privilege && { privilege }),
        ...(rotationStatus && { rotationStatus }),
        ...(status && { status }),
      });

      const res = await apiFetch<{
        success: boolean;
        credentials: Credential[];
        pagination: { totalPages: number };
      }>(`/credentials?${queryParams}`);

      if (res.success) {
        setCredentials(res.credentials);
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async (cred: Credential, reauthPass?: string) => {
    try {
      const options: RequestInit = { method: 'POST' };
      if (reauthPass) {
        options.headers = { 'x-reauth-password': reauthPass };
      }

      const res = await apiFetch<{
        success: boolean;
        password?: string;
        autoHideSeconds?: number;
        reauthRequired?: boolean;
        message?: string;
      }>(`/credentials/${cred.id}/reveal`, options);

      if (res.reauthRequired) {
        setPendingAction(() => () => handleReveal(cred, reauthPass));
        setReAuthOpen(true);
        return;
      }

      if (res.success && res.password) {
        setRevealedPass(res.password);
        setAutoHideSecs(res.autoHideSeconds || 20);
        setActiveCredInfo({
          name: cred.credential_name,
          username: cred.username,
          deviceName: cred.device_name || 'Device',
        });
        setRevealOpen(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to reveal credential', 'error');
    }
  };

  const handleCopyPassword = async (cred: Credential) => {
    try {
      const res = await apiFetch<{ success: boolean; password?: string }>(`/credentials/${cred.id}/copy-access`, {
        method: 'POST',
      });

      if (res.success && res.password) {
        navigator.clipboard.writeText(res.password);
        showToast('Password copied to clipboard.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to copy password', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Credential Vault</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">AES-256 encrypted credential records and password rotation tracking</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-xl space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search credentials by name, username, device, management IP..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 pl-10"
          />
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
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
                {s.name}
              </option>
            ))}
          </select>

          {/* Protocol */}
          <select
            value={protocol}
            onChange={(e) => {
              setProtocol(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Protocols</option>
            <option value="WEB">WEB</option>
            <option value="HTTP">HTTP</option>
            <option value="HTTPS">HTTPS</option>
            <option value="SSH">SSH</option>
            <option value="TELNET">TELNET</option>
            <option value="API">API</option>
            <option value="SNMP">SNMP</option>
            <option value="OTHER">OTHER</option>
          </select>

          {/* Privilege */}
          <select
            value={privilege}
            onChange={(e) => {
              setPrivilege(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Privileges</option>
            <option value="ADMIN">ADMIN</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="READ ONLY">READ ONLY</option>
            <option value="SERVICE ACCOUNT">SERVICE ACCOUNT</option>
            <option value="OTHER">OTHER</option>
          </select>

          {/* Rotation Status */}
          <select
            value={rotationStatus}
            onChange={(e) => {
              setRotationStatus(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Rotation Statuses</option>
            <option value="CURRENT">CURRENT</option>
            <option value="DUE_SOON">DUE SOON</option>
            <option value="OVERDUE">OVERDUE</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs animate-pulse">Loading credential vault...</div>
        ) : credentials.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <KeyRound className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No credentials found.</p>
            <p className="text-xs text-slate-500">Try clearing filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Device</th>
                  <th className="px-4 py-3.5">Credential Name</th>
                  <th className="px-4 py-3.5">Username</th>
                  <th className="px-4 py-3.5">Protocol</th>
                  <th className="px-4 py-3.5">Privilege</th>
                  <th className="px-4 py-3.5">Site</th>
                  <th className="px-4 py-3.5">Password Age</th>
                  <th className="px-4 py-3.5">Rotation</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
                {credentials.map((cred) => (
                  <tr key={cred.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Device */}
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white font-sans">
                      <Link to={`/devices/${cred.device_id}`} className="hover:text-cyan-600 dark:hover:text-cyan-400">
                        {cred.device_name}
                      </Link>
                      <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">{cred.management_ip}</p>
                    </td>

                    {/* Credential Name */}
                    <td className="px-4 py-4 font-semibold text-slate-800 dark:text-slate-200 font-sans">{cred.credential_name}</td>

                    {/* Username */}
                    <td className="px-4 py-4 text-cyan-600 dark:text-cyan-400 font-mono">{cred.username}</td>

                    {/* Protocol */}
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-cyan-700 dark:text-cyan-300">
                        {cred.protocol} {cred.port ? `:${cred.port}` : ''}
                      </span>
                    </td>

                    {/* Privilege */}
                    <td className="px-4 py-4 text-purple-600 dark:text-purple-400 font-semibold font-sans">{cred.privilege_level}</td>

                    {/* Site */}
                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400 font-sans">{cred.site_name}</td>

                    {/* Password Age */}
                    <td className="px-4 py-4 text-slate-700 dark:text-slate-300 font-sans">{cred.passwordAgeDays} days old</td>

                    {/* Rotation Status */}
                    <td className="px-4 py-4">
                      <StatusBadge status={cred.rotationStatus} />
                    </td>

                    {/* Actions Menu */}
                    <td className="px-6 py-4 text-right relative font-sans">
                      <div className="flex items-center justify-end gap-1" ref={activeMenuId === cred.id ? menuRef : null}>
                        {hasPermission('credentials.reveal') && (
                          <button
                            onClick={() => handleReveal(cred)}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Reveal Password"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        {hasPermission('credentials.copy') && (
                          <button
                            onClick={() => handleCopyPassword(cred)}
                            className="p-1.5 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-lg transition-colors"
                            title="Copy Password"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => setActiveMenuId(activeMenuId === cred.id ? null : cred.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === cred.id && (
                          <div
                            className="absolute right-6 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1 z-20 text-left font-sans animate-in fade-in zoom-in-95"
                            onClick={() => setActiveMenuId(null)}
                          >
                            <Link
                              to={`/devices/${cred.device_id}`}
                              className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                            >
                              <Server className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> View Device
                            </Link>

                            {hasPermission('credentials.update') && (
                              <>
                                <button
                                  onClick={() => setEditingCred(cred)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white text-left"
                                >
                                  <Edit className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Edit Metadata
                                </button>

                                <button
                                  onClick={() => setChangePassCred(cred)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-700 dark:hover:text-amber-300 text-left"
                                >
                                  <Lock className="w-4 h-4" /> Change Password
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
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

      {/* Modals */}
      <RevealModal
        isOpen={revealOpen}
        onClose={() => {
          setRevealOpen(false);
          setRevealedPass(null);
        }}
        credentialName={activeCredInfo?.name || ''}
        username={activeCredInfo?.username || ''}
        deviceName={activeCredInfo?.deviceName || ''}
        plaintextPassword={revealedPass}
        autoHideSeconds={autoHideSecs}
      />

      <ReAuthModal
        isOpen={reAuthOpen}
        onClose={() => {
          setReAuthOpen(false);
          setPendingAction(null);
        }}
        onConfirm={async (pass) => {
          if (pendingAction) await pendingAction();
        }}
      />

      {editingCred && (
        <AddEditCredentialModal
          isOpen={!!editingCred}
          onClose={() => setEditingCred(null)}
          deviceId={editingCred.device_id}
          credential={editingCred}
          onSuccess={fetchCredentials}
        />
      )}

      {changePassCred && (
        <ChangePasswordModal
          isOpen={!!changePassCred}
          onClose={() => setChangePassCred(null)}
          credentialId={changePassCred.id}
          credentialName={changePassCred.credential_name}
          onSuccess={fetchCredentials}
        />
      )}
    </div>
  );
};
