'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Activity, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

export function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white">
      {/* soft indigo wash, never purple/pink */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px circle at 12% -10%, rgba(79,70,229,0.10), transparent 45%), radial-gradient(700px circle at 95% 0%, rgba(99,102,241,0.07), transparent 40%)',
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Copy */}
          <div>
            <motion.span
              {...rise(0)}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
            >
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.25} />
              Built for banking IT portfolios
            </motion.span>

            <motion.h1
              {...rise(0.08)}
              className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl"
            >
              Translate IT delivery into business value leadership can read.
            </motion.h1>

            <motion.p
              {...rise(0.16)}
              className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600"
            >
              Track every Change Request and Project from BRD to business validation — across
              Waterfall and Agile — with live RAG health, PMBOK knowledge areas, and executive
              reporting that connects delivery to outcomes.
            </motion.p>

            <motion.div {...rise(0.24)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-in"
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                See a live demo
              </Link>
            </motion.div>

            <motion.p {...rise(0.3)} className="mt-4 text-xs text-slate-500">
              Four leadership views · 11-stage delivery pipeline · seeded with 20 realistic items
            </motion.p>
          </div>

          {/* Product preview mock */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={reduce ? {} : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <HeroPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card-hover">
      <div className="rounded-xl bg-slate-50 p-4">
        {/* window chrome */}
        <div className="mb-4 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-[11px] font-medium text-slate-400">CIO Dashboard</span>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: 'Active', value: '19', icon: Activity, accent: 'bg-brand-500', tint: 'bg-brand-50 text-brand-600' },
            { label: 'On Track', value: '11', icon: CheckCircle2, accent: 'bg-emerald-500', tint: 'bg-emerald-50 text-emerald-600' },
            { label: 'At Risk', value: '5', icon: AlertTriangle, accent: 'bg-amber-500', tint: 'bg-amber-50 text-amber-600' },
            { label: 'Delayed', value: '3', icon: AlertOctagon, accent: 'bg-rose-500', tint: 'bg-rose-50 text-rose-600' },
          ].map(k => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-3">
                <span className={`absolute inset-y-0 left-0 w-1 ${k.accent}`} />
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${k.tint}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
                <div className="mt-2 text-xl font-semibold tabular text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {k.value}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{k.label}</div>
              </div>
            );
          })}
        </div>

        {/* mini funnel */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 text-[11px] font-semibold text-slate-500">Pipeline by stage</div>
          <div className="space-y-1.5">
            {[
              { stage: 'BRD', w: '92%', c: 'bg-brand-300' },
              { stage: 'Development', w: '70%', c: 'bg-brand-500' },
              { stage: 'UAT', w: '48%', c: 'bg-brand-600' },
              { stage: 'Go Live', w: '30%', c: 'bg-brand-700' },
              { stage: 'Closed', w: '18%', c: 'bg-slate-400' },
            ].map(r => (
              <div key={r.stage} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-[10px] text-slate-500">{r.stage}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span className={`block h-full rounded-full ${r.c}`} style={{ width: r.w }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
