import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './components/common/Toast.js';
import { AppLayout } from './components/layout/AppLayout.js';

import { SignInPage } from './pages/SignInPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { DevicesPage } from './pages/DevicesPage.js';
import { DeviceDetailsPage } from './pages/DeviceDetailsPage.js';
import { AddEditDevicePage } from './pages/AddEditDevicePage.js';
import { CredentialsPage } from './pages/CredentialsPage.js';
import { SitesPage } from './pages/SitesPage.js';
import { AuditLogsPage } from './pages/AuditLogsPage.js';
import { UsersPage } from './pages/UsersPage.js';
import { RolesPage } from './pages/RolesPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { ProfilePage } from './pages/ProfilePage.js';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; perm?: string }> = ({ children, perm }) => {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-mono">
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (perm && !hasPermission(perm)) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-2">
        <h2 className="text-xl font-bold text-rose-400">403 - Forbidden</h2>
        <p className="text-xs">You do not have permission to view this page ({perm}).</p>
      </div>
    );
  }

  return <>{children}</>;
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/signin" element={<SignInPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />

              <Route
                path="devices"
                element={
                  <ProtectedRoute perm="devices.view">
                    <DevicesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="devices/new"
                element={
                  <ProtectedRoute perm="devices.create">
                    <AddEditDevicePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="devices/:id"
                element={
                  <ProtectedRoute perm="devices.view">
                    <DeviceDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="devices/:id/edit"
                element={
                  <ProtectedRoute perm="devices.update">
                    <AddEditDevicePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="credentials"
                element={
                  <ProtectedRoute perm="credentials.view">
                    <CredentialsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="sites"
                element={
                  <ProtectedRoute perm="sites.view">
                    <SitesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute perm="audit.view">
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="users"
                element={
                  <ProtectedRoute perm="users.view">
                    <UsersPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="roles"
                element={
                  <ProtectedRoute perm="roles.manage">
                    <RolesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="settings"
                element={
                  <ProtectedRoute perm="settings.manage">
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
