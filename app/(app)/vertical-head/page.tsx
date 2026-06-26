export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getVhItems } from '@/lib/queries/dashboard';
import { KpiCard } from '@/components/KpiCard';
import { PageHeader } from '@/components/PageHeader';
import { ItemTable } from '@/components/ItemTable';
import { Briefcase, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

export default async function VerticalHeadDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const verticalHead = session.user.verticalHead ?? session.user.name;
  const { items, counts } = await getVhItems(verticalHead);

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Ownership Workspace" subtitle={`${verticalHead} · ${items.length} delivery commitments`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Items" value={items.length} icon={Briefcase} accent="brand" />
        <KpiCard label="On Track" value={counts.green} icon={CheckCircle2} accent="emerald" />
        <KpiCard label="At Risk" value={counts.amber} icon={AlertTriangle} accent="amber" />
        <KpiCard label="Value at Risk" value={counts.red} icon={AlertOctagon} accent="rose" />
      </div>

      <ItemTable items={items} showVerticalHead={false} emptyHint="No items assigned to your vertical yet." />
    </div>
  );
}
