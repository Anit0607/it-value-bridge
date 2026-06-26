'use client';

import { Reveal } from './Reveal';

export function PainSection() {
  return (
    <section className="border-b border-slate-200 bg-slate-50 py-14 lg:py-18">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xl font-medium leading-relaxed text-slate-700 sm:text-2xl sm:text-center">
            Banking IT teams deliver hundreds of CRs, projects, fixes, and regulatory changes —
            but leadership often sees{' '}
            <span className="font-semibold text-rose-600">
              fragmented updates, unclear business impact, delayed escalations, and manual
              governance decks.
            </span>{' '}
            <span className="text-slate-400">·</span>{' '}
            IT Value Bridge closes this gap by converting delivery progress into{' '}
            <span className="font-semibold text-brand-700">
              value, risk, accountability, and outcome intelligence.
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
