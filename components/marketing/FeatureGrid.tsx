'use client';

import {
  GitBranch,
  Activity,
  FileBarChart,
  Target,
  ShieldAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Reveal } from './Reveal';

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: Target,
    title: 'Board-ready value intelligence',
    body: 'Translate every CR and project into ₹ ROI the board can read. Projected value, signed-off value, and realized benefit — by category, OKR, and vertical — in one dashboard.',
  },
  {
    icon: Activity,
    title: 'Portfolio health at a glance',
    body: 'Red / Amber / Green is computed at render from real dates — overdue stages and stale updates surface automatically. No manual status-setting, no stale dashboards.',
  },
  {
    icon: FileBarChart,
    title: 'Board & MD-ready reporting',
    body: 'One-click period report: promised vs delivered vs missed, delay sources with owner accountability, regulatory commitments, and outcomes realized — exportable for leadership.',
  },
  {
    icon: Users,
    title: 'Four leadership views, zero noise',
    body: 'CIO sees the portfolio and value board. PMO tracks stages and delays. Vertical Heads own their commitments. Business SPOCs validate outcomes. Each role sees exactly what matters to them.',
  },
  {
    icon: GitBranch,
    title: 'Waterfall and Agile in one place',
    body: 'Run each initiative as Waterfall (11-stage pipeline from BRD to Closed) or Agile (epics, sprints, velocity, burndown). The tracker adapts per initiative.',
  },
  {
    icon: ShieldAlert,
    title: 'Governance and risk registers',
    body: 'Regulatory compliance flags, delay accountability with owner and reason, cross-system dependency tracking, and full audit history on every change.',
  },
];

export function FeatureGrid() {
  return (
    <section id="methodology" className="border-b border-slate-200 bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            IT Business Value Intelligence
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            The intelligence layer between IT delivery and business value
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            From demand intake to board-ready ROI — methodology, health, risk and value realization
            on a single, consistent surface built for banking.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={(i % 3) * 0.06}>
                <div className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
