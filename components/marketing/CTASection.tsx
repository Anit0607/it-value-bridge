'use client';

import Link from 'next/link';
import { ArrowRight, Lock, History, KeySquare } from 'lucide-react';
import { Reveal } from './Reveal';

const TRUST = [
  { icon: KeySquare, label: 'Role-based access control' },
  { icon: History, label: 'Full audit history on every change' },
  { icon: Lock, label: 'Computed RAG — no manual fudging' },
];

export function CTASection() {
  return (
    <section id="reporting" className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-navy-900 px-6 py-14 text-center shadow-card-hover sm:px-12 lg:py-20">
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                background:
                  'radial-gradient(600px circle at 20% 0%, rgba(79,70,229,0.35), transparent 45%), radial-gradient(500px circle at 90% 100%, rgba(99,102,241,0.22), transparent 40%)',
              }}
              aria-hidden
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Give leadership a clear line of sight from IT delivery to business value.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-400">
                Sign in with a demo role and explore the full portfolio in seconds.
              </p>

              <div className="mt-8 flex justify-center">
                <Link
                  href="/sign-in"
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-500"
                >
                  Get started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                {TRUST.map(t => {
                  const Icon = t.icon;
                  return (
                    <div key={t.label} className="flex items-center gap-2 text-sm text-slate-400">
                      <Icon className="h-4 w-4 text-brand-300" strokeWidth={2} />
                      {t.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
