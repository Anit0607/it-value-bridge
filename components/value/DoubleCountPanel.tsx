import Link from 'next/link';
import { formatInr, BENEFIT_CATEGORY_LABEL } from '@/lib/value';
import type { DoubleCountRisk } from '@/lib/integrity';
import type { BenefitCategory } from '@prisma/client';
import { GitMerge, ShieldCheck } from 'lucide-react';

/**
 * Portfolio double-count review (docs/ROADMAP.md M3).
 *
 * Two initiatives claiming the same benefit pool silently inflate the portfolio
 * total, and it is the first thing a sharp CFO tests. Framed as "review these",
 * never "these are wrong" — two initiatives genuinely improving the same metric
 * in different business units is a legitimate pattern that only a human can
 * distinguish from a duplicate claim.
 */
export function DoubleCountPanel({ risks }: { risks: DoubleCountRisk[] }) {
  if (risks.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Double-Count Review
        </h2>
        <p className="text-xs text-slate-500">
          No two initiatives currently claim the same benefit metric in the same category. The portfolio total does
          not contain a detectable duplicate claim.
        </p>
      </div>
    );
  }

  const exposure = risks.reduce((s, r) => s + r.combinedValueInr, 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <GitMerge className="h-4 w-4 text-amber-500" />
          Double-Count Review
        </h2>
        <span className="text-xs text-slate-500">
          <span className="tabular font-semibold text-amber-600">{formatInr(exposure)}</span> across{' '}
          {risks.length} shared {risks.length === 1 ? 'metric' : 'metrics'}
        </span>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-slate-500">
        These initiatives claim the same benefit metric in the same category, so part of this value may be counted
        more than once in the portfolio total. This is a prompt to review, not a finding — separate business units
        legitimately improve the same metric.
      </p>

      <div className="space-y-3">
        {risks.map(r => (
          <div key={`${r.category}::${r.metric}`} className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-800">{r.metricLabel}</span>
              <span className="tabular text-xs font-semibold text-amber-700">{formatInr(r.combinedValueInr)}</span>
            </div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-400">
              {BENEFIT_CATEGORY_LABEL[r.category as BenefitCategory]}
            </div>
            <ul className="mt-2 space-y-1">
              {r.initiatives.map(i => (
                <li key={i.id} className="flex items-center justify-between gap-3 text-xs">
                  <Link href={`/items/${i.id}`} className="truncate font-medium text-slate-700 hover:text-brand-700">
                    {i.title}
                  </Link>
                  <span className="flex-shrink-0 tabular text-slate-500">{formatInr(i.valueInr)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
