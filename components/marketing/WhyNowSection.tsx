'use client';

import { Reveal } from './Reveal';
import { Clock, TrendingUp, ShieldAlert, BarChart3 } from 'lucide-react';

const SIGNALS = [
  { icon: TrendingUp, label: 'Growing CR & project volumes', sub: 'Portfolios expanding faster than governance can scale' },
  { icon: ShieldAlert, label: 'Heightened regulatory scrutiny', sub: 'RBI, audits, and compliance timelines demand clear accountability' },
  { icon: BarChart3, label: 'Board demands on IT ROI', sub: 'Leadership wants ₹ outcomes, not stage percentages' },
];

export function WhyNowSection() {
  return (
    <section className="border-b border-slate-200 bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <Clock className="h-3.5 w-3.5" strokeWidth={2.25} />
            Why now
          </span>
          <p className="mt-5 text-2xl font-medium leading-relaxed text-slate-800 sm:text-3xl">
            As IT portfolios become larger, faster, and more regulatory-driven, leadership cannot
            rely only on{' '}
            <span className="text-slate-400 line-through decoration-rose-400/60">
              manual updates, Excel trackers, and status meetings.
            </span>
          </p>
          <p className="mt-4 text-xl font-medium leading-relaxed text-brand-700">
            They need a single value layer that connects delivery progress, governance health, risk,
            and business outcomes.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            {SIGNALS.map(s => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
                    <Icon className="h-4 w-4 text-brand-600" strokeWidth={2} />
                  </span>
                  <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{s.sub}</p>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
