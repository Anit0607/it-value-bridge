'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { computeRAG, ragCounts } from '@/lib/rag';
import { KpiCard } from '@/components/KpiCard';
import { PageHeader } from '@/components/PageHeader';
import { ItemTable } from '@/components/ItemTable';
import { useRequireAuth } from '@/components/RoleProvider';
import { Briefcase, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

export default function VerticalHeadDashboard() {
  const user = useRequireAuth();
  const { items } = useStore();

  const myItems = useMemo(
    () => items.filter(i => i.verticalHead === user?.verticalHead),
    [items, user],
  );
  const counts = useMemo(() => ragCounts(myItems.map(i => computeRAG(i))), [myItems]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="My Portfolio" subtitle={`${user.verticalHead} · ${myItems.length} items`} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Items" value={myItems.length} icon={Briefcase} accent="brand" />
        <KpiCard label="On Track" value={counts.green} icon={CheckCircle2} accent="emerald" />
        <KpiCard label="At Risk" value={counts.amber} icon={AlertTriangle} accent="amber" />
        <KpiCard label="Delayed" value={counts.red} icon={AlertOctagon} accent="rose" />
      </div>

      <ItemTable items={myItems} showVerticalHead={false} emptyHint="No items assigned to your vertical yet." />
    </div>
  );
}
