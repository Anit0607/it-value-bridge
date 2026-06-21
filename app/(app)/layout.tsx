'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/app/TopBar';
import { useRole } from '@/components/RoleProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useRole();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <div className="lg:ml-64">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
