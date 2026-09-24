import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { apiFetch } from '../lib/api.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hasPermission: (permissionCode: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; user: User }>('/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    const res = await apiFetch<{ success: boolean; user: User; message?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (res.success && res.user) {
      setUser(res.user);
    } else {
      throw new Error(res.message || 'Login failed.');
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permissionCode);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

