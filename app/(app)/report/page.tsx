export const dynamic = 'force-dynamic';

import { listInitiativesAsItems } from '@/lib/actions/initiatives';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { KpiCard } from '@/components/KpiCard';
import { STAGES } from '@/lib/types';
import type { DelaySource } from '@/lib/types';
import { computeRAG, daysFromNow, daysSinceUpdate } from '@/lib/rag';
import { resolvePeriod, inPeriod, onOrBeforeEnd } from '@/lib/period';
import { formatInr } from '@/lib/value';
import { PeriodPicker } from '@/components/PeriodPicker';
import Link from 'next/link';
import { AlertTriangle, ShieldAlert, AlertOctagon, TrendingUp, BadgeCheck, Clock, Flame } from 'lucide-react';
import { PrintButton } from '@/components/PrintButton';

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

  // Value lens — benefit claim totals per initiative
  const claimData = await prisma.initiative.findMany({
    select: {
      id: true,
      currentStage: true,
      delayed: true,
      valueSignedOff: true,
      benefitClaims: { select: { estimatedAnnualValueInr: true } },
    },
  });
  const claimMap = new Map(claimData.map(c => [
    c.id,
    {
      total: c.benefitClaims.reduce((s, b) => s + b.estimatedAnnualValueInr, 0),
      signedOff: c.valueSignedOff,
      closed: c.currentStage === 'CLOSED',
      delayed: c.delayed,
    },
  ]));

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

  // ── Leadership Attention — 6 rule categories ───────────────────────────────
  type AttentionRow = { key: string; id: string; title: string; issue: string; owner: string; action: string; severity: 'critical' | 'warning' | 'info' };
  const seenIds = new Set<string>();
  const attentionRows: AttentionRow[] = [];

  const addRow = (row: AttentionRow) => { attentionRows.push(row); seenIds.add(row.id); };

  // 1. Red initiatives (by RAG)
  items.filter(i => computeRAG(i) === 'Red' && i.currentStage !== 'Closed').forEach(i => {
    if (!seenIds.has(i.id)) addRow({
      key: `red-${i.id}`, id: i.id, title: i.title,
      issue: 'Red delivery confidence',
      owner: i.verticalHead,
      action: i.delayed && i.delaySource ? `Escalate ${i.delaySource} dependency` : 'Advance or escalate stage',
      severity: 'critical',
    });
  });

  // 2. Overdue regulatory
  items.filter(i => i.isRegulatory && i.regulatoryDueDate && i.regulatoryDueDate < today && i.currentStage !== 'Closed').forEach(i => {
    addRow({
      key: `reg-${i.id}`, id: i.id, title: i.title,
      issue: `Regulatory deadline overdue${i.regulatoryBody ? ` — ${i.regulatoryBody}` : ''}`,
      owner: i.verticalHead,
      action: 'Review closure path immediately',
      severity: 'critical',
    });
  });

  // 3. Business / Vendor delayed
  items.filter(i => i.delayed && (i.delaySource === 'Business' || i.delaySource === 'Vendor') && i.currentStage !== 'Closed').forEach(i => {
    if (!seenIds.has(i.id)) addRow({
      key: `delay-${i.id}`, id: i.id, title: i.title,
      issue: `${i.delaySource} dependency blocking delivery${i.delayReason ? ` — ${i.delayReason}` : ''}`,
      owner: i.verticalHead,
      action: `Escalate ${i.delaySource} owner`,
      severity: 'warning',
    });
  });

  // 4. Stale >7 days
  items.filter(i => daysSinceUpdate(i.lastUpdated) > 7 && i.currentStage !== 'Closed').forEach(i => {
    if (!seenIds.has(i.id)) addRow({
      key: `stale-${i.id}`, id: i.id, title: i.title,
      issue: `No update in ${daysSinceUpdate(i.lastUpdated)} days`,
      owner: i.verticalHead,
      action: 'PMO to request stage update',
      severity: 'warning',
    });
  });

  // 5. Missed go-live
  missed.forEach(i => {
    if (!seenIds.has(i.id)) addRow({
      key: `missed-${i.id}`, id: i.id, title: i.title,
      issue: `Go-live ${i.goLiveDate} missed — now in ${i.currentStage}`,
      owner: i.verticalHead,
      action: 'Assess revised delivery timeline',
      severity: 'critical',
    });
  });

  // 6. Closed without outcome validation
  items.filter(i => i.currentStage === 'Closed' && !i.validation).forEach(i => {
    addRow({
      key: `val-${i.id}`, id: i.id, title: i.title,
      issue: 'Closed — business outcome not yet validated',
      owner: i.businessSpoc ?? i.verticalHead,
      action: 'Business SPOC to confirm delivered value',
      severity: 'info',
    });
  });

  const deliveryPct = committed.length > 0
    ? Math.round((delivered.length / committed.length) * 100)
    : null;

  // For executive summary
  const topDelaySources = (Object.entries(delaySources) as [DelaySource, number][])
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([s]) => s);

  const regDueSoon = regulatory.filter(
    i => i.regulatoryDueDate && daysFromNow(i.regulatoryDueDate) >= 0 && daysFromNow(i.regulatoryDueDate) <= 14 && i.currentStage !== 'Closed',
  );

  const stuckStages = ['UAT', 'AppSec', 'CAB Approval'] as const;
  const stuckInPreLaunch = items.filter(i => (stuckStages as readonly string[]).includes(i.currentStage));

  const closedWithoutValidation = items.filter(i => i.currentStage === 'Closed' && !i.validation);

  // Regulatory summary indicators
  const regOverdue  = regulatory.filter(i => i.regulatoryDueDate && i.regulatoryDueDate < today && i.currentStage !== 'Closed').length;
  const regDue7     = regulatory.filter(i => i.regulatoryDueDate && i.regulatoryDueDate >= today && daysFromNow(i.regulatoryDueDate) <= 7  && i.currentStage !== 'Closed').length;
  const regDue14    = regulatory.filter(i => i.regulatoryDueDate && i.regulatoryDueDate >= today && daysFromNow(i.regulatoryDueDate) <= 14 && i.currentStage !== 'Closed').length;
  const regClosed   = regulatory.filter(i => i.currentStage === 'Closed').length;

  // Stage-wise portfolio snapshot
  const stageCounts = STAGES.map(stage => ({
    stage,
    count: items.filter(i => i.currentStage === stage).length,
  }));
  const maxStageCount = Math.max(...stageCounts.map(s => s.count), 1);
  const BOTTLENECK_STAGES = new Set(['UAT', 'AppSec', 'CAB Approval']);
  const totalInPipeline = items.filter(i => i.currentStage !== 'Closed').length;

  // Delay accountability stats
  const delayAges = delayed.map(i => {
    const overdue = daysFromNow(i.stageExpectedDate);
    return overdue < 0 ? -overdue : daysSinceUpdate(i.lastUpdated);
  });
  const avgDelayAge = delayAges.length > 0
    ? Math.round(delayAges.reduce((s, d) => s + d, 0) / delayAges.length)
    : 0;
  const staleDelayed = delayed.filter(i => daysSinceUpdate(i.lastUpdated) > 7).length;
  const maxDelayCount = Math.max(...Object.values(delaySources), 1);
  const ESCALATION: Record<string, string> = {
    IT: 'Review internal capacity constraints and clear blocked stages in the weekly standup.',
    Business: 'Escalate business sign-off requirements with respective sponsors before next governance call.',
    Vendor: 'Review vendor-owned delays in weekly governance and set resolution deadlines.',
    External: 'Coordinate with external parties (legal, regulatory, infrastructure) to unblock dependencies.',
  };

  // Value lens totals
  const allClaims = [...claimMap.values()];
  const projectedValue          = allClaims.reduce((s, c) => s + c.total, 0);
  const valueDelivered          = allClaims.filter(c => c.closed && c.signedOff).reduce((s, c) => s + c.total, 0);
  const valuePendingValidation  = allClaims.filter(c => c.closed && !c.signedOff && c.total > 0).reduce((s, c) => s + c.total, 0);
  const atRiskIds               = new Set([...delayed, ...missed].map(i => i.id));
  const valueAtRisk             = [...atRiskIds].reduce((s, id) => s + (claimMap.get(id)?.total ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* ── 1. Report Header ─────────────────────────────────────────────────── */}
      <PageHeader title="Leadership Value Report" subtitle={`Delivery accountability and outcome realization · ${period.label}`}>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker />
          <PrintButton />
        </div>
      </PageHeader>

      {/* ── 2. Executive Summary ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50/60 to-white p-5 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-600">Executive Summary</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          In <strong>{period.label}</strong>, the IT portfolio{' '}
          {committed.length > 0
            ? <>delivered <strong className="text-emerald-700">{delivered.length}</strong> out of{' '}
              <strong>{committed.length}</strong> committed initiative{committed.length !== 1 ? 's' : ''}
              {deliveryPct !== null ? ` (${deliveryPct}% on-time delivery rate)` : ''}</>
            : <>had no go-live commitments in this period</>}.
          {missed.length > 0 && (
            <> <strong className="text-rose-700">{missed.length}</strong> item{missed.length !== 1 ? 's' : ''}{' '}
            slipped beyond the agreed timeline.</>
          )}
          {topDelaySources.length > 0 && (
            <> Active delay risk is concentrated around{' '}
            <strong>{topDelaySources.slice(0, 2).join(' and ')}</strong> dependencies.</>
          )}
          {regDueSoon.length > 0 && (
            <> Regulatory commitments require continued leadership oversight, with{' '}
            <strong className="text-rose-700">{regDueSoon.length}</strong> item{regDueSoon.length !== 1 ? 's' : ''}{' '}
            due within the next 14 days.</>
          )}
        </p>
        {(stuckInPreLaunch.length > 0 || closedWithoutValidation.length > 0) && (
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            <strong>Recommended CIO focus:</strong>{' '}
            {stuckInPreLaunch.length > 0 && (
              <>Clear {stuckInPreLaunch.length} initiative{stuckInPreLaunch.length !== 1 ? 's' : ''} currently in UAT, AppSec, or CAB Approval.</>
            )}
            {stuckInPreLaunch.length > 0 && closedWithoutValidation.length > 0 && ' '}
            {closedWithoutValidation.length > 0 && (
              <>Validate business outcomes for {closedWithoutValidation.length} recently closed initiative{closedWithoutValidation.length !== 1 ? 's' : ''} awaiting confirmation.</>
            )}
          </p>
        )}
      </div>

      {/* ── 3. Value-at-Risk Summary ─────────────────────────────────────────── */}
      {projectedValue > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Projected Value" value={formatInr(projectedValue)} icon={TrendingUp} accent="brand" />
          <KpiCard label="Value Delivered" value={formatInr(valueDelivered)} icon={BadgeCheck} accent="emerald" />
          <KpiCard label="Pending Validation" value={formatInr(valuePendingValidation)} icon={Clock} accent="amber" />
          <KpiCard label="Value at Risk" value={formatInr(valueAtRisk)} icon={Flame} accent="rose" />
        </div>
      )}

      {/* ── 4. Leadership Attention Required ─────────────────────────────────── */}
      {attentionRows.length > 0 && (
        <SectionCard title="Leadership Attention Required" count={attentionRows.length} icon={AlertOctagon} tone="risk" noPad>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-rose-50/60">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-rose-700">Initiative</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-rose-700">Issue</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-rose-700">Owner</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-rose-700">Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {attentionRows.map((row, idx) => (
                  <tr key={row.key} className={`border-t border-rose-50 ${idx % 2 === 1 ? 'bg-rose-50/20' : 'bg-white'}`}>
                    <td className={`border-l-[3px] py-3 pl-4 pr-4 ${row.severity === 'critical' ? 'border-l-rose-400' : row.severity === 'warning' ? 'border-l-amber-400' : 'border-l-brand-400'}`}>
                      <Link href={`/items/${row.id}`} className="font-semibold text-slate-800 hover:text-brand-700">{row.title}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={row.severity === 'critical' ? 'danger' : row.severity === 'warning' ? 'warning' : 'brand'} size="sm">
                        {row.issue}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{row.owner}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── 4. Portfolio Commitment Scorecard ────────────────────────────────── */}
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

      {/* ── 4. Stage-wise Portfolio Snapshot ─────────────────────────────────── */}
      <SectionCard
        title="Stage-wise Portfolio Snapshot"
        subtitle={`${totalInPipeline} active initiatives across ${STAGES.length - 1} stages`}
      >
        <div className="space-y-2">
          {stageCounts.map(({ stage, count }) => {
            const isBottleneck = BOTTLENECK_STAGES.has(stage) && count > 0;
            const isClosed = stage === 'Closed';
            const barW = count === 0 ? 0 : Math.max(4, (count / maxStageCount) * 100);
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className={`w-28 shrink-0 text-[11px] font-medium ${isBottleneck ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>
                  {stage}
                  {isBottleneck && <span className="ml-1 text-[9px] font-bold uppercase tracking-wider text-amber-500"> ⚠</span>}
                </span>
                <div className="relative flex-1 overflow-hidden rounded-full bg-slate-100" style={{ height: 10 }}>
                  {count > 0 && (
                    <div
                      className={`h-full rounded-full transition-all ${
                        isBottleneck ? 'bg-amber-400' : isClosed ? 'bg-emerald-400' : 'bg-brand-400'
                      }`}
                      style={{ width: `${barW}%` }}
                    />
                  )}
                </div>
                <span className={`w-6 shrink-0 text-right text-xs font-semibold tabular-nums ${
                  isBottleneck ? 'text-amber-700' : count === 0 ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  {count}
                </span>
              </div>
            );
          })}
          {/* Bottleneck legend */}
          {[...BOTTLENECK_STAGES].some(s => (stageCounts.find(c => c.stage === s)?.count ?? 0) > 0) && (
            <p className="pt-2 text-[11px] text-amber-600">
              ⚠ UAT, AppSec, and CAB Approval are pre-launch governance gates — concentration here signals potential go-live risk.
            </p>
          )}
        </div>
      </SectionCard>

      {/* ── 5. Value Delivered & Validated ───────────────────────────────────── */}
      <SectionCard title="Value Delivered & Validated" subtitle={`${completedWithOutcome.length} initiatives confirmed`} tone="success">
        {completedWithOutcome.length === 0 ? (
          <p className="text-sm text-slate-500">No initiatives were closed with business validation in this period.</p>
        ) : (
          <div className="space-y-4">
            {completedWithOutcome.map(i => {
              const claim = claimMap.get(i.id);
              const cd = closureDate(i);
              return (
                <div key={i.id} className="overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/20">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-emerald-100 px-4 py-3">
                    <div className="min-w-0">
                      <Link href={`/items/${i.id}`} className="text-sm font-semibold text-slate-800 hover:text-brand-700">{i.title}</Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {i.outcomeCategory} · {i.verticalHead}
                        {i.businessSponsor && <> · Sponsor: {i.businessSponsor}</>}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${ACHIEVED_TONE[i.validation!.outcomeAchieved]}`}>
                        {i.validation!.outcomeAchieved}
                      </span>
                      {claim?.signedOff && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <BadgeCheck className="h-3 w-3" /> Signed off
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Value + dates */}
                  <div className="grid grid-cols-3 gap-0 divide-x divide-emerald-100 bg-white/60 px-0">
                    <div className="px-4 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Est. Annual Value</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-brand-700">
                        {claim?.total ? formatInr(claim.total) : '—'}
                      </dd>
                    </div>
                    <div className="px-4 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Closure Date</dt>
                      <dd className="mt-0.5 text-sm font-medium text-slate-700">{cd ?? '—'}</dd>
                    </div>
                    <div className="px-4 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Validation Status</dt>
                      <dd className="mt-0.5 text-sm font-medium text-slate-700">{i.validation!.outcomeAchieved}</dd>
                    </div>
                  </div>

                  {/* Metric details */}
                  <div className="border-t border-emerald-100 px-4 py-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div><span className="text-slate-400">Target: </span><span className="text-slate-700">{i.targetMetric}</span></div>
                      <div><span className="text-slate-400">Actual: </span><span className="text-slate-700">{i.validation!.actualMetric}</span></div>
                      {i.validation!.actualResult && (
                        <div className="col-span-2"><span className="text-slate-400">Result: </span><span className="text-slate-700">{i.validation!.actualResult}</span></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
        <SectionCard title="Delay Accountability" subtitle={`${delayed.length} delayed · avg ${avgDelayAge}d slip`} noPad>
          {/* Insight summary */}
          <div className="space-y-4 border-b border-slate-100 px-5 py-4">
            {/* Stats row */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Primary Bottleneck</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">{topDelaySources[0] ?? '—'} dependencies</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Avg Delay Age</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">{avgDelayAge}d</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Stale (&gt;7d no update)</dt>
                <dd className={`mt-0.5 font-semibold ${staleDelayed > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {staleDelayed} item{staleDelayed !== 1 ? 's' : ''}
                </dd>
              </div>
            </div>
            {/* Horizontal source bars */}
            <div className="space-y-1.5">
              {(Object.entries(delaySources) as [DelaySource, number][]).filter(([, n]) => n > 0).map(([source, count]) => (
                <div key={source} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-[11px] font-medium text-slate-500">{source}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-slate-100 h-2">
                    <div
                      className="h-full rounded-full bg-rose-400"
                      style={{ width: `${Math.max(8, (count / maxDelayCount) * 100)}%` }}
                    />
                  </div>
                  <span className="w-4 shrink-0 text-right text-[11px] font-semibold text-slate-700">{count}</span>
                </div>
              ))}
            </div>
            {/* Escalation recommendation */}
            {topDelaySources[0] && (
              <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
                <span className="font-semibold">Recommended: </span>
                {ESCALATION[topDelaySources[0]]}
              </div>
            )}
          </div>
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
          {/* Summary indicators */}
          <div className="grid grid-cols-5 divide-x divide-rose-100 border-b border-rose-100 bg-rose-50/30">
            {[
              { label: 'Total',        value: regulatory.length, cls: 'text-slate-800' },
              { label: 'Due in 7d',    value: regDue7,           cls: regDue7   > 0 ? 'text-rose-700 font-bold' : 'text-slate-400' },
              { label: 'Due in 14d',   value: regDue14,          cls: regDue14  > 0 ? 'text-amber-700 font-semibold' : 'text-slate-400' },
              { label: 'Overdue',      value: regOverdue,        cls: regOverdue > 0 ? 'text-rose-700 font-bold' : 'text-slate-400' },
              { label: 'Closed',       value: regClosed,         cls: regClosed > 0 ? 'text-emerald-700' : 'text-slate-400' },
            ].map(s => (
              <div key={s.label} className="py-3 text-center">
                <div className={`tabular text-2xl font-semibold ${s.cls}`}>{s.value}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Item list */}
          <div>
            {regulatory.map(i => {
              const overdue = i.regulatoryDueDate ? i.regulatoryDueDate < today && i.currentStage !== 'Closed' : false;
              const due7    = i.regulatoryDueDate && i.regulatoryDueDate >= today && daysFromNow(i.regulatoryDueDate) <= 7 && i.currentStage !== 'Closed';
              return (
                <div key={i.id} className={`flex items-center justify-between gap-3 border-t px-5 py-3 ${overdue ? 'border-rose-100 bg-rose-50/20' : 'border-slate-100'}`}>
                  <div className="min-w-0">
                    <Link href={`/items/${i.id}`} className="text-sm font-medium text-slate-700 hover:text-brand-700">{i.title}</Link>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {i.regulatoryBody ?? 'Regulatory'} · {i.currentStage}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right text-xs">
                    {i.regulatoryDueDate ? (
                      <span className={overdue ? 'font-bold text-rose-600' : due7 ? 'font-semibold text-amber-600' : 'text-slate-600'}>
                        {i.currentStage === 'Closed' ? '✓ closed' : `due ${i.regulatoryDueDate}`}
                        {overdue ? ' · overdue' : ''}
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



    </div>
  );
}
