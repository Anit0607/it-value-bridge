'use client';

import { Reveal } from './Reveal';

const STATS = [
  { value: '11', label: 'Delivery stages, BRD → Closed' },
  { value: '10', label: 'PMBOK knowledge areas tracked' },
  { value: '4', label: 'Role-based leadership views' },
  { value: '2', label: 'Methodologies — Waterfall & Agile' },
];

export function StatsBand() {
  return (
    <section id="health" className="border-b border-slate-200 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <dt
                  className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {s.value}
                </dt>
                <dd className="mx-auto mt-2 max-w-[12rem] text-sm leading-snug text-slate-600">
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
