import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar.js';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('netvault_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('netvault_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Full-Height Sidebar on Left Column */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area starting directly to the right of Sidebar */}
      <div className="flex-1 overflow-y-auto min-w-0 w-full h-screen relative">
        {/* Mobile Menu Floating Trigger (Visible only on mobile lg:hidden) */}
        <div className="lg:hidden fixed top-4 left-4 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-lg flex items-center justify-center"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <main className="p-5 sm:p-6 max-w-[1600px] w-full mx-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
