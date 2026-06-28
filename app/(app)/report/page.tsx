export const dynamic = 'force-dynamic';

import { listInitiativesAsItems } from '@/lib/actions/initiatives';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import type { DelaySource } from '@/lib/types';
import { computeRAG, daysFromNow, daysSinceUpdate } from '@/lib/rag';
import { resolvePeriod, inPeriod, onOrBeforeEnd } from '@/lib/period';
import { PeriodPicker } from '@/components/PeriodPicker';
import Link from 'next/link';
import { Printer, Sparkles, AlertTriangle, ShieldAlert, AlertOctagon } from 'lucide-react';

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

  const closureDate = (i: (typeof items)[number]) =>
    i.history.find(h => h.stage === 'Closed')?.date ?? null;

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
  delayed.forEach(i => { if (i.delaySource) delaySources[i.delaySource]++; });
  const topSource = Object.entries(delaySources).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'IT';

  const regulatory = items
    .filter(i => i.isRegulatory)
    .sort((a, b) => (a.regulatoryDueDate ?? '9999').localeCompare(b.regulatoryDueDate ?? '9999'));

  // Leadership Attention Required: red+overdue, regulatory overdue, missed committed
  const needsLeadershipAttention = [
    ...items.filter(i => computeRAG(i) === 'Red' && daysFromNow(i.stageExpectedDate) < 0 && i.currentStage !== 'Closed'),
    ...items.filter(i => i.isRegulatory && i.regulatoryDueDate && i.regulatoryDueDate < today && i.currentStage !== 'Closed'),
  ].filter((i, idx, arr) => arr.findIndex(x => x.id === i.id) === idx); // dedupe

  const deliveryPct = committed.length > 0
    ? Math.round((delivered.length / committed.length) * 100)
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ── 1. Report Header ─────────────────────────────────────────────────── */}
      <PageHeader title="Leadership Value Report" subtitle={`Delivery accountability and outcome realization · ${period.label}`}>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker />
          <form action="javascript:window.print()">
            <button type="submit" className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
              <Printer className="h-4 w-4" />
              Export as PDF
            </button>
          </form>
        </div>
      </PageHeader>

      {/* ── 2. Executive Summary ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50/60 to-white p-5 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">Executive Summary</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          In <strong>{period.label}</strong>, the IT portfolio committed to{' '}
          <strong>{committed.length} initiative{committed.length !== 1 ? 's' : ''}</strong>.{' '}
          {deliveryPct !== null
            ? <><strong className="text-emerald-700">{delivered.length}</strong> were delivered on time ({deliveryPct}% delivery rate){missed.length > 0 ? `, and ` : `. `}</>
            : null}
          {missed.length > 0 && <><strong className="text-rose-700">{missed.length}</strong> missed their committed go-live date. </>}
          {delayed.length > 0 && <><strong>{delayed.length}</strong> active initiatives are flagged as delayed, primarily driven by {topSource} dependencies. </>}
          {needsLeadershipAttention.length > 0 && (
            <span className="text-amber-700">
              <strong>{needsLeadershipAttention.length}</strong> initiative{needsLeadershipAttention.length !== 1 ? 's' : ''} require{needsLeadershipAttention.length === 1 ? 's' : ''} immediate leadership attention.
            </span>
          )}
        </p>
      </div>

      {/* ── 3. Portfolio Commitment Scorecard ────────────────────────────────── */}
      <SectionCard title="Portfolio Commitment Scorecard" subtitle={period.label}>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Promised', value: committed.length, bar: 'border-l-brand-500', num: 'text-slate-900', bg: 'bg-slate-50/70', helper: 'Committed for period' },
            { label: 'Value Delivered', value: delivered.length, bar: 'border-l-emerald-500', num: 'text-emerald-700', bg: 'bg-emerald-50/70', helper: 'Closed on time' },
            { label: 'Commitment Slippage', value: missed.length, bar: 'border-l-rose-500', num: 'text-rose-700', bg: 'bg-rose-50/70', helper: 'Missed go-live' },
          ].map(c => (
            <div key={c.label} className={`rounded-xl border-l-[3px] p-4 ${c.bar} ${c.bg}`}>
              <div className="tabular text-3xl font-semibold leading-none ${c.num} ${c.num}">{c.value}</div>
              <div className="mt-2 text-xs font-semibold text-slate-700">{c.label}</div>
              <div className="mt-0.5 text-[11px] text-slate-400">{c.helper}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── 4. Value Delivered ───────────────────────────────────────────────── */}
      <SectionCard title="Value Delivered" subtitle={`${completedWithOutcome.length} outcomes confirmed`} tone="success">
        {completedWithOutcome.length === 0 ? (
          <p className="text-sm text-slate-500">No initiatives were closed with business validation in this period.</p>
        ) : (
          <div className="space-y-4">
            {completedWithOutcome.map(i => (
              <div key={i.id} className="rounded-lg border border-slate-100 bg-slate-50/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/items/${i.id}`} className="text-sm font-semibold text-slate-800 hover:text-brand-700">{i.title}</Link>
                    <p className="mt-0.5 text-xs text-slate-500">{i.outcomeCategory} · {i.verticalHead}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${ACHIEVED_TONE[i.validation!.outcomeAchieved]}`}>
                    {i.validation!.outcomeAchieved}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div><span className="text-slate-400">Target: </span><span className="text-slate-700">{i.targetMetric}</span></div>
                  <div><span className="text-slate-400">Actual: </span><span className="text-slate-700">{i.validation!.actualMetric}</span></div>
                  <div className="col-span-2"><span className="text-slate-400">Result: </span><span className="text-slate-700">{i.validation!.actualResult}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── 5. Value at Risk ─────────────────────────────────────────────────── */}
      {delayed.length > 0 && (
        <SectionCard title="Value at Risk" subtitle={`${delayed.length} active initiatives with delay flags`} tone="risk" icon={AlertTriangle}>
          <div className="grid grid-cols-4 gap-3">
            {(Object.entries(delaySources) as [DelaySource, number][]).map(([source, count]) => (
              <div key={source} className="rounded-lg border border-rose-100 bg-rose-50/40 py-3 text-center">
                <div className="tabular text-2xl font-semibold text-slate-800">{count}</div>
                <div className="mt-0.5 text-xs text-slate-500">{source}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── 6. Delay Accountability ──────────────────────────────────────────── */}
      {delayed.length > 0 && (
        <SectionCard title="Delay Accountability" subtitle="By initiative" noPad>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
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
                        {i.delaySource ? <Badge tone="danger" size="sm">{i.delaySource}</Badge> : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular font-semibold text-rose-600">{overdueDays}d</td>
                      <td className="px-4 py-2.5 text-slate-600">{i.delayReason || <span className="text-slate-400">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── 7. Commitment Slippage ───────────────────────────────────────────── */}
      {missed.length > 0 && (
        <SectionCard title="Commitment Slippage" count={missed.length} tone="risk" noPad>
          <div>
            {missed.map(i => (
              <div key={i.id} className="flex items-center justify-between px-5 py-3">
                <Link href={`/items/${i.id}`} className="text-sm font-medium text-slate-700 hover:text-brand-700">{i.title}</Link>
                <div className="text-xs text-rose-600">Go-live was {i.goLiveDate} · now in {i.currentStage}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── 8. Regulatory Commitments ────────────────────────────────────────── */}
      {regulatory.length > 0 && (
        <SectionCard title="Regulatory Commitments" count={regulatory.length} icon={ShieldAlert} tone="risk" noPad>
          <div>
            {regulatory.map(i => {
              const overdue = i.regulatoryDueDate ? i.regulatoryDueDate < today && i.currentStage !== 'Closed' : false;
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/items/${i.id}`} className="text-sm font-medium text-slate-700 hover:text-brand-700">{i.title}</Link>
                    <div className="mt-0.5 text-xs text-slate-500">{i.regulatoryBody ?? 'Regulatory'} · {i.currentStage}</div>
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
        </SectionCard>
      )}

      {/* ── 9. Leadership Attention Required ─────────────────────────────────── */}
      {needsLeadershipAttention.length > 0 && (
        <SectionCard title="Leadership Attention Required" count={needsLeadershipAttention.length} icon={AlertOctagon} tone="risk" noPad>
          <div>
            {needsLeadershipAttention.map(i => {
              const isRegOverdue = i.isRegulatory && i.regulatoryDueDate && i.regulatoryDueDate < today;
              return (
                <div key={i.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/items/${i.id}`} className="text-sm font-semibold text-slate-800 hover:text-brand-700">{i.title}</Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>{i.currentStage}</span>
                      {i.delaySource && <Badge tone="danger" size="sm">{i.delaySource}</Badge>}
                      {isRegOverdue && <Badge tone="danger" size="sm">Regulatory overdue</Badge>}
                    </div>
                  </div>
                  <div className="shrink-0 text-[11px] font-semibold text-rose-600">
                    {daysFromNow(i.stageExpectedDate) < 0 ? `${Math.abs(daysFromNow(i.stageExpectedDate))}d overdue` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* ── 10. Detailed Appendix — AI Narrative ─────────────────────────────── */}
      <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-800">
              Detailed Appendix — AI Narrative
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">Coming Soon</span>
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              <em>
                &ldquo;In {period.label}, the IT portfolio demonstrated strong execution with{' '}
                {delivered.length} item{delivered.length !== 1 ? 's' : ''} delivered against a
                commitment of {committed.length}. Key risks include {delayed.length} items
                with active delay flags, predominantly driven by {topSource} dependencies. Priority
                escalation is recommended for the items flagged above.&rdquo;
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
