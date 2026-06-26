'use client';

import { Reveal } from './Reveal';

export function WhyNowSection() {
  return (
    <section className="border-b border-slate-200 bg-white py-14 lg:py-18">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xl font-medium leading-relaxed text-slate-700 sm:text-2xl sm:text-center">
            As IT portfolios become larger, faster, and more regulatory-driven, leadership needs
            more than{' '}
            <span className="font-semibold text-slate-400 line-through decoration-rose-400/50">
              Excel trackers and status meetings.
            </span>{' '}
            They need a single value layer that connects{' '}
            <span className="font-semibold text-brand-700">
              delivery progress, governance health, risk, and business outcomes.
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
