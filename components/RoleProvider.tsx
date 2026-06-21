'use client';

import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@/lib/types';
import { getRoleHome } from '@/lib/rbac';
import type { Role } from '@prisma/client';

interface RoleContextValue {
  user: AuthUser | null;
  logout: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name!,
        role: session.user.role,
        verticalHead: session.user.verticalHead,
      }
    : null;

  const logout = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <RoleContext.Provider value={{ user, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}

export function useRequireAuth(): AuthUser | null {
  const { user } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/sign-in');
  }, [user, router]);

  return user;
}
