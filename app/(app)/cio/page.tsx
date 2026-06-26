export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getCioSummary } from '@/lib/queries/dashboard';
import { STAGES } from '@/lib/types';
import { resolvePeriod } from '@/lib/period';
import { KpiCard } from '@/components/KpiCard';
import { PageHeader } from '@/components/PageHeader';
import { PeriodPicker } from '@/components/PeriodPicker';
import { StageFunnel } from '@/components/StageFunnel';
import { RagDot } from '@/components/RagBadge';
import { computeRAG } from '@/lib/rag';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileBarChart,
  CalendarClock,
  ShieldAlert,
} from 'lucide-react';

export default async function CioDashboard({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string };
}) {
  const period = resolvePeriod(searchParams);
  const {
    totalCount,
    activeCount: total,
    counts,
    pct,
    pipelineByStage,
    vhSummary,
    periodLabel,
    monthly: { committed: monthlyCommitted, delivered, missed },
    regulatory,
    delays,
  } = await getCioSummary(period);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="Executive Value Command Center" subtitle="Where is delivery risk threatening business outcomes? — real-time across all verticals">
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker />
          <Link
            href="/report"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <FileBarChart className="h-4 w-4" />
            Value Realization Report
          </Link>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Active Items" value={total} sub={`of ${totalCount} total`} icon={Activity} accent="brand" />
        <KpiCard label="On Track" value={counts.green} sub={`${pct(counts.green)}%`} icon={CheckCircle2} accent="emerald" />
        <KpiCard label="At Risk" value={counts.amber} sub={`${pct(counts.amber)}%`} icon={AlertTriangle} accent="amber" />
        <KpiCard label="Value at Risk" value={counts.red} sub={`${pct(counts.red)}%`} icon={AlertOctagon} accent="rose" />
      </div>

      {/* Delivery commitments — first executive question after health */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-800">Delivery Commitments</h2>
          <span className="text-xs text-slate-400">· {periodLabel}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-slate-50 py-4">
            <div className="tabular text-3xl font-semibold text-slate-900">{monthlyCommitted.length}</div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">Promised</div>
          </div>
          <div className="rounded-lg bg-emerald-50 py-4">
            <div className="tabular text-3xl font-semibold text-emerald-600">{delivered.length}</div>
            <div className="mt-1 text-[11px] font-medium text-emerald-700">Value Delivered</div>
          </div>
          <div className="rounded-lg bg-rose-50 py-4">
            <div className="tabular text-3xl font-semibold text-rose-600">{missed.length}</div>
            <div className="mt-1 text-[11px] font-medium text-rose-700">Commitment Slippage</div>
          </div>
        </div>
        {missed.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rose-600">Commitment Slippage</p>
            <ul className="space-y-1.5">
              {missed.map(i => (
                <li key={i.id} className="flex items-center justify-between gap-2 text-xs">
                  <Link href={`/items/${i.id}`} className="truncate font-medium text-slate-700 hover:text-brand-700">
                    {i.title}
                  </Link>
                  <span className="flex-shrink-0 tabular text-slate-400">{i.goLiveDate.slice(5)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {delays.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <AlertOctagon className="h-4 w-4 text-rose-500" />
              Delays Needing Attention
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">{delays.length}</span>
            </h2>
            <span className="text-xs text-slate-400">Worst slip first</span>
          </div>
          <div className="divide-y divide-slate-100">
            {delays.slice(0, 6).map(i => {
              const slip = i.etaDays < 0 ? -i.etaDays : i.staleDays;
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/items/${i.id}`} className="truncate text-sm font-medium text-slate-800 hover:text-brand-700">
                      {i.title}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>{i.currentStage}</span>
                      {i.delaySource && <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700">{i.delaySource}</span>}
                      {i.delayReason && <span className="truncate">· {i.delayReason}</span>}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="tabular text-sm font-semibold text-rose-600">{slip}d</div>
                    <div className="text-[11px] text-slate-400">slipped</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {regulatory.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-rose-100 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-rose-800">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              Regulatory Watch
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                {regulatory.length}
              </span>
            </h2>
            <span className="text-xs text-slate-400">Externally-mandated deadlines</span>
          </div>
          <div className="divide-y divide-slate-100">
            {regulatory.map(i => {
              const rag = computeRAG(i);
              const overdue = i.regulatoryDueDate ? i.regulatoryDueDate < todayIso && i.currentStage !== 'Closed' : false;
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/items/${i.id}`} className="truncate text-sm font-medium text-slate-800 hover:text-brand-700">
                      {i.title}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      {i.regulatoryBody && <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700">{i.regulatoryBody}</span>}
                      <span>{i.currentStage}</span>
                      <span className="inline-flex items-center gap-1"><RagDot rag={rag} size="sm" />{rag}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {i.regulatoryDueDate ? (
                      <>
                        <div className={`tabular text-xs font-semibold ${overdue ? 'text-rose-600' : 'text-slate-700'}`}>{i.regulatoryDueDate}</div>
                        <div className="text-[11px] text-slate-400">{i.currentStage === 'Closed' ? 'delivered' : overdue ? 'overdue' : 'due'}</div>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-400">no fixed date</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">Vertical Head Summary</h2>
          <span className="text-xs text-slate-400">Sorted by risk</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vertical Head</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Green</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Amber</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Red</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {vhSummary.map((row, i) => (
                <tr key={row.vh} className={`border-t border-slate-100 transition-colors hover:bg-brand-50/40 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                  <td className="px-5 py-2.5 font-medium text-slate-800">{row.vh}</td>
                  <td className="px-4 py-2.5 text-center tabular text-slate-600">{row.total}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1.5 tabular font-medium text-slate-700">
                      <RagDot rag="Green" size="sm" />
                      {row.green}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1.5 tabular font-medium text-slate-700">
                      <RagDot rag="Amber" size="sm" />
                      {row.amber}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1.5 tabular font-medium text-slate-700">
                      <RagDot rag="Red" size="sm" />
                      {row.red}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular text-slate-500">{row.lastUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pipeline by Stage — context, not the primary decision area */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">Pipeline by Stage</h2>
          <span className="text-xs text-slate-400">{totalCount} items across {STAGES.length} stages</span>
        </div>
        <div className="p-5">
          <StageFunnel counts={pipelineByStage} />
        </div>
      </div>
    </div>
  );
}
