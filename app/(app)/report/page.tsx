export const dynamic = 'force-dynamic';

import { listInitiativesAsItems } from '@/lib/actions/initiatives';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import type { DelaySource } from '@/lib/types';
import { daysFromNow, daysSinceUpdate } from '@/lib/rag';
import { resolvePeriod, inPeriod, onOrBeforeEnd } from '@/lib/period';
import { PeriodPicker } from '@/components/PeriodPicker';
import Link from 'next/link';
import { Printer, Sparkles } from 'lucide-react';

const ACHIEVED_TONE: Record<string, string> = {
  Yes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Partially: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  No: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

export default async function ReportPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const items = await listInitiativesAsItems();
  const period = resolvePeriod(searchParams);
  const today = new Date().toISOString().slice(0, 10);

  const closureDate = (i: (typeof items)[number]) => i.history.find(h => h.stage === 'Closed')?.date ?? null;

  // Promised to go live within the window; delivered = closed by the window's end;
  // missed = promised in the window but not delivered by its end.
  const committed = items.filter(i => inPeriod(i.goLiveDate, period));
  const delivered = committed.filter(i => {
    const cd = closureDate(i);
    return !!cd && onOrBeforeEnd(cd, period);
  });
  const missed = committed.filter(i => {
    const cd = closureDate(i);
    return !cd || !onOrBeforeEnd(cd, period);
  });

  const completedWithOutcome = items.filter(
    i => i.currentStage === 'Closed' && i.validation && inPeriod(closureDate(i) ?? i.lastUpdated, period),
  );

  const delayed = items.filter(i => i.delayed && i.currentStage !== 'Closed');
  const delaySources: Record<DelaySource, number> = { IT: 0, Business: 0, Vendor: 0, External: 0 };
  delayed.forEach(i => {
    if (i.delaySource) delaySources[i.delaySource]++;
  });

  const topSource = Object.entries(delaySources).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'IT';

  const regulatory = items
    .filter(i => i.isRegulatory)
    .sort((a, b) => (a.regulatoryDueDate ?? '9999').localeCompare(b.regulatoryDueDate ?? '9999'));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Delivery & Value Report" subtitle={`Period: ${period.label}`}>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker />
          <form action="javascript:window.print()">
            <button
              type="submit"
              className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Export as PDF
            </button>
          </form>
        </div>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Promised', value: committed.length, bar: 'bg-brand-500', tone: 'text-slate-900' },
          { label: 'Delivered', value: delivered.length, bar: 'bg-emerald-500', tone: 'text-emerald-600' },
          { label: 'Missed', value: missed.length, bar: 'bg-rose-500', tone: 'text-rose-600' },
        ].map(c => (
          <div key={c.label} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <span className={`absolute inset-y-0 left-0 w-1 ${c.bar}`} aria-hidden />
            <div className="text-xs font-medium text-slate-500">{c.label}</div>
            <div className={`tabular mt-1 text-3xl font-semibold ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">
            Outcomes Realized — {period.label}{' '}
            <span className="text-slate-400">({completedWithOutcome.length})</span>
          </h2>
        </div>
        {completedWithOutcome.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No items closed with validation in this period.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {completedWithOutcome.map(i => (
              <div key={i.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/items/${i.id}`} className="text-sm font-semibold text-slate-800 hover:text-brand-700">
                      {i.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {i.outcomeCategory} · {i.verticalHead}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${ACHIEVED_TONE[i.validation!.outcomeAchieved]}`}>
                    {i.validation!.outcomeAchieved}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  <div>
                    <span className="text-slate-400">Target: </span>
                    <span className="text-slate-700">{i.targetMetric}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Actual: </span>
                    <span className="text-slate-700">{i.validation!.actualMetric}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Result: </span>
                    <span className="text-slate-700">{i.validation!.actualResult}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">
            Delay Accountability <span className="text-slate-400">({delayed.length})</span>
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-3 px-5 py-4">
          {(Object.entries(delaySources) as [DelaySource, number][]).map(([source, count]) => (
            <div key={source} className="rounded-lg border border-slate-100 bg-slate-50 py-3 text-center">
              <div className="tabular text-2xl font-semibold text-slate-800">{count}</div>
              <div className="mt-0.5 text-xs text-slate-500">{source}</div>
            </div>
          ))}
        </div>
        {delayed.length > 0 && (
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50/60">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Initiative</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stage</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Owner / Source</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Days slipped</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Reason</th>
                </tr>
              </thead>
              <tbody>
                {delayed.map((i, idx) => {
                  const overdueDays = daysFromNow(i.stageExpectedDate) < 0
                    ? Math.abs(daysFromNow(i.stageExpectedDate))
                    : daysSinceUpdate(i.lastUpdated);
                  return (
                    <tr key={i.id} className={`border-t border-slate-100 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-5 py-2.5">
                        <Link href={`/items/${i.id}`} className="font-medium text-slate-700 hover:text-brand-700">{i.title}</Link>
                        <div className="text-[11px] text-slate-400">{i.verticalHead}</div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{i.currentStage}</td>
                      <td className="px-4 py-2.5">
                        {i.delaySource ? (
                          <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                            {i.delaySource}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular font-semibold text-rose-600">{overdueDays}d</td>
                      <td className="px-4 py-2.5 text-slate-600">{i.delayReason || <span className="text-slate-400">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {missed.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-card">
          <div className="border-b border-rose-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-rose-800">
              Missed — Committed but not Delivered <span className="text-rose-400">({missed.length})</span>
            </h2>
          </div>
          <div className="divide-y divide-rose-50">
            {missed.map(i => (
              <div key={i.id} className="flex items-center justify-between px-5 py-3">
                <Link href={`/items/${i.id}`} className="text-sm font-medium text-slate-700 hover:text-brand-700">
                  {i.title}
                </Link>
                <div className="text-xs text-rose-600">
                  Go-live was {i.goLiveDate} · now in {i.currentStage}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {regulatory.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-800">
              Regulatory Commitments <span className="text-slate-400">({regulatory.length})</span>
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {regulatory.map(i => {
              const overdue = i.regulatoryDueDate ? i.regulatoryDueDate < today && i.currentStage !== 'Closed' : false;
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/items/${i.id}`} className="text-sm font-medium text-slate-700 hover:text-brand-700">
                      {i.title}
                    </Link>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {i.regulatoryBody ?? 'Regulatory'} · {i.currentStage}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right text-xs">
                    {i.regulatoryDueDate ? (
                      <span className={overdue ? 'font-semibold text-rose-600' : 'text-slate-600'}>
                        due {i.regulatoryDueDate}{overdue ? ' · overdue' : ''}
                      </span>
                    ) : (
                      <span className="text-slate-400">no fixed date</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-800">
              AI Narrative
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                Coming Soon
              </span>
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              <em>
                &ldquo;In {period.label}, the IT portfolio demonstrated strong execution with{' '}
                {delivered.length} item{delivered.length !== 1 ? 's' : ''} delivered against a
                commitment of {committed.length}. Key risks include {delayed.length} items
                with active delay flags, predominantly driven by {topSource} dependencies. Priority
                escalation is recommended for the items flagged above. Overall portfolio health is{' '}
                {committed.length > 0 && missed.length / committed.length < 0.2 ? 'good' : 'at risk'},
                with leadership advised to focus on clearing CAB bottlenecks heading into next
                quarter.&rdquo;
              </em>
            </p>
            <p className="mt-2 text-xs text-brand-400">
              Auto-generated narrative will be available when the Claude API is connected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
