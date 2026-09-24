import React, { useState } from 'react';
import { Menu, LogOut, User as UserIcon, Shield, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  setMobileOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setMobileOpen }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const primaryRole = user?.roles?.[0]?.name || 'User';

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="text-cyan-400 font-bold">NetVaultT</span>
          <span>/</span>
          <span>Credential Manager</span>
        </div>
      </div>

      {/* User Avatar Menu */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {user?.firstName?.[0] || 'U'}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-semibold text-white leading-tight">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-[11px] text-cyan-400 font-medium leading-tight flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {primaryRole}
            </div>
          </div>
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-2"
            onClick={() => setDropdownOpen(false)}
          >
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-xs font-semibold text-white">{user?.username}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>

            <Link
              to="/profile"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <UserIcon className="w-4 h-4 text-cyan-400" />
              My Profile
            </Link>

            <Link
              to="/profile"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Key className="w-4 h-4 text-amber-400" />
              Change Password
            </Link>

            <div className="border-t border-slate-800 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left font-medium"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

