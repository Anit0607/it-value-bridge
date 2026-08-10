export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { getLifecycle } from '@/lib/queries/lifecycle';
import { getWorkspaceConfig } from '@/lib/queries/workspace';
import { listLifecycleTemplates } from '@/lib/actions/workspace';
import { validateLifecycle } from '@/lib/lifecycle';
import { can } from '@/lib/rbac';
import { SetupClient } from './SetupClient';
import { AlertTriangle } from 'lucide-react';

/**
 * Guided workspace setup (docs/ROADMAP.md M4).
 *
 * The page that makes the M4 exit criterion true: an organization can be
 * onboarded — lifecycle, vocabulary, modules — without anyone writing code.
 */
export default async function SetupPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');
  if (!can(session.user.role, 'CONFIGURE_WORKSPACE')) notFound();

  const organizationId = session.user.organizationId;
  if (!organizationId) notFound();

  const [templates, lifecycle, config, occupancy] = await Promise.all([
    listLifecycleTemplates(),
    getLifecycle(organizationId),
    getWorkspaceConfig(organizationId),
    prisma.initiative.groupBy({
      by: ['currentStage'],
      where: { organizationId },
      _count: true,
    }),
  ]);

  const occupants = new Map(occupancy.map(o => [o.currentStage, o._count]));
  const problems = validateLifecycle(lifecycle);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Workspace Setup"
        subtitle="Shape the product around how this organization actually works — no code required"
      />

      {problems.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            This lifecycle needs attention
          </h2>
          <ul className="mt-2 space-y-1 text-xs text-amber-700">
            {problems.map(p => <li key={p}>· {p}</li>)}
          </ul>
        </div>
      )}

      <SetupClient
        templates={templates}
        currentTemplate={config.lifecycleTemplate}
        stages={lifecycle.map(s => ({
          key: s.key,
          label: s.label,
          order: s.order,
          deliveryPhase: s.deliveryPhase,
          isGoLiveGate: s.isGoLiveGate,
          isValidationGate: s.isValidationGate,
          isTerminal: s.isTerminal,
          occupants: occupants.get(s.key) ?? 0,
        }))}
        terms={config.terms}
        modules={config.modules}
      />
    </div>
  );
}
