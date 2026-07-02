export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/ui/SectionCard';
import { KpiCard } from '@/components/KpiCard';
import { Badge } from '@/components/ui/Badge';
import {
  Building2, Users, Activity, Lightbulb, Target, FileBarChart, Hash, Tag,
} from 'lucide-react';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'slate'> = {
  PILOT: 'warning',
  ACTIVE: 'success',
  SUSPENDED: 'slate',
};

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function WorkspacePage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  if (session.user.role !== 'ADMIN') redirect('/');

  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!org) notFound();

  const [userCount, initiativeCount, demandCount, okrCount, reportCount] = await Promise.all([
    prisma.user.count({ where: { organizationId: org.id } }),
    prisma.initiative.count({ where: { organizationId: org.id } }),
    prisma.demand.count({ where: { organizationId: org.id } }),
    prisma.okr.count({ where: { organizationId: org.id } }),
    prisma.monthlyReport.count({ where: { organizationId: org.id } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Workspace" subtitle="Tenant identity and workspace-level record counts" />

      {/* ── Identity ─────────────────────────────────────────────────────────── */}
      <SectionCard title="Workspace Identity" icon={Building2}>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Building2 className="h-3 w-3" strokeWidth={2} /> Workspace Name
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">{org.name}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Hash className="h-3 w-3" strokeWidth={2} /> Slug
            </dt>
            <dd className="mt-1 font-mono text-sm text-slate-600">{org.slug}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Tag className="h-3 w-3" strokeWidth={2} /> Industry
            </dt>
            <dd className="mt-1 text-sm text-slate-600">{org.industry ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</dt>
            <dd className="mt-1">
              <Badge tone={STATUS_TONE[org.status] ?? 'slate'}>{org.status}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Created</dt>
            <dd className="mt-1 tabular text-sm text-slate-600">{iso(org.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Last Updated</dt>
            <dd className="mt-1 tabular text-sm text-slate-600">{iso(org.updatedAt)}</dd>
          </div>
        </dl>
      </SectionCard>

      {/* ── Record counts ────────────────────────────────────────────────────── */}
      <SectionCard title="Workspace Records" subtitle="All records currently linked to this workspace">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <KpiCard label="Total Users" value={userCount} icon={Users} accent="brand" />
          <KpiCard label="Total Initiatives" value={initiativeCount} icon={Activity} accent="emerald" />
          <KpiCard label="Total Demands" value={demandCount} icon={Lightbulb} accent="amber" />
          <KpiCard label="Total OKRs" value={okrCount} icon={Target} accent="brand" />
          <KpiCard label="Total Reports" value={reportCount} icon={FileBarChart} accent="slate" />
        </div>
      </SectionCard>
    </div>
  );
}
