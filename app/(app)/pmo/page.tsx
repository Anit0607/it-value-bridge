export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getPmoList } from '@/lib/queries/dashboard';
import { PmoDashboardClient } from './PmoDashboardClient';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Layers, CheckCircle2, AlertTriangle, AlertOctagon, PlusCircle } from 'lucide-react';
import { TodaysFocus } from '@/components/TodaysFocus';
import { buttonCls } from '@/components/ui/Button';

export default async function PmoDashboard() {
  const { items, activeCount, counts } = await getPmoList();

  return (
    <div className="space-y-6">
      <PageHeader title="PMO Governance Control Tower" subtitle={`${items.length} initiatives translating delivery into business value`}>
        <Link href="/pmo/new" className={buttonCls('primary')}>
          <PlusCircle className="h-4 w-4" />
          New Initiative
        </Link>
      </PageHeader>

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
        <KpiCard label="Active Items" value={activeCount} sub={`of ${items.length} total`} icon={Layers} accent="brand" />
        <KpiCard label="On Track" value={counts.green} icon={CheckCircle2} accent="emerald" />
        <KpiCard label="At Risk" value={counts.amber} icon={AlertTriangle} accent="amber" />
        <KpiCard label="Value at Risk" value={counts.red} icon={AlertOctagon} accent="rose" />
      </div>

      <PmoDashboardClient items={items} />
    </div>
  );
}
