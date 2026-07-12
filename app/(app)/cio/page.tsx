export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCioSummary } from '@/lib/queries/dashboard';
import { STAGES } from '@/lib/types';
import { resolvePeriod } from '@/lib/period';
import { KpiCard } from '@/components/KpiCard';
import { PageHeader } from '@/components/PageHeader';
import { PeriodPicker } from '@/components/PeriodPicker';
import { PortfolioFilterBar } from '@/components/PortfolioFilterBar';
import { parsePortfolioFilters } from '@/lib/portfolioFilters';
import { StageFunnel } from '@/components/StageFunnel';
import { CompletedByMonthChart } from '@/components/CompletedByMonthChart';
import { RagDot } from '@/components/RagBadge';
import { TodaysFocus } from '@/components/TodaysFocus';
import { SectionCard } from '@/components/ui/SectionCard';
import { Badge } from '@/components/ui/Badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { buttonCls } from '@/components/ui/Button';
import { computeRAG } from '@/lib/rag';
import { KPI_DEFINITIONS } from '@/lib/kpiDefinitions';
import { formatInr } from '@/lib/value';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileBarChart,
  CalendarClock,
  ShieldAlert,
  PackageCheck,
  Star,
} from 'lucide-react';

export default async function CioDashboard({
  searchParams,
}: {
  searchParams: {
    period?: string; from?: string; to?: string;
    classification?: string; rag?: string; stage?: string; isRegulatory?: string;
    verticalHead?: string; programHead?: string; programManager?: string;
    businessHead?: string; businessUnit?: string; businessSpoc?: string;
  };
}) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const period = resolvePeriod(searchParams);
  const filters = parsePortfolioFilters(searchParams);
  const {
    totalCount,
    activeCount: total,
    counts,
    pct,
    pipelineByStage,
    vhSummary,
    businessOwnership,
    periodLabel,
    deliveredProjects,
    completedByMonth,
    strategicProjects,
    filterOptions,
    monthly: { committed: monthlyCommitted, delivered, missed },
    regulatory,
    delays,
  } = await getCioSummary(period, session.user, filters);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="Executive View" subtitle="Where is delivery risk threatening business outcomes? — real-time across all verticals">
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker />
          <Link href="/report" className={buttonCls('primary')}>
            <FileBarChart className="h-4 w-4" />
            Value Realization Report
          </Link>
        </div>
      </PageHeader>

      <PortfolioFilterBar options={filterOptions} />

      {/* ── Executive Summary Zone ── */}
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm">
        <TodaysFocus
          title="Today's leadership focus"
          items={[
            { label: 'Review value at risk', href: '/cio' },
            { label: 'Check commitment slippage', href: '/cio' },
            { label: 'Review regulatory watch', href: '/cio' },
            { label: 'Open value realization report', href: '/value' },
          ]}
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard label="Active Items" value={total} sub={`of ${totalCount} total`} icon={Activity} accent="brand" tooltip={KPI_DEFINITIONS.activeItems} />
          <KpiCard label="Delivered Projects" value={deliveredProjects.length} sub={`closed in ${periodLabel}`} icon={PackageCheck} accent="emerald" tooltip={KPI_DEFINITIONS.deliveredProjects} />
          <KpiCard label="On Track" value={counts.green} sub={`${pct(counts.green)}%`} icon={CheckCircle2} accent="emerald" tooltip={KPI_DEFINITIONS.onTrack} />
          <KpiCard label="Value at Risk" value={counts.red} sub={`${pct(counts.red)}%`} icon={AlertOctagon} accent="rose" tooltip={KPI_DEFINITIONS.valueAtRisk} />
          <KpiCard label="At Risk" value={counts.amber} sub={`${pct(counts.amber)}%`} icon={AlertTriangle} accent="amber" tooltip={KPI_DEFINITIONS.atRisk} />
        </div>

        {/* Delivery commitments */}
        <SectionCard title="Delivery Commitments" subtitle={periodLabel} icon={CalendarClock} tone="default">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="tabular text-3xl font-semibold text-slate-900">{monthlyCommitted.length}</div>
              <div className="mt-2 text-xs font-semibold text-slate-700">Promised</div>
              <div className="mt-0.5 text-[11px] leading-snug text-slate-400">Committed for selected period</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="tabular text-3xl font-semibold text-emerald-700">{delivered.length}</div>
              <div className="mt-2 text-xs font-semibold text-emerald-700">Value Delivered</div>
              <div className="mt-0.5 text-[11px] leading-snug text-emerald-600/70">Completed and value-confirmed</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
              <div className="tabular text-3xl font-semibold text-rose-700">{missed.length}</div>
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-700">
                Commitment Slippage
                <InfoTooltip text={KPI_DEFINITIONS.commitmentSlippage} />
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-rose-600/70">Missed or delayed commitments</div>
            </div>
          </div>
          {missed.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-600">
                Commitment Slippage
                <InfoTooltip text={KPI_DEFINITIONS.commitmentSlippage} />
              </p>
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
        </SectionCard>
      </div>
      {/* ── End Executive Summary Zone ── */}

      {delays.length > 0 && (
        <SectionCard title="Delays Needing Attention" icon={AlertOctagon} tone="risk" count={delays.length} subtitle="Worst slip first" noPad>
          <div>
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
                      {i.delaySource && <Badge tone="danger" size="sm">{i.delaySource}</Badge>}
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
        </SectionCard>
      )}

      {regulatory.length > 0 && (
        <SectionCard title="Regulatory Watch" icon={ShieldAlert} tone="risk" count={regulatory.length} subtitle="Externally-mandated deadlines" tooltip={KPI_DEFINITIONS.regulatoryWatch} noPad>
          <div>
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
                      {i.regulatoryBody && <Badge tone="danger" size="sm">{i.regulatoryBody}</Badge>}
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
        </SectionCard>
      )}

      {strategicProjects.length > 0 && (
        <SectionCard
          title="Strategic Projects Status"
          icon={Star}
          subtitle="Classification = Strategic"
          tooltip={KPI_DEFINITIONS.strategicProjects}
          count={strategicProjects.length}
          noPad
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Initiative</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stage</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">RAG</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Go-live</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Value</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Regulatory</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Owner</th>
                </tr>
              </thead>
              <tbody>
                {strategicProjects.map((i, idx) => (
                  <tr key={i.id} className={`border-t border-slate-100 transition-colors hover:bg-brand-50/40 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-5 py-2.5">
                      <Link href={`/items/${i.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                        {i.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{i.currentStage}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <RagDot rag={i.rag} size="sm" />
                        {i.rag}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular text-slate-600">{i.goLiveDate}</td>
                    <td className="px-4 py-2.5 text-right tabular font-semibold text-slate-800">
                      {i.projectedValue > 0 ? formatInr(i.projectedValue) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {i.isRegulatory ? (
                        <Badge tone="danger" size="sm">{i.regulatoryBody || 'Yes'}</Badge>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{i.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Vertical Head Summary" subtitle="Sorted by risk" noPad>
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
      </SectionCard>

      <SectionCard title="Business Ownership Summary" subtitle="By Business Head, sorted by risk" noPad>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Business Owner</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Business Unit</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Green</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Amber</th>
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Red</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {businessOwnership.map((row, i) => (
                <tr key={row.owner} className={`border-t border-slate-100 transition-colors hover:bg-brand-50/40 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                  <td className="px-5 py-2.5 font-medium text-slate-800">{row.owner}</td>
                  <td className="px-4 py-2.5 text-slate-600">{row.businessUnit}</td>
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
      </SectionCard>

      {/* Governance Lifecycle View + delivery trend — context sections, last in executive order */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Governance Lifecycle View"
          subtitle="BRD → FSD → Commercial → Development → SIT → UAT → AppSec → CAB → Go Live → Business Validation → Closed"
          tooltip={KPI_DEFINITIONS.governanceLifecycleView}
        >
          <StageFunnel counts={pipelineByStage} />
        </SectionCard>

        <SectionCard title="Completed Projects by Month" icon={PackageCheck} subtitle={periodLabel} tooltip={KPI_DEFINITIONS.deliveredProjects}>
          <CompletedByMonthChart data={completedByMonth} />
        </SectionCard>
      </div>
    </div>
  );
}
