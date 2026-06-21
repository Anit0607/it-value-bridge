export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { listInitiativesAsItems } from '@/lib/actions/initiatives';
import { computeRAG, ragCounts } from '@/lib/rag';
import { PmoDashboardClient } from './PmoDashboardClient';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Layers, CheckCircle2, AlertTriangle, AlertOctagon, PlusCircle } from 'lucide-react';

export default async function PmoDashboard() {
  const items = await listInitiativesAsItems();

  const active = items.filter(i => i.currentStage !== 'Closed');
  const counts = ragCounts(active.map(i => computeRAG(i)));

  return (
    <div className="space-y-6">
      <PageHeader title="Portfolio" subtitle={`${items.length} items across the IT portfolio`}>
        <Link
          href="/pmo/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <PlusCircle className="h-4 w-4" />
          New Item
        </Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Active Items" value={active.length} sub={`of ${items.length} total`} icon={Layers} accent="brand" />
        <KpiCard label="On Track" value={counts.green} icon={CheckCircle2} accent="emerald" />
        <KpiCard label="At Risk" value={counts.amber} icon={AlertTriangle} accent="amber" />
        <KpiCard label="Delayed" value={counts.red} icon={AlertOctagon} accent="rose" />
      </div>

      <PmoDashboardClient items={items} />
    </div>
  );
}
