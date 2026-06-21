export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getCioSummary } from '@/lib/queries/dashboard';
import { STAGES } from '@/lib/types';
import { KpiCard } from '@/components/KpiCard';
import { PageHeader } from '@/components/PageHeader';
import { StageFunnel } from '@/components/StageFunnel';
import { RagDot } from '@/components/RagBadge';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileBarChart,
  CalendarClock,
} from 'lucide-react';

export default async function CioDashboard() {
  const {
    totalCount,
    activeCount: total,
    counts,
    pct,
    pipelineByStage,
    vhSummary,
    monthLabel,
    monthly: { committed: monthlyCommitted, delivered, missed },
  } = await getCioSummary();

  return (
    <div className="space-y-6">
      <PageHeader title="CIO Dashboard" subtitle="Portfolio health across all verticals — real-time view">
        <Link
          href="/report"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <FileBarChart className="h-4 w-4" />
          Generate Monthly Report
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Active Items" value={total} sub={`of ${totalCount} total`} icon={Activity} accent="brand" />
        <KpiCard label="On Track" value={counts.green} sub={`${pct(counts.green)}%`} icon={CheckCircle2} accent="emerald" />
        <KpiCard label="At Risk" value={counts.amber} sub={`${pct(counts.amber)}%`} icon={AlertTriangle} accent="amber" />
        <KpiCard label="Delayed" value={counts.red} sub={`${pct(counts.red)}%`} icon={AlertOctagon} accent="rose" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Pipeline by Stage</h2>
            <span className="text-xs text-slate-400">{totalCount} items across {STAGES.length} stages</span>
          </div>
          <StageFunnel counts={pipelineByStage} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">This Month</h2>
            <span className="text-xs text-slate-400">· {monthLabel}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-slate-50 py-3">
              <div className="tabular text-2xl font-semibold text-slate-900">{monthlyCommitted.length}</div>
              <div className="mt-0.5 text-[11px] font-medium text-slate-500">Committed</div>
            </div>
            <div className="rounded-lg bg-emerald-50 py-3">
              <div className="tabular text-2xl font-semibold text-emerald-600">{delivered.length}</div>
              <div className="mt-0.5 text-[11px] font-medium text-emerald-700">Delivered</div>
            </div>
            <div className="rounded-lg bg-rose-50 py-3">
              <div className="tabular text-2xl font-semibold text-rose-600">{missed.length}</div>
              <div className="mt-0.5 text-[11px] font-medium text-rose-700">Missed</div>
            </div>
          </div>
          {missed.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-rose-600">Missed items</p>
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
      </div>

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
    </div>
  );
}
