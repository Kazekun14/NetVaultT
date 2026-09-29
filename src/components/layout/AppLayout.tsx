import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';
import { Outlet } from 'react-router-dom';

export const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('netvault_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('netvault_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      <Header
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 flex min-w-0">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
