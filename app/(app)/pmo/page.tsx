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
import { KpiCard } from '@/components/KpiCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { Layers, CheckCircle2, AlertTriangle, AlertOctagon, PlusCircle, ListChecks } from 'lucide-react';
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
  const pmoReminders = generateReminders(items);
  const governanceGroups = [
    { label: 'Overdue Stage', reminders: sortBySeverity(pmoReminders.filter(r => r.type === 'STAGE_OVERDUE')) },
    { label: 'Stale Update', reminders: sortBySeverity(pmoReminders.filter(r => r.type === 'STALE_UPDATE')) },
    { label: 'Business Delay', reminders: sortBySeverity(pmoReminders.filter(r => r.type === 'BUSINESS_DELAY')) },
    { label: 'Vendor Delay', reminders: sortBySeverity(pmoReminders.filter(r => r.type === 'VENDOR_DELAY')) },
    { label: 'Validation Pending', reminders: sortBySeverity(pmoReminders.filter(r => r.type === 'BUSINESS_VALIDATION_PENDING')) },
  ];
  const governanceCount = governanceGroups.reduce((n, g) => n + g.reminders.length, 0);

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

      <PmoDashboardClient items={items} />
    </div>
  );
}
