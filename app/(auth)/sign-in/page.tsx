'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import { getRoleHome } from '@/lib/rbac';
import {
  Layers,
  LayoutDashboard,
  ClipboardList,
  Briefcase,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  { email: 'cio@bank.com', name: 'Mahesh Iyer', desc: 'Executive Value Command Center — portfolio, value board, risk', icon: LayoutDashboard },
  { email: 'pmo@bank.com', name: 'Anita Desai', desc: 'PMO Governance Control Tower — full portfolio, RAG, delays', icon: ClipboardList },
  { email: 'vh@bank.com', name: 'Rajesh Kumar', desc: 'Delivery Ownership Workspace — your vertical\'s commitments & Delivery Confidence', icon: Briefcase },
  { email: 'business@bank.com', name: 'Anil Kumar', desc: 'Business Value Validation — confirm whether IT delivered the promised impact', icon: CheckSquare },
];

const DEMO_PASSWORD = 'Demo@1234!';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError('Invalid email or password.');
      } else {
        const session = await getSession();
        router.push(session?.user?.role ? getRoleHome(session.user.role) : '/');
        router.refresh();
      }
    });
  };

  const prefill = (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(acc.email);
    setPassword(DEMO_PASSWORD);
    setError('');
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

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
            A banking-focused IT value intelligence platform that helps CIOs and PMO teams
            translate delivery progress, risks, delays, and outcomes into leadership-ready
            business value.
          </p>

          <div className="mt-8 space-y-4 border-t border-white/10 pt-7">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Demo walkthrough</p>
            {[
              {
                n: '01',
                role: 'Start as CIO',
                text: 'See how many initiatives are active, where delivery risk exists, what is delayed, and which outcomes are expected this period.',
              },
              {
                n: '02',
                role: 'Switch to PMO',
                text: 'Drill into ownership, stage movement, delay source, and business validation across the full portfolio.',
              },
              {
                n: '03',
                role: 'Switch to Business SPOC',
                text: 'Confirm whether the promised value was actually achieved once an initiative goes live.',
              },
            ].map(s => (
              <div key={s.n} className="flex gap-3">
                <span className="mt-0.5 font-mono text-xs font-bold text-brand-400">{s.n}</span>
                <div>
                  <p className="text-xs font-semibold text-white">{s.role}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Link
          href="/"
          className="relative inline-flex w-fit items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>
      </div>

      {/* Sign-in panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Sign in to IT Value Bridge</h2>
            <p className="mt-1 text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link href="/sign-up" className="font-medium text-brand-600 hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          {/* Demo quick-login */}
          <div className="mb-5 rounded-xl border border-brand-200 bg-white p-4 shadow-card">
            <div className="mb-3 flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Follow the demo story</p>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600">Click to prefill</span>
            </div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc, i) => {
                const Icon = acc.icon;
                const step = String(i + 1).padStart(2, '0');
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => prefill(acc)}
                    className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition-all hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="font-mono text-[10px] font-bold text-slate-300 group-hover:text-brand-400">{step}</span>
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800">{acc.name}</div>
                      <div className="truncate text-[11px] text-slate-500">{acc.desc}</div>
                    </div>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-slate-300 group-hover:text-brand-500" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sign-in form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@bank.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls + ' pr-10'}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(v => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-400">
            Demo password: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">Demo@1234!</code>
          </p>
        </div>
      </div>
    </main>
  );
}
