'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@/lib/types';

const USER_KEY = 'it-value-bridge-user';

interface RoleContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const login = (u: AuthUser) => {
    setUser(u);
    try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch { /* ignore */ }
  };

  const logout = () => {
    setUser(null);
    try { localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
  };

  return (
    <RoleContext.Provider value={{ user, login, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}

export function useRequireAuth() {
  const { user } = useRole();
  const router = useRouter();
  useEffect(() => {
    if (!user) router.push('/');
  }, [user, router]);
  return user;
}
