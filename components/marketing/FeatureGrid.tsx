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
    icon: GitBranch,
    title: 'Dual methodology',
    body: 'Run each initiative as Waterfall (11-stage pipeline mapped to delivery phases) or Agile (epics, sprints, velocity, burndown). The tracker adapts per initiative.',
  },
  {
    icon: Activity,
    title: 'Live RAG portfolio health',
    body: 'Red / Amber / Green is computed at render from real dates — overdue stages and stale updates surface automatically. No manual status-setting, no stale dashboards.',
  },
  {
    icon: FileBarChart,
    title: 'Executive monthly reporting',
    body: 'One-click monthly report: committed vs delivered vs missed, delay sources, and business outcomes — with an AI narrative for leadership and PDF export.',
  },
  {
    icon: Target,
    title: 'Business-value realization',
    body: 'Capture the intended outcome up front, then validate what was actually achieved against the target metric. Close the loop between IT delivery and business value.',
  },
  {
    icon: ShieldAlert,
    title: 'Risk & stakeholder registers',
    body: 'A governance matrix across scope, schedule, cost, quality and risk — plus risk and stakeholder registers on every initiative.',
  },
  {
    icon: Users,
    title: 'Role-based dashboards',
    body: 'Tailored views for CIO, PMO, Vertical Head and Business SPOC — each role sees exactly the portfolio slice and actions that matter to them.',
  },
];

export function FeatureGrid() {
  return (
    <section id="methodology" className="border-b border-slate-200 bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            One system, end to end
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Everything PMO and leadership need in one place
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            From intake to business validation — methodology, health, risk and reporting on a
            single, consistent surface.
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
