export const dynamic = 'force-dynamic';

import { getBoardSummary } from '@/lib/queries/value';
import { PrintButton } from '@/components/PrintButton';
import { formatInr, BENEFIT_CATEGORY_LABEL, CATEGORY_TONE } from '@/lib/value';
import { resolvePeriod } from '@/lib/period';
import { STAGE_LABEL } from '@/lib/stage-map';
import { PageHeader } from '@/components/PageHeader';
import { PeriodPicker } from '@/components/PeriodPicker';
import { KpiCard } from '@/components/KpiCard';
import Link from 'next/link';
import { TrendingUp, BadgeCheck, Coins, Scale, Target, Building2, Printer, LineChart, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default async function ValueDashboard({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string };
}) {
  const s = await getBoardSummary(resolvePeriod(searchParams));
  const maxCat = s.byCategory[0]?.projected ?? 1;
  const maxVh = s.byVertical[0]?.projected ?? 1;
  const maxOkr = s.byOkr[0]?.projected ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Board-Ready Value Dashboard"
        subtitle={`Value delivered, not effort expended · ${s.periodLabel}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker />
          <PrintButton label="Export board deck" />
        </div>
      </PageHeader>

      {/* Hero value KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Projected Annual Value"
          value={formatInr(s.totals.projected)}
          sub={`${s.totals.initiativesWithValue} initiatives`}
          icon={TrendingUp}
          accent="brand"
        />
        <KpiCard
          label="Signed-off Value"
          value={formatInr(s.totals.signedOff)}
          sub={`${s.totals.signedOffCount} approved`}
          icon={BadgeCheck}
          accent="emerald"
        />
        <KpiCard
          label={`Realized (${s.periodLabel})`}
          value={formatInr(s.realizedInPeriod)}
          sub={`${s.deliveredInPeriod} delivered`}
          icon={Coins}
          accent="amber"
        />
        <KpiCard
          label="Value vs Cost"
          value={`${s.totals.roiRatio.toFixed(1)}x`}
          sub="projected ROI"
          icon={Scale}
          accent="slate"
        />
      </div>

      {/* Benefit realization lifecycle */}
      {s.realization.rows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <LineChart className="h-4 w-4 text-slate-400" />
              Benefit Realization
            </h2>
            {s.realization.unconfirmedValueInr > 0 && (
              <span className="text-xs text-slate-500">
                <span className="tabular font-semibold text-amber-600">{formatInr(s.realization.unconfirmedValueInr)}</span> delivered, awaiting confirmation
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-emerald-50 py-3 text-center">
              <div className="tabular text-2xl font-semibold text-emerald-600">{s.realization.realizedCount}</div>
              <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Realized</div>
            </div>
            <div className="rounded-lg bg-amber-50 py-3 text-center">
              <div className="tabular text-2xl font-semibold text-amber-600">{s.realization.pendingCount}</div>
              <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700"><Clock className="h-3 w-3" /> Pending</div>
            </div>
            <div className="rounded-lg bg-rose-50 py-3 text-center">
              <div className="tabular text-2xl font-semibold text-rose-600">{s.realization.overdueCount}</div>
              <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-rose-700"><AlertTriangle className="h-3 w-3" /> Overdue</div>
            </div>
          </div>

          {s.realization.rows.filter(r => r.status !== 'realized').length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Awaiting confirmation</p>
              {s.realization.rows.filter(r => r.status !== 'realized').map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/items/${r.id}`} className="truncate font-medium text-slate-700 hover:text-brand-700">{r.title}</Link>
                  <div className="flex flex-shrink-0 items-center gap-2 text-xs">
                    <span className={`rounded px-1.5 py-0.5 font-medium ${r.status === 'overdue' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                      {r.status === 'overdue' ? 'overdue' : 'pending'}
                    </span>
                    {r.dueIso && <span className="tabular text-slate-400">due {r.dueIso}</span>}
                    <span className="tabular font-semibold text-slate-700">{formatInr(r.projected)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {s.totals.initiativesWithValue === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-card">
          <p className="text-sm font-medium text-slate-700">No value data yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
            No initiative has a committed benefit claim yet. PMO or CIO can add benefit claims — projected annual value, category, and linked OKR — when creating or editing an initiative.
          </p>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Value by category */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Value by Benefit Category</h2>
            <span className="text-xs text-slate-400">projected annual ₹</span>
          </div>
          <div className="space-y-3">
            {s.byCategory.map(c => (
              <div key={c.category} className="flex items-center gap-3">
                <div className="w-36 flex-shrink-0 text-sm text-slate-600">{BENEFIT_CATEGORY_LABEL[c.category]}</div>
                <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className={`h-full rounded-md ${CATEGORY_TONE[c.category]} opacity-85`}
                    style={{ width: `${Math.max(4, (c.projected / maxCat) * 100)}%` }}
                  />
                </div>
                <div className="w-20 flex-shrink-0 text-right tabular text-sm font-semibold text-slate-800">
                  {formatInr(c.projected)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Value vs cost */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Scale className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Value vs Cost</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Signed-off value</span>
                <span className="tabular font-semibold text-emerald-600">{formatInr(s.totals.signedOff)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Delivery cost</span>
                <span className="tabular font-semibold text-slate-700">{formatInr(s.totals.cost)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-400"
                  style={{ width: `${s.totals.signedOff > 0 ? Math.min(100, (s.totals.cost / s.totals.signedOff) * 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="rounded-lg bg-brand-50 p-3 text-center">
              <div className="tabular text-2xl font-semibold text-brand-700">{s.totals.roiRatio.toFixed(1)}x</div>
              <div className="mt-0.5 text-[11px] font-medium text-brand-600">
                return on every ₹ invested (signed-off)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Value by OKR */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Target className="h-4 w-4 text-slate-400" />
            Value Contributed by Strategic OKR
          </h2>
          <span className="text-xs text-slate-400">{s.byOkr.length} OKRs</span>
        </div>
        <div className="divide-y divide-slate-100">
          {s.byOkr.map(o => (
            <div key={o.okr} className="flex items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800">{o.okr}</div>
                <div className="truncate text-xs text-slate-500">{o.target} · owner {o.owner}</div>
              </div>
              <div className="hidden h-2 w-40 overflow-hidden rounded-full bg-slate-100 sm:block">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(4, (o.projected / maxOkr) * 100)}%` }} />
              </div>
              <div className="w-24 flex-shrink-0 text-right">
                <div className="tabular text-sm font-semibold text-slate-800">{formatInr(o.projected)}</div>
                <div className="text-[11px] text-slate-400">{o.count} item{o.count !== 1 ? 's' : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top initiatives by value */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card lg:col-span-2">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-800">Top Initiatives by Value</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Initiative</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Category</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stage</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Value</th>
                </tr>
              </thead>
              <tbody>
                {s.topInitiatives.map((i, idx) => (
                  <tr key={i.id} className={`border-t border-slate-100 transition-colors hover:bg-brand-50/40 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-5 py-2.5">
                      <Link href={`/items/${i.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                        {i.title}
                      </Link>
                      {i.signedOff && (
                        <span className="ml-2 inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          signed off
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <span className={`h-2 w-2 rounded-full ${CATEGORY_TONE[i.category]}`} />
                        {BENEFIT_CATEGORY_LABEL[i.category]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{STAGE_LABEL[i.stage]}</td>
                    <td className="px-4 py-2.5 text-right tabular font-semibold text-slate-800">{formatInr(i.projected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Value by vertical */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Value by Vertical</h2>
          </div>
          <div className="space-y-2.5">
            {s.byVertical.map(v => (
              <div key={v.vh} className="flex items-center gap-3">
                <div className="w-28 flex-shrink-0 truncate text-xs text-slate-600">{v.vh}</div>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-slate-100">
                  <div className="h-full rounded bg-brand-400" style={{ width: `${Math.max(4, (v.projected / maxVh) * 100)}%` }} />
                </div>
                <div className="w-16 flex-shrink-0 text-right tabular text-xs font-semibold text-slate-700">
                  {formatInr(v.projected)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
