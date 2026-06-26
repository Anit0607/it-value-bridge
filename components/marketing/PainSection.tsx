'use client';

import { Reveal } from './Reveal';
import { AlertTriangle, ArrowRight, Zap } from 'lucide-react';

export function PainSection() {
  return (
    <section className="border-b border-slate-200 bg-slate-50 py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2 lg:gap-12">

          {/* The problem */}
          <Reveal>
            <div className="flex flex-col gap-4">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.25} />
                The problem
              </span>
              <p className="text-xl font-medium leading-relaxed text-slate-800 sm:text-2xl">
                Banking IT teams deliver hundreds of CRs, projects, fixes, and regulatory changes —
                but leadership often sees{' '}
                <span className="text-rose-600">
                  fragmented updates, delayed escalations, unclear business impact, and manual
                  governance decks.
                </span>
              </p>
            </div>
          </Reveal>

          {/* The resolution */}
          <Reveal delay={0.1}>
            <div className="flex flex-col justify-center gap-4">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                <Zap className="h-3.5 w-3.5" strokeWidth={2.25} />
                The resolution
              </span>
              <p className="text-xl font-medium leading-relaxed text-slate-800 sm:text-2xl">
                IT Value Bridge closes this gap by converting operational delivery data into{' '}
                <span className="text-brand-700">
                  value, risk, accountability, and outcome intelligence
                </span>{' '}
                leadership can act on.
              </p>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-brand-600">
                <ArrowRight className="h-4 w-4" />
                Board-ready — not a status update
              </div>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
}
