export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listDemands, listMyDemands } from '@/lib/actions/demands';
import { isPmoEquivalent } from '@/lib/rbac';
import { formatInr, BENEFIT_CATEGORY_LABEL, CATEGORY_TONE } from '@/lib/value';
import {
  DEMAND_STATUS_LABEL,
  DEMAND_STATUS_TONE,
  DEMAND_STATUSES,
  DEMAND_PRIORITY_LABEL,
  DEMAND_PRIORITY_TONE,
} from '@/lib/demand';
import { PageHeader } from '@/components/PageHeader';
import { PlusCircle, Inbox } from 'lucide-react';

export default async function DemandsPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const role = session.user.role;
  const isTriager = isPmoEquivalent(role) || role === 'CIO';
  const demands = isTriager ? await listDemands() : await listMyDemands(session.user.name);

  const counts = DEMAND_STATUSES.map(s => ({
    status: s,
    count: demands.filter(d => d.status === s).length,
  }));

  const demandValue = (d: (typeof demands)[number]) =>
    d.benefitClaims.reduce((sum, b) => sum + b.estimatedAnnualValueInr, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isTriager ? 'Demand Funnel' : 'My Demands'}
        subtitle={
          isTriager
            ? 'Business demands awaiting triage, with their targeted value'
            : 'Requirements you have raised and their status'
        }
      >
        <Link
          href="/demands/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          <PlusCircle className="h-4 w-4" />
          Raise Demand
        </Link>
      </PageHeader>

      {/* Funnel counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counts.map(c => (
          <div key={c.status} className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
            <div className="tabular text-2xl font-semibold text-slate-900">{c.count}</div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-500">{DEMAND_STATUS_LABEL[c.status]}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {demands.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-700">No demands yet</p>
            <p className="mt-1 text-xs text-slate-400">Raise a demand to start the value funnel.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Demand</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Benefits</th>
                  {isTriager && <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Raised by</th>}
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Priority</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Targeted Value</th>
                </tr>
              </thead>
              <tbody>
                {demands.map((d, idx) => (
                  <tr key={d.id} className={`border-t border-slate-100 transition-colors hover:bg-brand-50/40 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-5 py-2.5">
                      <Link href={`/demands/${d.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                        {d.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {d.benefitClaims.map(b => (
                          <span key={b.id} className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600 ring-1 ring-inset ring-slate-200">
                            <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_TONE[b.category]}`} />
                            {BENEFIT_CATEGORY_LABEL[b.category]}
                          </span>
                        ))}
                      </div>
                    </td>
                    {isTriager && <td className="px-4 py-2.5 text-slate-600">{d.raisedByName}</td>}
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${DEMAND_PRIORITY_TONE[d.priority]}`}>
                        {DEMAND_PRIORITY_LABEL[d.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${DEMAND_STATUS_TONE[d.status]}`}>
                        {DEMAND_STATUS_LABEL[d.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-semibold text-slate-800">
                      {formatInr(demandValue(d))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
