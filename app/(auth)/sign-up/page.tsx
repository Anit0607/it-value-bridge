'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { signUpAction } from '@/lib/actions/auth';
import { Layers, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

export default function SignUpPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signUpAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      const signInResult = await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirect: false,
      });
      if (signInResult?.error) {
        router.push('/sign-in');
      } else {
        router.push('/business');
      }
    });
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
            Get started with<br />IT Value Bridge.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            New accounts are created as Business SPOC by default. Your PMO team can elevate your
            role once you&apos;re in.
          </p>
        </div>
        <Link
          href="/sign-in"
          className="relative inline-flex w-fit items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Already have an account? Sign in
        </Link>
      </div>

      {/* Sign-up panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Create your account</h2>
            <p className="mt-1 text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/sign-in" className="font-medium text-brand-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
              <input
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Your full name"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Work Email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@bank.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
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
              {isPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
