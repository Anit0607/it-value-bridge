export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { PrintButton } from '@/components/PrintButton';
import { getLearningView } from '@/lib/queries/learning';
import { ReadinessPanel } from '@/components/learning/ReadinessPanel';
import { AccuracyByDimension } from '@/components/learning/AccuracyByDimension';
import { formatInr } from '@/lib/value';
import { BENEFIT_CATEGORY_LABEL } from '@/lib/value';
import { INVESTMENT_CATEGORY_LABEL } from '@/lib/investment';
import {
  ASSESSMENT_LABEL, accuracyTone, MIN_SAMPLE_FOR_PATTERN,
  type ClaimAssessment,
} from '@/lib/learning';
import { GraduationCap, Lock, ArrowRight, History } from 'lucide-react';

const RATIO_TEXT: Record<string, string> = {
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
  rose: 'text-rose-700',
  slate: 'text-slate-400',
};

const STATUS_TONE: Record<string, string> = {
  assessable: 'bg-emerald-50 text-emerald-700',
  not_yet_due: 'bg-slate-100 text-slate-500',
  awaiting_measurement: 'bg-amber-50 text-amber-700',
  unsourced: 'bg-amber-50 text-amber-700',
  not_signed_off: 'bg-slate-100 text-slate-500',
  promise_not_frozen: 'bg-rose-50 text-rose-700',
};

