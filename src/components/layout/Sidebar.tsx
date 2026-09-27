import React, { useState, useEffect } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

// Custom BarsSort icon (3 sorted horizontal lines of decreasing lengths)
const BarsSortIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="15" y2="12" />
    <line x1="3" y1="18" x2="9" y2="18" />
  </svg>
);

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('netvault_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('netvault_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, perm: 'dashboard.view' },
    { label: 'Network Devices', path: '/devices', icon: RouterIcon, perm: 'devices.view' },
    { label: 'Credentials', path: '/credentials', icon: KeyRound, perm: 'credentials.view' },
    { label: 'Sites', path: '/sites', icon: MapPin, perm: 'sites.view' },
    { label: 'Audit Logs', path: '/audit-logs', icon: ScrollText, perm: 'audit.view' },
    { label: 'Users', path: '/users', icon: Users, perm: 'users.view' },
    { label: 'Roles & Permissions', path: '/roles', icon: ShieldCheck, perm: 'roles.manage' },
    { label: 'Settings', path: '/settings', icon: Settings, perm: 'settings.manage' },
  ];

  const allowedItems = navItems.filter((item) => hasPermission(item.perm));

  const renderSidebarContent = (isMobile = false) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div
        className={`flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center border-b border-slate-800 transition-all duration-300 min-h-[73px] ${
            isCollapsed ? 'justify-center px-2 py-4' : 'justify-between px-5 py-4'
          }`}
        >
          {/* Expanded State Header */}
          {!isCollapsed && (
            <>
              <div className="flex items-center gap-3 shrink-0">
                <img src="/netvaultt.svg" alt="NetVaultT" className="w-8 h-8 shrink-0 drop-shadow-md" />
                <div className="overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap opacity-100 max-w-[180px]">
                  <h1 className="font-bold text-white tracking-wider text-base font-mono leading-none">NetVaultT</h1>
                  <span className="text-[9px] text-cyan-400 font-semibold tracking-wider uppercase block mt-1">
                    Infrastructure Vault
                  </span>
                </div>
              </div>

              {!isMobile && (
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors shrink-0 flex items-center justify-center"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <Menu className="w-5 h-5 text-slate-300 hover:text-cyan-400" />
                </button>
              )}
            </>
          )}

          {/* Collapsed State: Centered Bars-Sort Toggle Icon */}
          {isCollapsed && !isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors flex items-center justify-center"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <BarsSortIcon className="w-5 h-5 text-cyan-400" />
            </button>
          )}

          {/* Mobile Drawer Close Button */}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <div className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3'} py-5 overflow-y-auto space-y-1.5 scrollbar-thin`}>
          <div
            className={`px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${
              isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[200px]'
            }`}
          >
            Main Navigation
          </div>

          {allowedItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center transition-all duration-200 ${
                    isCollapsed ? 'justify-center w-full py-3 px-0' : 'gap-3 px-3 py-2.5'
                  } rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
                end={item.path === '/'}
              >
                <Icon className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                <span
                  className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                    isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[200px]'
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>

        {/* Footer Banner */}
        <div className="p-3 border-t border-slate-800">
          <div
            className={`bg-slate-950/60 rounded-xl border border-slate-800 flex items-center transition-all duration-300 ${
              isCollapsed ? 'justify-center p-3' : 'gap-3 p-3'
            }`}
            title={isCollapsed ? 'AES-256 Protected - Zero Plaintext Storage' : undefined}
          >
            <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0" />
            <div
              className={`text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[180px]'
              }`}
            >
              <p className="text-slate-200 font-medium">AES-256 Protected</p>
              <p className="text-slate-500 text-[10px]">Zero Plaintext Storage</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block h-screen sticky top-0 shrink-0 z-40">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10">{renderSidebarContent(true)}</div>
        </div>
      )}
    </>
  );
};
