import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Router as RouterIcon,
  KeyRound,
  MapPin,
  ScrollText,
  Users,
  ShieldCheck,
  Settings,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { hasPermission } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, perm: 'dashboard.view' },
    { label: 'Devices', path: '/devices', icon: RouterIcon, perm: 'devices.view' },
    { label: 'Credentials', path: '/credentials', icon: KeyRound, perm: 'credentials.view' },
    { label: 'Sites', path: '/sites', icon: MapPin, perm: 'sites.view' },
    { label: 'Audit Logs', path: '/audit-logs', icon: ScrollText, perm: 'audit.view' },
    { label: 'Users', path: '/users', icon: Users, perm: 'users.view' },
    { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck, perm: 'roles.manage' },
    { label: 'Settings', path: '/settings', icon: Settings, perm: 'settings.manage' },
  ];

  const allowedItems = navItems.filter((item) => hasPermission(item.perm));

  const content = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-64 text-slate-300">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 font-bold text-lg">
            N
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wider text-lg font-mono leading-none">NetVaultT</h1>
            <span className="text-[10px] text-cyan-400 font-semibold tracking-wider uppercase">Infrastructure Vault</span>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 py-6 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Main Navigation
        </div>

        {allowedItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
              end={item.path === '/'}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer Banner */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="text-slate-200 font-medium">AES-256 Protected</p>
            <p className="text-slate-500 text-[10px]">Zero Plaintext Storage</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block h-screen sticky top-0 shrink-0">{content}</aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">{content}</div>
        </div>
      )}
    </>
  );
};

