import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { Device, Credential } from '../types/index.js';
import { StatusBadge } from '../components/common/StatusBadge.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../components/common/Toast.js';
import { RevealModal } from '../components/credentials/RevealModal.js';
import { ReAuthModal } from '../components/credentials/ReAuthModal.js';
import { AddEditCredentialModal } from '../components/credentials/AddEditCredentialModal.js';
import { ChangePasswordModal } from '../components/credentials/ChangePasswordModal.js';

import {
  ArrowLeft,
  Router,
  MapPin,
  KeyRound,
  Eye,
  Copy,
  Edit,
  Lock,
  Plus,
  Shield,
  Clock,
  ExternalLink,
  Layers,
} from 'lucide-react';

export const DeviceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);

  // Reveal Modal State
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [autoHideSeconds, setAutoHideSeconds] = useState(20);
  const [activeCredInfo, setActiveCredInfo] = useState<{ name: string; username: string } | null>(null);

  // ReAuth Modal State
  const [reAuthOpen, setReAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  // Credential Modal State
  const [addCredOpen, setAddCredOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<Credential | null>(null);
  const [changePassCred, setChangePassCred] = useState<Credential | null>(null);

  useEffect(() => {
    if (id) fetchDeviceDetails();
  }, [id]);

  const fetchDeviceDetails = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; device: Device }>(`/devices/${id}`);
      if (res.success) {
        setDevice(res.device);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load device details', 'error');
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
        setRevealedPassword(res.password);
        setAutoHideSeconds(res.autoHideSeconds || 20);
        setActiveCredInfo({ name: cred.credential_name, username: cred.username });
        setRevealModalOpen(true);
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

  const handleCopyUsername = (username: string) => {
    navigator.clipboard.writeText(username);
    showToast('Username copied to clipboard.');
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading device specifications...</div>;
  }

  if (!device) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Device not found.</p>
        <button onClick={() => navigate('/devices')} className="mt-4 text-cyan-600 dark:text-cyan-400 hover:underline text-xs">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <Link to="/devices" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>

        {hasPermission('devices.update') && (
          <Link
            to={`/devices/${device.id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Edit className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Edit Device Info
          </Link>
        )}
      </div>

      {/* Main Header Banner Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
              <Router className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{device.device_name}</h1>
                <StatusBadge status={device.status} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Network Device Specification & Credential Record
              </p>
            </div>
          </div>
        </div>

        {/* Clean Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{device.device_type_name || 'Unspecified'}</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{device.site_name || 'Unassigned'}</span>
            {device.site_code && device.site_code !== 'N/A' && (
              <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">({device.site_code})</span>
            )}
          </div>

          {device.management_ip ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono font-bold text-cyan-700 dark:text-cyan-400">
              <span>{device.management_ip}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-mono font-semibold text-slate-400 dark:text-slate-500">
              <span>No IP Assigned</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid Specs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* General Specifications */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-3">
            General Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Vendor</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{device.vendor || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Model</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{device.model || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Serial Number</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{device.serial_number || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Asset Tag</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{device.asset_tag || '-'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Description</span>
              <span className="text-slate-700 dark:text-slate-300">{device.description || 'No description provided.'}</span>
            </div>
          </div>
        </div>

        {/* Network & Infrastructure */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-3">
            Network & Access Ports
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 font-sans block">Management IP</span>
              <span className="font-bold text-cyan-600 dark:text-cyan-400">{device.management_ip}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block">Hostname</span>
              <span className="text-slate-700 dark:text-slate-300">{device.hostname || '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block">Management VLAN</span>
              <span className="text-slate-700 dark:text-slate-300">{device.management_vlan ? `VLAN ${device.management_vlan}` : '-'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block">MAC Address</span>
              <span className="text-slate-700 dark:text-slate-300">{device.mac_address || '-'}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex flex-wrap gap-3 text-[11px] font-sans">
              <span className="bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                SSH: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{device.ssh_port}</strong>
              </span>
              <span className="bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                HTTP: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{device.http_port}</strong>
              </span>
              <span className="bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                HTTPS: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{device.https_port}</strong>
              </span>
              <span className="bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                Telnet: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{device.telnet_port}</strong>
              </span>
              <span className="bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                SNMP: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{device.snmp_port}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Device Credentials */}
      <div id="credentials" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Attached Device Credentials</h2>
          </div>

          {hasPermission('credentials.create') && (
            <button
              onClick={() => setAddCredOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" /> Add Credential
            </button>
          )}
        </div>

        {!device.credentials || device.credentials.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            No credentials are configured for this device.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {device.credentials.map((cred) => (
              <div
                key={cred.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{cred.credential_name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-cyan-600 dark:text-cyan-400">
                        {cred.protocol} {cred.port ? `:${cred.port}` : ''}
                      </span>
                      <span>•</span>
                      <span className="text-purple-600 dark:text-purple-400 font-semibold">{cred.privilege_level}</span>
                    </div>
                  </div>

                  <StatusBadge status={cred.status} />
                </div>

                {/* Account Details */}
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Username:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-900 dark:text-white font-bold">{cred.username}</span>
                      <button
                        onClick={() => handleCopyUsername(cred.username)}
                        className="text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 p-1"
                        title="Copy username"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Password:</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 tracking-widest">{cred.passwordMasked}</span>
                  </div>

                  {cred.login_url && (
                    <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pt-1">
                      <span>Login URL:</span>
                      <a
                        href={cred.login_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-mono truncate max-w-[200px]"
                      >
                        {cred.login_url} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {hasPermission('credentials.reveal') && (
                      <button
                        onClick={() => handleReveal(cred)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Reveal
                      </button>
                    )}

                    {hasPermission('credentials.copy') && (
                      <button
                        onClick={() => handleCopyPassword(cred)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Password
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {hasPermission('credentials.update') && (
                      <>
                        <button
                          onClick={() => setEditingCred(cred)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Credential Metadata"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setChangePassCred(cred)}
                          className="p-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Change Password"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <RevealModal
        isOpen={revealModalOpen}
        onClose={() => {
          setRevealModalOpen(false);
          setRevealedPassword(null);
        }}
        credentialName={activeCredInfo?.name || ''}
        username={activeCredInfo?.username || ''}
        deviceName={device.device_name}
        plaintextPassword={revealedPassword}
        autoHideSeconds={autoHideSeconds}
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

      {addCredOpen && (
        <AddEditCredentialModal
          isOpen={addCredOpen}
          onClose={() => setAddCredOpen(false)}
          deviceId={device.id}
          onSuccess={fetchDeviceDetails}
        />
      )}

      {editingCred && (
        <AddEditCredentialModal
          isOpen={!!editingCred}
          onClose={() => setEditingCred(null)}
          deviceId={device.id}
          credential={editingCred}
          onSuccess={fetchDeviceDetails}
        />
      )}

      {changePassCred && (
        <ChangePasswordModal
          isOpen={!!changePassCred}
          onClose={() => setChangePassCred(null)}
          credentialId={changePassCred.id}
          credentialName={changePassCred.credential_name}
          onSuccess={fetchDeviceDetails}
        />
      )}
    </div>
  );
};

