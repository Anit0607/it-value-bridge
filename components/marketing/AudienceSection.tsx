'use client';

import { Reveal } from './Reveal';

interface Role {
  badge: string;
  title: string;
  tagline: string;
  points: string[];
  accent: string;
  badgeColor: string;
}

const ROLES: Role[] = [
  {
    badge: 'Primary Buyer',
    title: 'CIO / CTO / Head of IT',
    tagline: 'Portfolio visibility. Board confidence. Value proof.',
    points: [
      'Portfolio RAG health across all CRs and projects',
      'Board-ready ₹ ROI and value realization reports',
      'Governance confidence — delays, risks, and owners surfaced',
      'MD/Board-ready updates without chasing the PMO',
    ],
    accent: 'border-brand-500 bg-brand-50/40',
    badgeColor: 'bg-brand-100 text-brand-700',
  },
  {
    badge: 'Primary Daily User',
    title: 'PMO / IT Governance Team',
    tagline: 'Track, govern, escalate, report.',
    points: [
      'CR and project stage movement with live RAG',
      'Delay ownership and accountability tracking',
      'Monthly delivery vs committed reporting',
      'Regulatory and compliance watch',
    ],
    accent: 'border-emerald-400 bg-emerald-50/30',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  {
    badge: 'Secondary User',
    title: 'Vertical Head',
    tagline: 'Your delivery. Your accountability.',
    points: [
      "View only their vertical's pipeline",
      'Flag delays with reasons and owners',
      'Current-stage accountability without noise',
    ],
    accent: 'border-amber-400 bg-amber-50/30',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
  {
    badge: 'Validation User',
    title: 'Business SPOC / Sponsor',
    tagline: 'Did we get what was promised?',
    points: [
      'Validate business outcomes post-go-live',
      'Actual benefit realized vs expected target',
      'Sign off on value realization milestones',
    ],
    accent: 'border-violet-400 bg-violet-50/30',
    badgeColor: 'bg-violet-100 text-violet-700',
  },
];

export function AudienceSection() {
  return (
    <section className="border-b border-slate-200 bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Built for every layer of IT leadership
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            The homepage sells to the CIO.<br className="hidden sm:block" /> The product serves the PMO.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Four distinct roles. One platform. Each sees exactly the intelligence that matters to them.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r, i) => (
            <Reveal key={r.title} delay={i * 0.07}>
              <div className={`flex h-full flex-col rounded-xl border-2 p-5 ${r.accent}`}>
                <span className={`self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${r.badgeColor}`}>
                  {r.badge}
                </span>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{r.title}</h3>
                <p className="mt-1 text-sm font-medium text-slate-500">{r.tagline}</p>
                <ul className="mt-4 space-y-2">
                  {r.points.map(p => (
                    <li key={p} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
