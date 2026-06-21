export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getBusinessValidations } from '@/lib/queries/dashboard';
import Link from 'next/link';
import { RagDot } from '@/components/RagBadge';
import { PageHeader } from '@/components/PageHeader';
import { ClipboardCheck, ArrowRight, Inbox } from 'lucide-react';

const ACHIEVED_TONE: Record<string, string> = {
  Yes: 'text-emerald-600',
  Partially: 'text-amber-600',
  No: 'text-rose-600',
};

export default async function BusinessSpocView() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const userName = session.user.name;
  const { items, pending } = await getBusinessValidations(userName);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Items"
        subtitle={`Items where you are the Business SPOC · ${items.length} total`}
      />

      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <ClipboardCheck className="h-4 w-4 text-amber-600" />
            Action Required — Business Validation
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {pending.length}
            </span>
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {pending.map(i => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-white px-3.5 py-2.5 shadow-sm"
              >
                <div className="min-w-0">
                  <Link href={`/items/${i.id}/validate`} className="truncate text-sm font-medium text-slate-800 hover:text-brand-700">
                    {i.title}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {i.outcomeCategory} · target {i.targetMetric}
                  </p>
                </div>
                <Link
                  href={`/items/${i.id}/validate`}
                  className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-amber-600"
                >
                  Validate
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">All My Items</h2>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-700">No items assigned</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Item</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stage</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">RAG</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Outcome</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Target</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Go Live</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Validation</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => {
                  const rag = i.rag;
                  return (
                    <tr key={i.id} className={`border-t border-slate-100 transition-colors hover:bg-brand-50/40 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-5 py-2.5">
                        <Link href={`/items/${i.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                          {i.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{i.currentStage}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <RagDot rag={rag} />
                          {rag}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{i.outcomeCategory}</td>
                      <td className="px-4 py-2.5 text-slate-600">{i.targetMetric}</td>
                      <td className="px-4 py-2.5 tabular text-slate-500">{i.goLiveDate.slice(5)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {i.currentStage === 'Business Validation' && !i.validation ? (
                          <Link href={`/items/${i.id}/validate`} className="text-xs font-medium text-amber-600 hover:underline">
                            Pending ›
                          </Link>
                        ) : i.validation ? (
                          <span className={`text-xs font-semibold ${ACHIEVED_TONE[i.validation.outcomeAchieved]}`}>
                            {i.validation.outcomeAchieved}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
