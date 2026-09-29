import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext.js';

// Custom BarsSort icon (3 sorted horizontal lines of decreasing lengths)
export const BarsSortIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
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

interface HeaderProps {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setMobileOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ collapsed, setCollapsed, setMobileOpen }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 px-4 lg:px-6 flex items-center justify-between shadow-sm transition-colors duration-200 select-none">
      {/* Left side: Brand Logo & Title */}
      <Link to="/" className="flex items-center gap-3 shrink-0 group">
        <img src="/netvaultt.svg" alt="NetVaultT" className="w-8 h-8 shrink-0 drop-shadow-md group-hover:scale-105 transition-transform" />
        <div className="flex flex-col">
          <h1 className="font-bold text-slate-900 dark:text-white tracking-wider text-base font-mono leading-none">NetVaultT</h1>
          <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-semibold tracking-wider uppercase block mt-1">
            Infrastructure Vault
          </span>
        </div>
      </Link>

      {/* Right side: Dark/Light Mode Toggle + Dynamic Sidebar Toggle Button */}
      <div className="flex items-center gap-3">
        {/* Dark / Light Mode Toggle Button (positioned before hamburger / bar sort) */}
        <button
          onClick={toggleTheme}
          className="flex text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all items-center justify-center shrink-0 shadow-sm"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700" />
          )}
        </button>

        {/* Desktop Sidebar Toggle Button (Hamburger when expanded, Bars-Sort when collapsed) */}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="hidden lg:flex text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all items-center justify-center shrink-0 shadow-sm"
          title={collapsed ? 'Expand sidebar (Bars-Sort)' : 'Collapse sidebar (Hamburger)'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <BarsSortIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          ) : (
            <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400" />
          )}
        </button>

        {/* Mobile Drawer Trigger Button */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
