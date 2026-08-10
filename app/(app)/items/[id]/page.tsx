export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getVisibleInitiativeItem, getInitiativeValue } from '@/lib/actions/initiatives';
import { getInitiativeDependencies, listLinkableInitiatives } from '@/lib/actions/dependencies';
import { listMilestones } from '@/lib/actions/milestones';
import { isPmoEquivalent, isBusinessEquivalent } from '@/lib/rbac';
import { ItemDetailClient } from './ItemDetailClient';
import { ValueRealizationPanel } from '@/components/value/ValueRealizationPanel';
import { DependencyPanel } from '@/components/dependencies/DependencyPanel';
import { MilestonesPanel, type MilestoneView } from '@/components/milestones/MilestonesPanel';
import { RegulatoryControl } from '@/components/RegulatoryControl';
import { addMonthsIso, realizationStatus, computeTco } from '@/lib/value';
import { evaluateInvestmentGate } from '@/lib/investment';
import { InvestmentGatePanel } from '@/components/investment/InvestmentGatePanel';
import { IntegrityPanel } from '@/components/value/IntegrityPanel';
import { getInitiativeIntegrity } from '@/lib/queries/integrity';
import { getLifecycle } from '@/lib/queries/lifecycle';
import { getWorkspaceConfig } from '@/lib/queries/workspace';
import { goLiveStage, terminalStage } from '@/lib/lifecycle';
import { prisma } from '@/lib/db';

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  const [item, value, deps, linkOptions, milestonesRaw, integrity, lifecycle, workspace] = await Promise.all([
    getVisibleInitiativeItem(params.id, session.user),
    getInitiativeValue(params.id, session.user.organizationId),
    getInitiativeDependencies(params.id, session.user.organizationId),
    listLinkableInitiatives(params.id, session.user.organizationId),
    listMilestones(params.id, session.user),
    getInitiativeIntegrity(params.id, session.user.organizationId),
    getLifecycle(session.user.organizationId),
    getWorkspaceConfig(session.user.organizationId),
  ]);
  if (!item) notFound();

  const role = session.user.role;
  const canRecord = isPmoEquivalent(role) || role === 'CIO';
  const canEditDeps = isPmoEquivalent(role) || role === 'CIO' || role === 'VERTICAL_HEAD';
  const canEditMilestones = isPmoEquivalent(role) || role === 'CIO';
  // Exception approval sits one tier above the PMO-equivalent roles that fund
  // initiatives day to day — a PMO manager cannot wave through their own shortfall.
  const canApproveException = role === 'CIO' || role === 'ADMIN';
  const canCompleteMilestones = canEditMilestones || role === 'VERTICAL_HEAD' || isBusinessEquivalent(role);

  // Investment gate. Read straight from the row rather than via the Item
  // adapter so the exception log comes back in the same round trip.
  const gateRow = await prisma.initiative.findUnique({
    where: { id: params.id },
    select: {
      investmentCategory: true,
      estimatedCostInr: true, actualCostInr: true,
      buildCostInr: true, annualRunCostInr: true, tcoHorizonYears: true,
      benefitClaims: { select: { estimatedAnnualValueInr: true } },
      organization: { select: { roiThreshold: true } },
      investmentExceptions: { orderBy: { approvedAt: 'desc' } },
    },
  });
  const investmentCategory = gateRow?.investmentCategory ?? 'VALUE_GENERATING';
  const gateValueInr = gateRow?.benefitClaims.reduce((s, c) => s + c.estimatedAnnualValueInr, 0) ?? 0;
  const gate = evaluateInvestmentGate({
    category: investmentCategory,
    valueInr: gateValueInr,
    tcoInr: gateRow ? computeTco(gateRow) : null,
    threshold: gateRow?.organization?.roiThreshold ?? null,
    hasApprovedException: (gateRow?.investmentExceptions.length ?? 0) > 0,
  });
  const exceptionRows = (gateRow?.investmentExceptions ?? []).map(e => ({
    id: e.id,
    roiAtApproval: e.roiAtApproval,
    thresholdAtApproval: e.thresholdAtApproval,
    valueInrAtApproval: e.valueInrAtApproval,
    tcoInrAtApproval: e.tcoInrAtApproval,
    justification: e.justification,
    approvedBy: e.approvedBy,
    approvedByRole: e.approvedByRole,
    approvedAt: e.approvedAt.toISOString().slice(0, 10),
  }));

  const milestones: MilestoneView[] = milestonesRaw.map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    owner: m.owner,
    ownerRole: m.ownerRole,
    dueDate: m.dueDate.toISOString().slice(0, 10),
    status: m.status,
    completedAt: m.completedAt ? m.completedAt.toISOString().slice(0, 10) : null,
  }));

  // Benefit-realization status for the value panel (computed at render).
  // History stores stage keys. Which key means "live" is the organization's
  // decision, so both come from its lifecycle.
  const goLiveKey = goLiveStage(lifecycle)?.key ?? null;
  const terminalKey = terminalStage(lifecycle)?.key ?? null;
  const goLive =
    (goLiveKey ? item.history.find(h => h.stage === goLiveKey) : undefined) ??
    (terminalKey ? item.history.find(h => h.stage === terminalKey) : undefined);
  const goLiveIso = goLive?.date ?? null;
  const realizationDueIso = goLiveIso ? addMonthsIso(goLiveIso, 12) : null;
  const realizationConfirmed =
    !!item.validation ||
    !!value?.benefitClaims.some(c => c.measurements.some(m => m.realizedInr != null));
  const realization = {
    status: realizationStatus({
      isLiveOrClosed: item.stageIsPostDelivery,
      confirmed: realizationConfirmed,
      dueIso: realizationDueIso,
    }),
    dueIso: realizationDueIso,
  };

  return (
    <div className="space-y-6">
      <ItemDetailClient item={item} value={value} stages={lifecycle.map(st => ({ key: st.key, label: st.label, deliveryPhase: st.deliveryPhase, isTerminal: st.isTerminal }))} />
      {workspace.modules.regulatory && (
      <div className="mx-auto max-w-5xl">
        <RegulatoryControl
          initiativeId={params.id}
          isRegulatory={item.isRegulatory}
          regulatoryBody={item.regulatoryBody}
          regulatoryDueDate={item.regulatoryDueDate}
          canEdit={canRecord}
        />
      </div>
      )}
      {value && (
        <div className="mx-auto max-w-5xl">
          <ValueRealizationPanel initiativeId={params.id} value={value} canRecord={canRecord} realization={realization} />
        </div>
      )}
      {integrity && (
        <div className="mx-auto max-w-5xl">
          <IntegrityPanel
            initiativeId={params.id}
            integrity={integrity}
            currentUserName={session.user.name ?? ''}
            canDecide={canRecord}
            canRestate={canRecord}
            valueSignedOff={value?.valueSignedOff ?? false}
          />
        </div>
      )}
      <div className="mx-auto max-w-5xl">
        <InvestmentGatePanel
          initiativeId={params.id}
          category={investmentCategory}
          gate={gate}
          exceptions={exceptionRows}
          canApprove={canApproveException}
        />
      </div>
      {workspace.modules.milestones && (
        <div className="mx-auto max-w-5xl">
          <MilestonesPanel
            initiativeId={params.id}
            milestones={milestones}
            canEdit={canEditMilestones}
            canComplete={canCompleteMilestones}
          />
        </div>
      )}
      {workspace.modules.dependencies && (
        <div className="mx-auto max-w-5xl">
          <DependencyPanel initiativeId={params.id} deps={deps} options={linkOptions} canEdit={canEditDeps} />
        </div>
      )}
    </div>
  );
}
