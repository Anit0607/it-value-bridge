'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRole } from '@/components/RoleProvider';
import { DEMO_USERS } from '@/lib/auth';
import type { AuthUser, Role } from '@/lib/types';
import {
  Layers,
  LayoutDashboard,
  ClipboardList,
  Briefcase,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

const ROLE_HOME: Record<Role, string> = {
  cio: '/cio',
  pmo: '/pmo',
  vh: '/vertical-head',
  business: '/business',
};

const ROLE_META: Record<Role, { desc: string; icon: LucideIcon }> = {
  cio: { desc: 'Executive overview of portfolio health & value', icon: LayoutDashboard },
  pmo: { desc: 'Full portfolio management & attention flags', icon: ClipboardList },
  vh: { desc: "Your vertical's items, stage & RAG status", icon: Briefcase },
  business: { desc: 'Items where you are the business SPOC', icon: CheckSquare },
};

export default function SignInPage() {
  const { user, login } = useRole();
  const router = useRouter();

  useEffect(() => {
    if (user) router.push(ROLE_HOME[user.role]);
  }, [user, router]);

  const handleLogin = (u: AuthUser) => {
    login(u);
    router.push(ROLE_HOME[u.role]);
  };

  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-navy-900 px-8 py-10 text-white lg:w-2/5 lg:px-12 lg:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(600px circle at 20% 10%, rgba(79,70,229,0.35), transparent 45%), radial-gradient(500px circle at 90% 90%, rgba(99,102,241,0.25), transparent 40%)',
          }}
          aria-hidden
        />
        <Link href="/" className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-lg">
            <Layers className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <span className="text-lg font-semibold">IT Value Bridge</span>
        </Link>
        <div className="relative hidden lg:block">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Bridge IT delivery to<br />measurable business value.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Track every Change Request and Project from BRD to business validation — with live RAG
            health, stage pipelines, and outcome reporting for banking IT portfolios.
          </p>
        </div>
        <Link
          href="/"
          className="relative inline-flex w-fit items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>
      </div>

      {/* Login panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Select a role to continue</h2>
            <p className="mt-1 text-sm text-slate-500">
              No authentication required — this is a demo. Real sign-in arrives in the next build
              phase.
            </p>
          </div>

          <div className="space-y-2.5">
            {DEMO_USERS.map(u => {
              const meta = ROLE_META[u.role];
              const Icon = meta.icon;
              return (
                <button
                  key={u.email}
                  onClick={() => handleLogin(u)}
                  className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-card transition-all hover:border-brand-300 hover:shadow-card-hover"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">{u.name}</div>
                    <div className="truncate text-xs text-slate-500">{meta.desc}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition-colors group-hover:text-brand-500" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
