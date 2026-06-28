export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { Badge } from '@/components/ui/Badge';
import { Settings } from 'lucide-react';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  if (session.user.role !== 'ADMIN') redirect('/');

  const [users, org, initiativeCount, demandCount] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } }),
    prisma.initiative.count(),
    prisma.demand.count(),
  ]);

  const ROLE_TONE: Record<string, 'brand' | 'success' | 'warning' | 'violet' | 'slate' | 'danger'> = {
    ADMIN:        'danger',
    CIO:          'brand',
    PMO:          'success',
    VERTICAL_HEAD:'warning',
    BUSINESS:     'violet',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace Settings"
        subtitle="Platform Administration — pilot configuration and user management"
      />

      {/* Workspace summary */}
      <SectionCard title="Workspace" icon={Settings}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 text-sm">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Name</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">{org?.name ?? 'IT Value Bridge'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</dt>
            <dd className="mt-0.5">
              <Badge tone={org?.status === 'PILOT' ? 'warning' : 'success'}>{org?.status ?? 'PILOT'}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Initiatives</dt>
            <dd className="mt-0.5 tabular text-2xl font-semibold text-brand-700">{initiativeCount}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Demands</dt>
            <dd className="mt-0.5 tabular text-2xl font-semibold text-slate-800">{demandCount}</dd>
          </div>
        </dl>
      </SectionCard>

      {/* User list */}
      <SectionCard title="Users" subtitle={`${users.length} registered`} noPad>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Name</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Email</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Role</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                <td className="px-5 py-2.5 font-medium text-slate-800">{u.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={ROLE_TONE[u.role] ?? 'slate'} size="sm">{u.role}</Badge>
                </td>
                <td className="px-4 py-2.5 text-slate-500 tabular">
                  {u.createdAt.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
