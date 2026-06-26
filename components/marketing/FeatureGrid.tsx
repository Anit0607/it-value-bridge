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
    title: 'Delivery Risk Intelligence',
    body: 'Red / Amber / Green is computed at render from real dates — overdue stages and stale updates surface automatically. No manual status-setting, no stale dashboards.',
  },
  {
    icon: FileBarChart,
    title: 'Leadership Value Summary',
    body: 'One-click period report: promised vs delivered vs missed, delay accountability by owner and source, regulatory commitments, and outcomes realized — exportable for leadership.',
  },
  {
    icon: Users,
    title: 'Role-Based Leadership Views',
    body: 'Executive Command Center for the CIO, Governance Control Tower for PMO, Delivery Ownership View for Vertical Heads, Business Impact Validation for SPOCs.',
  },
  {
    icon: GitBranch,
    title: 'Governance Lifecycle Visibility',
    body: 'Every initiative tracked across 11 governance milestones — BRD through Business Validation to Closed — in Waterfall or Agile. Stage progress, SLA dates, and ownership in one place.',
  },
  {
    icon: ShieldAlert,
    title: 'Accountability & Bottleneck Mapping',
    body: 'Delay source attributed to IT, Business, Vendor, or External. Regulatory flags with due dates. Cross-system dependencies. Full audit history on every change.',
  },
];

export function FeatureGrid() {
  return (
    <section id="platform" className="border-b border-slate-200 bg-slate-50 py-20 lg:py-28">
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