function AssessmentRow({ a }: { a: ClaimAssessment }) {
  const tone = accuracyTone(a.accuracyRatio);
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-2.5">
        <Link href={`/items/${a.id}`} className="font-medium text-slate-700 hover:text-brand-700">
          {a.title}
        </Link>
        {a.promiseWasRestated && (
          <span
            className="ml-2 inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700"
            title={`Originally promised ${a.originalPromiseInr != null ? formatInr(a.originalPromiseInr) : '—'}. Accuracy is measured against that figure, not the revised one.`}
          >
            <History className="h-2.5 w-2.5" />
            restated
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right tabular text-slate-600">
        {a.originalPromiseInr != null
          ? formatInr(a.originalPromiseInr)
          : a.promisedValueInr != null
            ? formatInr(a.promisedValueInr)
            : '—'}
      </td>
      <td className="px-4 py-2.5 text-right tabular text-slate-600">
        {a.realizedInr != null ? formatInr(a.realizedInr) : '—'}
      </td>
      <td className={`px-4 py-2.5 text-right tabular font-semibold ${RATIO_TEXT[tone]}`}>
        {a.accuracyRatio != null ? `${Math.round(a.accuracyRatio * 100)}%` : '—'}
      </td>
      <td className="px-4 py-2.5">
        <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_TONE[a.status]}`}>
          {ASSESSMENT_LABEL[a.status]}
        </span>
      </td>
    </tr>
  );
}

/**
 * The learning loop (docs/ROADMAP.md M6).
 *
 * The one thing no project tracker can copy, because a tracker never captured
 * the promise. It is also the page most capable of doing harm: these are
 * judgements about named people's forecasting records, so every figure carries
 * its sample size and thin evidence produces no verdict at all.
 */
export default async function LearningPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const v = await getLearningView(session.user);

  const assessed = v.assessments.filter(a => a.status === 'assessable');
  const totalPromised = assessed.reduce((s, a) => s + (a.originalPromiseInr ?? a.promisedValueInr ?? 0), 0);
  const totalRealized = assessed.reduce((s, a) => s + (a.realizedInr ?? 0), 0);

  // Ordered so the rows that can actually be acted on come first.
  const ORDER = ['assessable', 'awaiting_measurement', 'unsourced', 'not_yet_due', 'not_signed_off', 'promise_not_frozen'];
  const rows = [...v.assessments].sort(
    (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.title.localeCompare(b.title),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Claim Accuracy"
        subtitle="What was promised, against what was actually delivered"
      >
        <PrintButton label="Export" />
      </PageHeader>

      <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
          <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          <span>
            This compares the value frozen at sign-off against what was later measured and evidenced.
            It is <strong>not</strong> a performance rating. Forecasts are uncertain by nature, and a
            claim that fell short may reflect a changed market rather than a poor estimate — the
            figures below describe outcomes, and the explanation belongs to the people involved.
            Patterns are withheld entirely until at least {MIN_SAMPLE_FOR_PATTERN} initiatives have
            been assessed.
          </span>
        </p>
      </div>

      <ReadinessPanel readiness={v.readiness} />

      {/* Portfolio totals — only meaningful once something has been assessed */}
      {assessed.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Promised</div>
            <div className="mt-1 tabular text-2xl font-semibold text-slate-800">{formatInr(totalPromised)}</div>
            <div className="mt-0.5 text-[11px] text-slate-400">across {assessed.length} assessed</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Realized</div>
            <div className="mt-1 tabular text-2xl font-semibold text-slate-800">{formatInr(totalRealized)}</div>
            <div className="mt-0.5 text-[11px] text-slate-400">evidenced readings only</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Portfolio accuracy</div>
            <div className="mt-1 tabular text-2xl font-semibold text-slate-800">
              {totalPromised > 0 ? `${Math.round((totalRealized / totalPromised) * 100)}%` : '—'}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              {assessed.length < MIN_SAMPLE_FOR_PATTERN ? 'too few to read as a trend' : 'of promised value delivered'}
            </div>
          </div>
        </div>
      )}

      {/* Per-dimension patterns */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AccuracyByDimension
          title="By Business Sponsor"
          subtitle="Whose forecasts have held up. Withheld below the evidence floor."
          groups={v.bySponsor}
        />
        <AccuracyByDimension
          title="By IT Vertical Head"
          subtitle="Delivery-side ownership of the same promises."
          groups={v.byVertical}
        />
        <AccuracyByDimension
          title="By Benefit Category"
          subtitle="Which kinds of benefit prove out, and which are habitually overstated."
          groups={v.byBenefitCategory.map(g => ({
            ...g,
            key: BENEFIT_CATEGORY_LABEL[g.key as keyof typeof BENEFIT_CATEGORY_LABEL] ?? g.key,
          }))}
        />
        <AccuracyByDimension
          title="By Investment Basis"
          subtitle="Whether value-generating work actually returns more than the rest."
          groups={v.byInvestmentCategory.map(g => ({
            ...g,
            key: INVESTMENT_CATEGORY_LABEL[g.key as keyof typeof INVESTMENT_CATEGORY_LABEL] ?? g.key,
          }))}
        />
      </div>

      {/* Exception outcomes */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold text-slate-800">Exception-Approved Outcomes</h2>
        <p className="mb-4 mt-0.5 text-xs leading-relaxed text-slate-500">
          How work funded <em>below</em> the ROI threshold actually performed. This grades the override
          rather than the rule: if these routinely deliver, the threshold is set too high; if they
          routinely miss, the exception process is a rubber stamp.
        </p>

        {v.exceptions.outcomes.length === 0 ? (
          <p className="text-xs text-slate-400">
            No ROI-gate exceptions have been approved. Nothing to grade.
          </p>
        ) : (
          <>
            {!v.exceptions.reportable && (
              <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                {v.exceptions.withheldReason} Individual outcomes are listed below; the aggregate
                verdict is withheld.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-2 font-semibold">Initiative</th>
                    <th className="px-4 py-2 text-right font-semibold">ROI at approval</th>
                    <th className="px-4 py-2 text-right font-semibold">Threshold</th>
                    <th className="px-4 py-2 font-semibold">Approved by</th>
                    <th className="px-4 py-2 text-right font-semibold">Delivered</th>
                  </tr>
                </thead>
                <tbody>
                  {v.exceptions.outcomes.map(o => (
                    <tr key={o.initiativeId} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2.5">
                        <Link href={`/items/${o.initiativeId}`} className="font-medium text-slate-700 hover:text-brand-700">
                          {o.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-slate-600">{o.roiAtApproval.toFixed(1)}x</td>
                      <td className="px-4 py-2.5 text-right tabular text-slate-400">{o.thresholdAtApproval.toFixed(1)}x</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {o.approvedBy} · {o.approvedAt}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular font-semibold ${RATIO_TEXT[accuracyTone(o.accuracyRatio)]}`}>
                        {o.accuracyRatio != null
                          ? `${Math.round(o.accuracyRatio * 100)}%`
                          : ASSESSMENT_LABEL[o.status]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Per-initiative detail */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Initiative Detail</h2>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-400">
            No initiatives are visible to you yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2 font-semibold">Initiative</th>
                  <th className="px-4 py-2 text-right font-semibold">Promised</th>
                  <th className="px-4 py-2 text-right font-semibold">Realized</th>
                  <th className="px-4 py-2 text-right font-semibold">Accuracy</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(a => <AssessmentRow key={a.id} a={a} />)}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
          <ArrowRight className="h-3 w-3" />
          &quot;Promised&quot; shows the figure as originally committed. Where a promise was restated,
          accuracy is measured against the original — not the revised figure.
        </p>
      </div>
    </div>
  );
}
