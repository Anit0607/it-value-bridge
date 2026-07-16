export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPmoList } from '@/lib/queries/dashboard';
import { PmoDashboardClient } from './PmoDashboardClient';
import { PageHeader } from '@/components/PageHeader';
import { PortfolioFilterBar } from '@/components/PortfolioFilterBar';
import { SavedViewsBar } from '@/components/SavedViewsBar';
import { parsePortfolioFilters } from '@/lib/portfolioFilters';
import { generateReminders } from '@/lib/reminders';
import { GroupedRemindersList, sortBySeverity } from '@/components/RemindersPanel';
import { listAtRiskMilestones, listOpenMilestonesForInitiatives } from '@/lib/actions/milestones';
import { KpiCard } from '@/components/KpiCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { Badge } from '@/components/ui/Badge';
import { Layers, CheckCircle2, AlertTriangle, AlertOctagon, PlusCircle, ListChecks, Flag } from 'lucide-react';
import { TodaysFocus } from '@/components/TodaysFocus';
import { buttonCls } from '@/components/ui/Button';
import { KPI_DEFINITIONS } from '@/lib/kpiDefinitions';

export default async function PmoDashboard({
  searchParams,
}: {
  searchParams: {
    classification?: string; rag?: string; stage?: string; isRegulatory?: string;
    type?: string; benefitCategory?: string;
    delaySource?: string; goLiveThisMonth?: string; staleOnly?: string;
    verticalHead?: string; programHead?: string; programManager?: string;
    businessHead?: string; businessUnit?: string; businessSpoc?: string;
  };
}) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  const filters = parsePortfolioFilters(searchParams);
  const { items, totalCount, activeCount, counts, filterOptions } = await getPmoList(session.user, filters);

  // Governance Action Queue: same portfolio-filter-scoped items as the rest
  // of the page, grouped by type so PMO can triage by kind of problem.
  // Milestone-derived reminders (MILESTONE_OVERDUE/MILESTONE_BLOCKED) feed
  // into pmoReminders too, but aren't grouped here — Milestone Watch below
  // already covers that same data in a purpose-built table.
  const openMilestones = await listOpenMilestonesForInitiatives(items);
  const pmoReminders = generateReminders(items, openMilestones);
  const governanceGroups = [
    { label: 'Overdue Stage', reminders: sortBySeverity(pmoReminders.filter(r => r.type === 'STAGE_OVERDUE')) },
    { label: 'Stale Update', reminders: sortBySeverity(pmoReminders.filter(r => r.type === 'STALE_UPDATE')) },
    { label: 'Business Delay', reminders: sortBySeverity(pmoReminders.filter(r => r.type === 'BUSINESS_DELAY')) },
    { label: 'Vendor Delay', reminders: sortBySeverity(pmoReminders.filter(r => r.type === 'VENDOR_DELAY')) },
    { label: 'Validation Pending', reminders: sortBySeverity(pmoReminders.filter(r => r.type === 'BUSINESS_VALIDATION_PENDING')) },
  ];
  const governanceCount = governanceGroups.reduce((n, g) => n + g.reminders.length, 0);

  // Milestone Watch: top overdue/blocked milestones across the same
  // portfolio-filter-scoped items, worst (oldest due date) first.
  const atRiskMilestones = await listAtRiskMilestones(items);
  const topAtRiskMilestones = atRiskMilestones.slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="Program / Governance View" subtitle={`${totalCount} initiatives translating delivery into business value`}>
        <Link href="/pmo/new" className={buttonCls('primary')}>
          <PlusCircle className="h-4 w-4" />
          New Initiative
        </Link>
      </PageHeader>

      <SavedViewsBar view="pmo" />
      <PortfolioFilterBar options={filterOptions} />

      <TodaysFocus
        title="Today's governance actions"
        items={[
          { label: 'Review red items', href: '/pmo' },
          { label: 'Update stale initiatives', href: '/pmo' },
          { label: 'Chase business and vendor delays', href: '/pmo' },
          { label: 'Prepare leadership report', href: '/report' },
        ]}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Active Items" value={activeCount} sub={`of ${totalCount} total`} icon={Layers} accent="brand" tooltip={KPI_DEFINITIONS.activeItems} />
        <KpiCard label="On Track" value={counts.green} icon={CheckCircle2} accent="emerald" tooltip={KPI_DEFINITIONS.onTrack} />
        <KpiCard label="At Risk" value={counts.amber} icon={AlertTriangle} accent="amber" tooltip={KPI_DEFINITIONS.atRisk} />
        <KpiCard label="Value at Risk" value={counts.red} icon={AlertOctagon} accent="rose" tooltip={KPI_DEFINITIONS.valueAtRisk} />
      </div>

      <SectionCard title="Governance Action Queue" icon={ListChecks} tone="risk" count={governanceCount} subtitle="Grouped by issue type" noPad>
        <GroupedRemindersList groups={governanceGroups} />
      </SectionCard>

      <SectionCard
        title="Milestone Watch"
        icon={Flag}
        tone="risk"
        count={atRiskMilestones.length}
        subtitle={atRiskMilestones.length > 10 ? `Top 10 of ${atRiskMilestones.length} — oldest due date first` : 'Oldest due date first'}
        noPad
      >
        {topAtRiskMilestones.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-400">No overdue or blocked milestones right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Initiative</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Milestone</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Owner</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Due Date</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {topAtRiskMilestones.map((m, idx) => (
                  <tr key={m.milestoneId} className={`border-t border-slate-100 transition-colors hover:bg-brand-50/40 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-5 py-2.5">
                      <Link href={`/items/${m.initiativeId}`} className="font-medium text-slate-800 hover:text-brand-700">
                        {m.initiativeTitle}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{m.title}</td>
                    <td className="px-4 py-2.5 text-slate-600">{m.owner}</td>
                    <td className="px-4 py-2.5 tabular text-slate-600">{m.dueDate}</td>
                    <td className="px-4 py-2.5">
                      {m.status === 'BLOCKED' ? (
                        <Badge tone="danger" size="sm">Blocked</Badge>
                      ) : (
                        <Badge tone="warning" size="sm">Overdue</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <PmoDashboardClient items={items} />
    </div>
  );
}
