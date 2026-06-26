'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ShieldCheck, TrendingUp, BadgeCheck, Coins, Scale } from 'lucide-react';

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
              IT Business Value Intelligence Platform
            </motion.span>

            <motion.h1
              {...rise(0.08)}
              className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl"
            >
              Turn IT Delivery Into Business Value Leadership Can Act On
            </motion.h1>

            <motion.p
              {...rise(0.16)}
              className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600"
            >
              IT Value Bridge helps banking IT, PMO, and governance teams convert CRs, projects,
              delays, RAG health, and post-go-live outcomes into executive-ready value intelligence.
            </motion.p>

            <motion.div {...rise(0.24)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cio"
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                View CIO Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                Explore Demo Roles
              </Link>
            </motion.div>

            <motion.p {...rise(0.3)} className="mt-4 text-xs text-slate-500">
              Built for banking IT governance, portfolio reviews, business validation, and leadership reporting.
            </motion.p>
          </div>

          {/* Product preview mock */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={reduce ? {} : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <motion.div
              animate={reduce ? {} : { y: [0, -7, 0] }}
              transition={reduce ? {} : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            >
              <HeroPreview reduce={!!reduce} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function CountUp({ to, reduce, delay = 0 }: { to: number; reduce: boolean; delay?: number }) {
  const [n, setN] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) {
      setN(to);
      return;
    }
    let raf = 0;
    let startTime = 0;
    const duration = 900;
    const tick = (t: number) => {
      if (!startTime) startTime = t;
      const elapsed = t - startTime - delay * 1000;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, reduce, delay]);
  return <>{n}</>;
}

const KPIS = [
  { label: 'Projected Value', value: 220, prefix: '₹', suffix: ' Cr', display: '', icon: TrendingUp, accent: 'bg-brand-500', tint: 'bg-brand-50 text-brand-600' },
  { label: 'Signed-off', value: 160, prefix: '₹', suffix: ' Cr', display: '', icon: BadgeCheck, accent: 'bg-emerald-500', tint: 'bg-emerald-50 text-emerald-600' },
  { label: 'Realized (FY)', value: 2, prefix: '₹', suffix: ' Cr', display: '', icon: Coins, accent: 'bg-amber-500', tint: 'bg-amber-50 text-amber-600' },
  { label: 'Value vs Cost', value: 0, prefix: '', suffix: '', display: '2.6x', icon: Scale, accent: 'bg-brand-500', tint: 'bg-brand-50 text-brand-600' },
];

// Value contributed by benefit category — widths ∝ ₹ (Revenue is the max).
const VALUE_BY_CATEGORY = [
  { label: 'Revenue', w: '100%', c: 'bg-emerald-500', amt: '₹116 Cr' },
  { label: 'Customer Exp.', w: '37%', c: 'bg-violet-500', amt: '₹42.5 Cr' },
  { label: 'Efficiency', w: '24%', c: 'bg-brand-500', amt: '₹28 Cr' },
  { label: 'Risk Reduction', w: '16%', c: 'bg-rose-500', amt: '₹18 Cr' },
  { label: 'Compliance', w: '8%', c: 'bg-amber-500', amt: '₹9.5 Cr' },
];

function HeroPreview({ reduce }: { reduce: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-card-hover">
      <div className="rounded-xl bg-slate-50 p-4">
        {/* window chrome */}
        <div className="mb-4 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-[11px] font-medium text-slate-400">Board-Ready Value</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              animate={reduce ? {} : { opacity: [1, 0.25, 1] }}
              transition={reduce ? {} : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            Live
          </span>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {KPIS.map((k, i) => {
            const Icon = k.icon;
            return (
              <motion.div
                key={k.label}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={reduce ? {} : { opacity: 1, y: 0 }}
                transition={reduce ? {} : { duration: 0.45, delay: 0.35 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-3"
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${k.accent}`} />
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${k.tint}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                </span>
                <div
                  className="mt-2 text-xl font-semibold text-slate-900"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {k.display ? (
                    k.display
                  ) : (
                    <>
                      {k.prefix}
                      <CountUp to={k.value} reduce={reduce} delay={0.4 + i * 0.08} />
                      {k.suffix}
                    </>
                  )}
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{k.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* value by category */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Value by benefit category</span>
            <span className="text-[10px] text-slate-400">projected annual ₹</span>
          </div>
          <div className="space-y-1.5">
            {VALUE_BY_CATEGORY.map((r, i) => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-[10px] text-slate-500">{r.label}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <motion.span
                    className={`block h-full rounded-full ${r.c}`}
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: r.w }}
                    transition={reduce ? {} : { duration: 0.9, delay: 0.5 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right text-[10px] font-semibold text-slate-700" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.amt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
