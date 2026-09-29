import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Router as RouterIcon,
  KeyRound,
  MapPin,
  ScrollText,
  Users,
  ShieldCheck,
  Settings,
  X,
  User as UserIcon,
  LogOut,
  ChevronUp,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, mobileOpen, setMobileOpen }) => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/signin');
  };

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

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() || user.username : 'Administrator';
  const roleName = user?.roles?.[0]?.name || 'System Administrator';
  const initials = user
    ? `${user.firstName?.[0] || 'A'}${user.lastName?.[0] || 'D'}`.toUpperCase()
    : 'SA';

  const renderSidebarContent = (isMobile = false) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div
        className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-colors duration-200 transition-all ease-in-out select-none ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Mobile Drawer Header */}
        {isMobile && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <img src="/netvaultt.svg" alt="NetVaultT" className="w-8 h-8 shrink-0 drop-shadow-md" />
              <div>
                <h1 className="font-bold text-slate-900 dark:text-white tracking-wider text-base font-mono leading-none">NetVaultT</h1>
                <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-semibold tracking-wider uppercase block mt-1">
                  Infrastructure Vault
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <div className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3'} py-5 overflow-y-auto space-y-1.5 scrollbar-thin`}>
          <div
            className={`px-3 pb-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${
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
                      ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 font-semibold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
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

        {/* User Account / Administrator Section (Bottom of Sidebar) */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 relative" ref={menuRef}>
          {/* User Popover Dropdown Menu */}
          {userMenuOpen && (
            <div
              className={`absolute bottom-full mb-2 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 space-y-3 transition-all animate-in fade-in slide-in-from-bottom-2 ${
                isCollapsed ? 'left-3 w-64' : 'left-3 right-3'
              }`}
            >
              {/* User Header Details */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Session</span>
                  </div>
                  <Shield className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{fullName}</p>
                <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono font-medium truncate">{roleName}</p>
                {user?.email && <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>}
              </div>

              {/* Menu Links */}
              <div className="space-y-1 text-xs">
                <NavLink
                  to="/profile"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  <UserIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>My Profile</span>
                </NavLink>

                <NavLink
                  to="/profile"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Change Password</span>
                </NavLink>
              </div>

              {/* Logout Button */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-xs font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* Sidebar Bottom User Trigger Button */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`w-full bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center transition-all duration-200 text-left ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between p-3'
            }`}
            title={isCollapsed ? `${fullName} (${roleName})` : undefined}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar circle */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-300 dark:border-cyan-500/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400 font-bold text-xs font-mono shadow-inner">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
              </div>

              {/* User text details */}
              <div
                className={`text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out min-w-0 ${
                  isCollapsed ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-[140px]'
                }`}
              >
                <p className="text-slate-900 dark:text-white font-semibold truncate leading-tight">{fullName}</p>
                <p className="text-cyan-600 dark:text-cyan-400 text-[10px] font-mono truncate mt-0.5">{roleName}</p>
              </div>
            </div>

            {!isCollapsed && (
              <ChevronUp
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  userMenuOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : ''
                }`}
              />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sticky Sidebar (below top navbar) */}
      <aside className="hidden lg:block h-[calc(100vh-4rem)] sticky top-16 shrink-0 z-40">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full">{renderSidebarContent(true)}</div>
        </div>
      )}
    </>
  );
};
