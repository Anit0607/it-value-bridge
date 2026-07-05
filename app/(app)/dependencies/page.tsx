export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getDependencyOverview } from '@/lib/actions/dependencies';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Link2, AlertTriangle, GitBranch, ArrowUp, Inbox } from 'lucide-react';

export default async function DependenciesPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  if (!session.user.organizationId) notFound();

  const o = await getDependencyOverview(session.user.organizationId);
  const topBlocker = o.topBlockers[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cross-System Dependencies"
        subtitle="Where one delivery blocks others — and what's at risk from an upstream slip"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard label="Dependency Links" value={o.totalLinks} icon={Link2} accent="brand" />
        <KpiCard
          label="At Risk from Upstream"
          value={o.atRiskFromUpstream.length}
          sub="downstream items"
          icon={AlertTriangle}
          accent={o.atRiskFromUpstream.length > 0 ? 'rose' : 'emerald'}
        />
        <KpiCard
          label="Top Blocker"
          value={topBlocker ? `${topBlocker.blocksCount}` : '0'}
          sub={topBlocker ? `${topBlocker.title} blocks` : 'none'}
          icon={GitBranch}
          accent="amber"
        />
      </div>

      {/* At risk from upstream */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            At Risk from Upstream
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
              {o.atRiskFromUpstream.length}
            </span>
          </h2>
        </div>
        {o.atRiskFromUpstream.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <Inbox className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-700">No downstream items currently at risk</p>
            <p className="mt-1 text-xs text-slate-400">No incomplete blocker is delayed or overdue.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {o.atRiskFromUpstream.map(d => (
              <div key={d.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/items/${d.id}`} className="text-sm font-semibold text-slate-800 hover:text-brand-700">
                    {d.title}
                  </Link>
                  <span className="text-xs text-slate-400">{d.stage}</span>
                </div>
                <div className="mt-1.5 space-y-1">
                  {d.blockers.map((b, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <ArrowUp className="h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
                      <span className="font-medium text-rose-700">{b.title}</span>
                      <span className="text-slate-400">({b.stage})</span>
                      {b.system && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{b.system}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top blockers */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <GitBranch className="h-4 w-4 text-slate-400" />
            Most-Blocking Initiatives
          </h2>
        </div>
        {o.topBlockers.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">No dependencies recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Initiative</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stage</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Blocks</th>
                </tr>
              </thead>
              <tbody>
                {o.topBlockers.map((b, idx) => (
                  <tr key={b.id} className={`border-t border-slate-100 transition-colors hover:bg-brand-50/40 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-5 py-2.5">
                      <Link href={`/items/${b.id}`} className="font-medium text-slate-800 hover:text-brand-700">{b.title}</Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{b.stage}</td>
                    <td className="px-4 py-2.5">
                      {b.atRisk ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600"><AlertTriangle className="h-3.5 w-3.5" /> At risk</span>
                      ) : (
                        <span className="text-xs text-emerald-600">On track</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-semibold text-slate-800">{b.blocksCount}</td>
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
