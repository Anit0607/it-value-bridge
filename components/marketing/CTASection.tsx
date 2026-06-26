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
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-card sm:px-12 lg:py-20">
            {/* soft indigo wash — same treatment as the hero, never navy */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(700px circle at 50% -20%, rgba(79,70,229,0.10), transparent 55%), radial-gradient(500px circle at 90% 120%, rgba(99,102,241,0.07), transparent 45%)',
              }}
              aria-hidden
            />
            <div className="relative">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                Get started
              </p>
              <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Stop reporting effort. Start communicating value.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
                See how banking IT delivery becomes board-ready value intelligence. Sign in with a demo role and explore the full portfolio in under a minute.
              </p>

              <div className="mt-8 flex justify-center">
                <Link
                  href="/sign-in"
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                >
                  Get started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-slate-100 pt-8">
                {TRUST.map(t => {
                  const Icon = t.icon;
                  return (
                    <div key={t.label} className="flex items-center gap-2 text-sm text-slate-600">
                      <Icon className="h-4 w-4 text-brand-600" strokeWidth={2} />
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
